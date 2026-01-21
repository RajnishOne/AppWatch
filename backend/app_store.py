"""
App Store API integration
"""
import logging
import requests
from datetime import datetime
from pathlib import Path
from backend.notifier import NotificationHandler

logger = logging.getLogger(__name__)


class AppStoreMonitor:
    """Monitor App Store apps for new releases"""
    
    ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup"
    
    def __init__(self, storage, formatter, settings=None):
        self.storage = storage
        self.formatter = formatter
        self.notifier = NotificationHandler(settings)
    
    def fetch_app_info(self, app_store_id):
        """Fetch app information from iTunes Lookup API"""
        try:
            params = {
                'id': app_store_id,
                'country': 'us'  # Default to US store
            }
            
            response = requests.get(self.ITUNES_LOOKUP_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('resultCount', 0) == 0:
                return None
            
            app_info = data['results'][0]
            
            # Get artwork URL - prefer higher resolution, fallback to lower
            artwork_url = (
                app_info.get('artworkUrl512') or 
                app_info.get('artworkUrl100') or 
                app_info.get('artworkUrl60') or
                None
            )
            
            return {
                'version': app_info.get('version'),
                'releaseNotes': app_info.get('releaseNotes', ''),
                'bundleId': app_info.get('bundleId'),
                'trackName': app_info.get('trackName'),
                'artistName': app_info.get('artistName'),
                'artworkUrl': artwork_url
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching app info for {app_store_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching app info: {e}", exc_info=True)
            raise
    
    def check_app(self, app):
        """Check app for new version and post if needed"""
        app_id = app['id']
        app_store_id = app['app_store_id']
        
        # Get notification destinations - support both new format and legacy webhook_url
        notification_destinations = app.get('notification_destinations', [])
        if not notification_destinations and app.get('webhook_url'):
            # Legacy support - convert old webhook_url to new format
            notification_destinations = [{
                'type': 'discord',
                'webhook_url': app['webhook_url']
            }]
        
        try:
            # Fetch current app info
            app_info = self.fetch_app_info(app_store_id)
            
            if not app_info:
                return {
                    'success': False,
                    'error': 'App not found in App Store',
                    'checked_at': datetime.now().isoformat()
                }
            
            current_version = app_info['version']
            release_notes = app_info.get('releaseNotes', '')
            
            # Get last posted version
            last_version = self.storage.get_last_version(app_id)
            
            # Update last check time and current version
            self.storage.update_last_check(app_id, datetime.now().isoformat())
            self.storage.save_current_version(app_id, current_version)
            
            # Update app icon URL if available
            artwork_url = app_info.get('artworkUrl')
            if artwork_url:
                # Update icon URL in app data
                app_data = self.storage.get_app(app_id)
                if app_data:
                    app_data['icon_url'] = artwork_url
                    self.storage.save_app(app_data)
            
            # Check if version changed
            if last_version and current_version == last_version:
                return {
                    'success': True,
                    'message': 'No new version',
                    'current_version': current_version,
                    'last_version': last_version,
                    'checked_at': datetime.now().isoformat(),
                    'formatted_preview': self.formatter.format_release_notes(current_version, release_notes)
                }
            
            # New version detected - post to all configured destinations
            formatted_notes = self.formatter.format_release_notes(current_version, release_notes)
            app_name = app.get('name', 'App')
            
            # Post to all notification destinations
            success_count = 0
            error_messages = []
            destination_results = []
            
            for dest in notification_destinations:
                dest_type = dest.get('type', 'unknown')
                success, error_msg = self.notifier.send_notification(
                    dest, app_name, current_version, release_notes, formatted_notes
                )
                if success:
                    success_count += 1
                    destination_results.append({'type': dest_type, 'status': 'success'})
                else:
                    error_messages.append(f'{dest_type}: {error_msg or "Failed"}')
                    destination_results.append({'type': dest_type, 'status': 'error', 'error': error_msg})
            
            if success_count > 0:
                # Update last posted version if at least one destination succeeded
                self.storage.save_last_version(app_id, current_version)
                message = f'New version posted to {success_count} destination(s)'
                if error_messages:
                    message += f' ({len(error_messages)} failed)'
                
                # Log successful post
                self.storage.add_history_entry(
                    event_type='post',
                    app_id=app_id,
                    app_name=app_name,
                    status='success',
                    message=f'New version {current_version} posted to {success_count} destination(s)',
                    details={
                        'version': current_version,
                        'previous_version': last_version,
                        'success_count': success_count,
                        'failed_count': len(error_messages),
                        'destinations': destination_results
                    }
                )
                
                return {
                    'success': True,
                    'message': message,
                    'current_version': current_version,
                    'last_version': last_version,
                    'checked_at': datetime.now().isoformat(),
                    'formatted_preview': formatted_notes
                }
            else:
                error_msg = 'Failed to post to any notification destination'
                if error_messages:
                    error_msg = '; '.join(error_messages)
                
                # Log failed post
                self.storage.add_history_entry(
                    event_type='post',
                    app_id=app_id,
                    app_name=app_name,
                    status='error',
                    message=f'Failed to post version {current_version}',
                    details={
                        'version': current_version,
                        'error': error_msg,
                        'destinations': destination_results
                    }
                )
                
                return {
                    'success': False,
                    'error': error_msg,
                    'current_version': current_version,
                    'checked_at': datetime.now().isoformat(),
                    'formatted_preview': formatted_notes
                }
        
        except Exception as e:
            logger.error(f"Error checking app {app_id}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'checked_at': datetime.now().isoformat()
            }
    
    def post_to_discord(self, app):
        """Manually post current release notes to all configured notification destinations"""
        app_id = app['id']
        app_store_id = app['app_store_id']
        
        # Get notification destinations - support both new format and legacy webhook_url
        notification_destinations = app.get('notification_destinations', [])
        if not notification_destinations and app.get('webhook_url'):
            # Legacy support - convert old webhook_url to new format
            notification_destinations = [{
                'type': 'discord',
                'webhook_url': app['webhook_url']
            }]
        
        try:
            # Fetch current app info
            app_info = self.fetch_app_info(app_store_id)
            
            if not app_info:
                return {
                    'success': False,
                    'error': 'App not found in App Store'
                }
            
            current_version = app_info['version']
            release_notes = app_info.get('releaseNotes', '')
            
            # Update current version
            self.storage.save_current_version(app_id, current_version)
            
            # Format and post to all destinations
            formatted_notes = self.formatter.format_release_notes(current_version, release_notes)
            app_name = app.get('name', 'App')
            
            success_count = 0
            error_messages = []
            destination_results = []
            
            for dest in notification_destinations:
                dest_type = dest.get('type', 'unknown')
                success, error_msg = self.notifier.send_notification(
                    dest, app_name, current_version, release_notes, formatted_notes
                )
                if success:
                    success_count += 1
                    destination_results.append({'type': dest_type, 'status': 'success'})
                else:
                    error_messages.append(f'{dest_type}: {error_msg or "Failed"}')
                    destination_results.append({'type': dest_type, 'status': 'error', 'error': error_msg})
            
            if success_count > 0:
                # Update last posted version if at least one destination succeeded
                self.storage.save_last_version(app_id, current_version)
                message = f'Posted to {success_count} destination(s)'
                if error_messages:
                    message += f' ({len(error_messages)} failed)'
                
                # Log successful manual post
                self.storage.add_history_entry(
                    event_type='post',
                    app_id=app_id,
                    app_name=app_name,
                    status='success',
                    message=f'Manually posted version {current_version} to {success_count} destination(s)',
                    details={
                        'version': current_version,
                        'success_count': success_count,
                        'failed_count': len(error_messages),
                        'destinations': destination_results,
                        'manual': True
                    }
                )
                
                return {
                    'success': True,
                    'message': message,
                    'version': current_version,
                    'formatted_preview': formatted_notes
                }
            else:
                error_msg = 'Failed to post to any notification destination'
                if error_messages:
                    error_msg = '; '.join(error_messages)
                
                # Log failed manual post
                self.storage.add_history_entry(
                    event_type='post',
                    app_id=app_id,
                    app_name=app_name,
                    status='error',
                    message=f'Failed to manually post version {current_version}',
                    details={
                        'version': current_version,
                        'error': error_msg,
                        'destinations': destination_results,
                        'manual': True
                    }
                )
                
                return {
                    'success': False,
                    'error': error_msg,
                    'version': current_version,
                    'formatted_preview': formatted_notes
                }
        
        except Exception as e:
            logger.error(f"Error posting to notification destinations for app {app_id}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    


"""
App Store API integration
"""
import logging
import requests
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class AppStoreMonitor:
    """Monitor App Store apps for new releases"""
    
    ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup"
    
    def __init__(self, storage, formatter):
        self.storage = storage
        self.formatter = formatter
    
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
            
            return {
                'version': app_info.get('version'),
                'releaseNotes': app_info.get('releaseNotes', ''),
                'bundleId': app_info.get('bundleId'),
                'trackName': app_info.get('trackName'),
                'artistName': app_info.get('artistName')
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
            
            # Post to all notification destinations
            success_count = 0
            error_messages = []
            
            for dest in notification_destinations:
                dest_type = dest.get('type', 'discord')
                if dest_type == 'discord':
                    webhook_url = dest.get('webhook_url', '').strip()
                    if webhook_url:
                        if self._post_to_discord_webhook(webhook_url, formatted_notes):
                            success_count += 1
                        else:
                            error_messages.append(f'Failed to post to Discord webhook')
            
            if success_count > 0:
                # Update last posted version if at least one destination succeeded
                self.storage.save_last_version(app_id, current_version)
                message = f'New version posted to {success_count} destination(s)'
                if error_messages:
                    message += f' ({len(error_messages)} failed)'
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
            
            success_count = 0
            error_messages = []
            
            for dest in notification_destinations:
                dest_type = dest.get('type', 'discord')
                if dest_type == 'discord':
                    webhook_url = dest.get('webhook_url', '').strip()
                    if webhook_url:
                        if self._post_to_discord_webhook(webhook_url, formatted_notes):
                            success_count += 1
                        else:
                            error_messages.append(f'Failed to post to Discord webhook')
            
            if success_count > 0:
                # Update last posted version if at least one destination succeeded
                self.storage.save_last_version(app_id, current_version)
                message = f'Posted to {success_count} destination(s)'
                if error_messages:
                    message += f' ({len(error_messages)} failed)'
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
    
    def _post_to_discord_webhook(self, webhook_url, content):
        """Post content to Discord webhook"""
        try:
            payload = {
                'content': content
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error posting to Discord webhook: {e}")
            return False


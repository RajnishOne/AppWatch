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
        webhook_url = app.get('webhook_url')
        
        if not webhook_url:
            return {
                'success': False,
                'error': 'No webhook URL configured',
                'checked_at': datetime.now().isoformat()
            }
        
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
            
            # New version detected - post to Discord
            formatted_notes = self.formatter.format_release_notes(current_version, release_notes)
            
            # Post to Discord
            success = self._post_to_discord_webhook(webhook_url, formatted_notes)
            
            if success:
                # Update last posted version
                self.storage.save_last_version(app_id, current_version)
                return {
                    'success': True,
                    'message': 'New version posted to Discord',
                    'current_version': current_version,
                    'last_version': last_version,
                    'checked_at': datetime.now().isoformat(),
                    'formatted_preview': formatted_notes
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to post to Discord',
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
        """Manually post current release notes to Discord"""
        app_id = app['id']
        app_store_id = app['app_store_id']
        webhook_url = app.get('webhook_url')
        
        if not webhook_url:
            return {
                'success': False,
                'error': 'No webhook URL configured'
            }
        
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
            
            # Format and post
            formatted_notes = self.formatter.format_release_notes(current_version, release_notes)
            success = self._post_to_discord_webhook(webhook_url, formatted_notes)
            
            if success:
                # Update last posted version
                self.storage.save_last_version(app_id, current_version)
                return {
                    'success': True,
                    'message': 'Posted to Discord',
                    'version': current_version,
                    'formatted_preview': formatted_notes
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to post to Discord',
                    'version': current_version,
                    'formatted_preview': formatted_notes
                }
        
        except Exception as e:
            logger.error(f"Error posting to Discord for app {app_id}: {e}", exc_info=True)
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


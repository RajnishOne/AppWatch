"""
Storage management for app data and version tracking
"""
import json
import logging
from pathlib import Path
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class StorageManager:
    """Manage app data and version storage"""
    
    def __init__(self, data_dir):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.apps_file = self.data_dir / 'apps.json'
        self._ensure_apps_file()
    
    def _ensure_apps_file(self):
        """Ensure apps.json exists"""
        if not self.apps_file.exists():
            self._save_apps({})
    
    def _load_apps(self):
        """Load apps from JSON file"""
        try:
            if self.apps_file.exists():
                with open(self.apps_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            logger.error(f"Error loading apps: {e}")
            return {}
    
    def _save_apps(self, apps_dict):
        """Save apps to JSON file"""
        try:
            with open(self.apps_file, 'w') as f:
                json.dump(apps_dict, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving apps: {e}")
            raise
    
    def get_all_apps(self):
        """Get all apps as a list"""
        apps_dict = self._load_apps()
        apps = []
        
        for app_id, app_data in apps_dict.items():
            app = {
                'id': app_id,
                **app_data
            }
            
            # Add status information
            app['current_version'] = self.get_current_version(app_id)
            app['last_posted_version'] = self.get_last_version(app_id)
            app['last_check'] = self.get_last_check(app_id)
            
            apps.append(app)
        
        return apps
    
    def get_app(self, app_id):
        """Get a specific app"""
        apps_dict = self._load_apps()
        
        if app_id not in apps_dict:
            return None
        
        app_data = apps_dict[app_id]
        app = {
            'id': app_id,
            **app_data
        }
        
        # Add status information
        app['current_version'] = self.get_current_version(app_id)
        app['last_posted_version'] = self.get_last_version(app_id)
        app['last_check'] = self.get_last_check(app_id)
        
        return app
    
    def save_app(self, app_data):
        """Save or update an app"""
        apps_dict = self._load_apps()
        
        # Generate ID if new
        if 'id' not in app_data or app_data['id'] not in apps_dict:
            app_id = str(uuid.uuid4())
        else:
            app_id = app_data['id']
        
        # Remove status fields before saving
        save_data = {
            'name': app_data['name'],
            'app_store_id': app_data['app_store_id'],
            'webhook_url': app_data['webhook_url'],
            'interval_override': app_data.get('interval_override'),
            'enabled': app_data.get('enabled', True)
        }
        
        apps_dict[app_id] = save_data
        self._save_apps(apps_dict)
        
        return app_id
    
    def delete_app(self, app_id):
        """Delete an app"""
        apps_dict = self._load_apps()
        
        if app_id not in apps_dict:
            return False
        
        del apps_dict[app_id]
        self._save_apps(apps_dict)
        
        # Also delete version files
        version_file = self._get_version_file(app_id)
        if version_file.exists():
            version_file.unlink()
        
        current_version_file = self._get_current_version_file(app_id)
        if current_version_file.exists():
            current_version_file.unlink()
        
        # Delete check time file
        check_file = self._get_check_file(app_id)
        if check_file.exists():
            check_file.unlink()
        
        # Delete history file
        history_file = self._get_history_file(app_id)
        if history_file.exists():
            history_file.unlink()
        
        return True
    
    def _get_version_file(self, app_id):
        """Get path to version file for an app"""
        app_dir = self.data_dir / 'apps' / app_id
        app_dir.mkdir(parents=True, exist_ok=True)
        return app_dir / 'version.txt'
    
    def _get_check_file(self, app_id):
        """Get path to last check time file"""
        app_dir = self.data_dir / 'apps' / app_id
        app_dir.mkdir(parents=True, exist_ok=True)
        return app_dir / 'check.txt'
    
    def _get_current_version_file(self, app_id):
        """Get path to current version file (last checked version from App Store)"""
        app_dir = self.data_dir / 'apps' / app_id
        app_dir.mkdir(parents=True, exist_ok=True)
        return app_dir / 'current_version.txt'
    
    def _get_history_file(self, app_id):
        """Get path to version history file"""
        app_dir = self.data_dir / 'apps' / app_id
        app_dir.mkdir(parents=True, exist_ok=True)
        return app_dir / 'history.json'
    
    def get_last_version(self, app_id):
        """Get last posted version for an app"""
        version_file = self._get_version_file(app_id)
        
        if version_file.exists():
            try:
                return version_file.read_text().strip()
            except Exception as e:
                logger.error(f"Error reading version file: {e}")
                return None
        
        return None
    
    def save_last_version(self, app_id, version):
        """Save last posted version for an app"""
        version_file = self._get_version_file(app_id)
        
        try:
            version_file.write_text(version)
        except Exception as e:
            logger.error(f"Error saving version: {e}")
            raise
    
    def get_last_check(self, app_id):
        """Get last check time for an app"""
        check_file = self._get_check_file(app_id)
        
        if check_file.exists():
            try:
                return check_file.read_text().strip()
            except Exception as e:
                logger.error(f"Error reading check file: {e}")
                return None
        
        return None
    
    def update_last_check(self, app_id, timestamp):
        """Update last check time for an app"""
        check_file = self._get_check_file(app_id)
        
        try:
            check_file.write_text(timestamp)
        except Exception as e:
            logger.error(f"Error saving check time: {e}")
    
    def get_current_version(self, app_id):
        """Get current version (last checked from App Store)"""
        version_file = self._get_current_version_file(app_id)
        
        if version_file.exists():
            try:
                return version_file.read_text().strip()
            except Exception as e:
                logger.error(f"Error reading current version file: {e}")
                return None
        
        return None
    
    def save_current_version(self, app_id, version):
        """Save current version (from App Store check)"""
        version_file = self._get_current_version_file(app_id)
        
        try:
            version_file.write_text(version)
        except Exception as e:
            logger.error(f"Error saving current version: {e}")
            raise
    
    def add_to_history(self, app_id, version, release_notes, timestamp=None):
        """Add a version entry to history"""
        if timestamp is None:
            from datetime import datetime
            timestamp = datetime.now().isoformat()
        
        history_file = self._get_history_file(app_id)
        
        try:
            # Load existing history
            if history_file.exists():
                with open(history_file, 'r') as f:
                    history = json.load(f)
            else:
                history = []
            
            # Check if version already exists
            existing = next((h for h in history if h.get('version') == version), None)
            if existing:
                # Update existing entry
                existing['release_notes'] = release_notes
                existing['timestamp'] = timestamp
            else:
                # Add new entry at the beginning (newest first)
                history.insert(0, {
                    'version': version,
                    'release_notes': release_notes,
                    'timestamp': timestamp
                })
            
            # Keep only last 50 entries to prevent file from growing too large
            history = history[:50]
            
            # Save history
            with open(history_file, 'w') as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving to history: {e}")
            raise
    
    def get_history(self, app_id):
        """Get version history for an app"""
        history_file = self._get_history_file(app_id)
        
        try:
            if history_file.exists():
                with open(history_file, 'r') as f:
                    return json.load(f)
            return []
        except Exception as e:
            logger.error(f"Error reading history: {e}")
            return []


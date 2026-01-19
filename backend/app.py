#!/usr/bin/env python3
"""
App Store Release Notifier - Main Application
"""
import os
import json
import logging
import threading
import time
from datetime import datetime
from functools import partial
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import schedule

from backend.app_store import AppStoreMonitor
from backend.formatter import DiscordFormatter
from backend.storage import StorageManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Determine static folder path
static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')
if not os.path.exists(static_folder):
    static_folder = None

app = Flask(__name__, static_folder=static_folder, static_url_path='')
# CORS - allow all origins for self-hosted use (restrict in production if needed)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize components
storage = StorageManager(Path('/data'))
formatter = DiscordFormatter()
monitor = AppStoreMonitor(storage, formatter)

# Global scheduler thread
scheduler_thread = None
scheduler_running = False


def load_apps():
    """Load apps from storage"""
    return storage.get_all_apps()


def save_app(app_data):
    """Save app to storage"""
    return storage.save_app(app_data)


def delete_app(app_id):
    """Delete app from storage"""
    return storage.delete_app(app_id)


def get_default_interval():
    """Get default check interval from environment"""
    interval_str = os.getenv('CHECK_INTERVAL', '12h')
    return parse_interval(interval_str)


def parse_interval(interval_str):
    """Parse interval string like '12h', '30m', '1d' to seconds"""
    if not interval_str:
        raise ValueError("Interval string cannot be empty")
    
    interval_str = str(interval_str).lower().strip()
    
    if not interval_str:
        raise ValueError("Interval string cannot be empty")
    
    try:
        if interval_str.endswith('h'):
            hours = int(interval_str[:-1])
            if hours <= 0:
                raise ValueError("Hours must be positive")
            return hours * 3600
        elif interval_str.endswith('m'):
            minutes = int(interval_str[:-1])
            if minutes <= 0:
                raise ValueError("Minutes must be positive")
            return minutes * 60
        elif interval_str.endswith('d'):
            days = int(interval_str[:-1])
            if days <= 0:
                raise ValueError("Days must be positive")
            return days * 86400
        else:
            # Assume seconds if no suffix
            seconds = int(interval_str)
            if seconds <= 0:
                raise ValueError("Seconds must be positive")
            return seconds
    except ValueError as e:
        if "invalid literal" in str(e).lower():
            raise ValueError(f"Invalid interval format: {interval_str}. Use format like: 6h, 30m, 1d")
        raise


def format_interval(seconds):
    """Format seconds to interval string"""
    if seconds >= 86400:
        return f"{seconds // 86400}d"
    elif seconds >= 3600:
        return f"{seconds // 3600}h"
    elif seconds >= 60:
        return f"{seconds // 60}m"
    else:
        return f"{seconds}s"


def check_app(app_id):
    """Check a single app for updates"""
    try:
        app = storage.get_app(app_id)
        if not app:
            return {'error': 'App not found'}, 404
        
        if not app.get('enabled', True):
            return {'message': 'App is disabled'}, 200
        
        result = monitor.check_app(app)
        return result, 200
    except Exception as e:
        logger.error(f"Error checking app {app_id}: {e}", exc_info=True)
        return {'error': str(e)}, 500


def post_to_discord(app_id):
    """Manually post current release notes to Discord"""
    try:
        app = storage.get_app(app_id)
        if not app:
            return {'error': 'App not found'}, 404
        
        result = monitor.post_to_discord(app)
        return result, 200
    except Exception as e:
        logger.error(f"Error posting to Discord for app {app_id}: {e}", exc_info=True)
        return {'error': str(e)}, 500


def run_scheduler():
    """Run the scheduler loop"""
    global scheduler_running
    scheduler_running = True
    
    while scheduler_running:
        schedule.run_pending()
        time.sleep(60)  # Check every minute


def setup_scheduler():
    """Setup scheduled checks for all apps"""
    global scheduler_thread
    
    # Clear existing jobs
    schedule.clear()
    
    apps = load_apps()
    default_interval = get_default_interval()
    
    for app in apps:
        if not app.get('enabled', True):
            continue
        
        app_id = app['app_store_id']
        interval_override = app.get('interval_override')
        interval_seconds = parse_interval(interval_override) if interval_override else default_interval
        
        # Schedule job - use functools.partial to properly capture app_id
        schedule.every(interval_seconds).seconds.do(partial(check_app, app['id']))
        logger.info(f"Scheduled app {app['name']} ({app_id}) to check every {format_interval(interval_seconds)}")
    
    # Start scheduler thread if not running
    if scheduler_thread is None or not scheduler_thread.is_alive():
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        logger.info("Scheduler thread started")


# API Routes

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve frontend - handle SPA routing"""
    # Don't handle API routes here - they're defined above
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    if static_folder and os.path.exists(os.path.join(static_folder, 'index.html')):
        # Serve static files if they exist
        if path:
            static_path = os.path.join(static_folder, path)
            if os.path.exists(static_path) and os.path.isfile(static_path):
                return send_from_directory(static_folder, path)
        
        # Fallback to index.html for SPA routing
        return send_from_directory(static_folder, 'index.html')
    else:
        return jsonify({'message': 'Frontend not built. Please build the frontend first.'}), 503


@app.route('/api/status', methods=['GET'])
def status():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'scheduler_running': scheduler_running
    })


@app.route('/api/apps', methods=['GET'])
def get_apps():
    """Get all apps"""
    apps = load_apps()
    return jsonify(apps)


@app.route('/api/apps', methods=['POST'])
def create_app():
    """Create a new app"""
    if not request.json:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    data = request.json
    
    required_fields = ['name', 'app_store_id', 'webhook_url']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Input validation
    name = str(data['name']).strip()
    app_store_id = str(data['app_store_id']).strip()
    webhook_url = str(data['webhook_url']).strip()
    
    if not name:
        return jsonify({'error': 'App name cannot be empty'}), 400
    if not app_store_id or not app_store_id.isdigit():
        return jsonify({'error': 'App Store ID must be a number'}), 400
    if not webhook_url.startswith('https://discord.com/api/webhooks/'):
        return jsonify({'error': 'Invalid Discord webhook URL'}), 400
    
    # Validate interval if provided
    interval_override = data.get('interval_override', '').strip() if data.get('interval_override') else None
    if interval_override:
        try:
            parse_interval(interval_override)
        except (ValueError, AttributeError):
            return jsonify({'error': 'Invalid interval format. Use format like: 6h, 30m, 1d'}), 400
    
    app_data = {
        'name': name,
        'app_store_id': app_store_id,
        'webhook_url': webhook_url,
        'interval_override': interval_override,
        'enabled': data.get('enabled', True)
    }
    
    try:
        app_id = save_app(app_data)
        setup_scheduler()  # Reschedule
        return jsonify({'id': app_id, **app_data}), 201
    except Exception as e:
        logger.error(f"Error creating app: {e}", exc_info=True)
        return jsonify({'error': 'Failed to create app'}), 500


@app.route('/api/apps/<app_id>', methods=['PUT'])
def update_app(app_id):
    """Update an app"""
    if not request.json:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    data = request.json
    
    app = storage.get_app(app_id)
    if not app:
        return jsonify({'error': 'App not found'}), 404
    
    # Update fields with validation
    if 'name' in data:
        name = str(data['name']).strip()
        if not name:
            return jsonify({'error': 'App name cannot be empty'}), 400
        app['name'] = name
    
    if 'app_store_id' in data:
        app_store_id = str(data['app_store_id']).strip()
        if not app_store_id or not app_store_id.isdigit():
            return jsonify({'error': 'App Store ID must be a number'}), 400
        app['app_store_id'] = app_store_id
    
    if 'webhook_url' in data:
        webhook_url = str(data['webhook_url']).strip()
        if not webhook_url.startswith('https://discord.com/api/webhooks/'):
            return jsonify({'error': 'Invalid Discord webhook URL'}), 400
        app['webhook_url'] = webhook_url
    
    if 'interval_override' in data:
        interval_override = data['interval_override']
        if interval_override:
            interval_override = str(interval_override).strip()
            try:
                parse_interval(interval_override)
            except (ValueError, AttributeError):
                return jsonify({'error': 'Invalid interval format. Use format like: 6h, 30m, 1d'}), 400
        app['interval_override'] = interval_override if interval_override else None
    
    if 'enabled' in data:
        app['enabled'] = bool(data['enabled'])
    
    try:
        save_app(app)
        setup_scheduler()  # Reschedule
        return jsonify(app)
    except Exception as e:
        logger.error(f"Error updating app {app_id}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to update app'}), 500


@app.route('/api/apps/<app_id>', methods=['DELETE'])
def remove_app(app_id):
    """Delete an app"""
    if delete_app(app_id):
        setup_scheduler()  # Reschedule
        return jsonify({'message': 'App deleted'}), 200
    else:
        return jsonify({'error': 'App not found'}), 404


@app.route('/api/apps/<app_id>/check', methods=['POST'])
def check_app_endpoint(app_id):
    """Manually check an app for updates"""
    result, status_code = check_app(app_id)
    return jsonify(result), status_code


@app.route('/api/apps/<app_id>/post', methods=['POST'])
def post_app_endpoint(app_id):
    """Manually post release notes to Discord"""
    result, status_code = post_to_discord(app_id)
    return jsonify(result), status_code


@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get recent logs (simplified - in production use proper log aggregation)"""
    # For now, return empty. In production, you'd read from log files
    return jsonify({'logs': []})


# Initialize scheduler when module loads
# Wrap in try-except to handle errors gracefully
try:
    setup_scheduler()
except Exception as e:
    logger.error(f"Failed to initialize scheduler: {e}", exc_info=True)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8192))
    # Use production WSGI server in production (gunicorn recommended)
    # For self-hosted, Flask dev server is acceptable
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)


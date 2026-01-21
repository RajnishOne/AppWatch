"""
Authentication middleware and utilities
"""
import logging
import base64
from functools import wraps
from flask import request, jsonify, Response
import ipaddress

logger = logging.getLogger(__name__)


def is_local_network(ip_address):
    """Check if an IP address is in a local/private network"""
    try:
        ip = ipaddress.ip_address(ip_address)
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        return False


def get_client_ip():
    """Get client IP address from request"""
    if request.headers.get('X-Forwarded-For'):
        # Get first IP in X-Forwarded-For header
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr


def check_basic_auth(storage):
    """Check Basic Authentication from request"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Basic '):
        return None
    
    try:
        encoded = auth_header.split(' ')[1]
        decoded = base64.b64decode(encoded).decode('utf-8')
        username, password = decoded.split(':', 1)
        return username, password
    except Exception as e:
        logger.warning(f"Error parsing Basic Auth: {e}")
        return None


def check_session_auth(storage):
    """Check session-based authentication (for Forms auth)"""
    # For Forms auth, we'll use a simple session token stored in Authorization header
    # Format: "Bearer <token>" where token is base64(username:password_hash)
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    
    try:
        token = auth_header.split(' ', 1)[1]
        # In a real implementation, you'd verify a session token
        # For now, we'll extract username from token and verify
        # This is a simplified approach - in production, use proper session management
        decoded = base64.b64decode(token).decode('utf-8')
        username, stored_hash = decoded.split(':', 1)
        return username, stored_hash
    except Exception:
        return None


def check_api_key_auth(storage):
    """Check API key authentication from request"""
    # Check X-Api-Key header (standard for Sonarr/Radarr)
    api_key = request.headers.get('X-Api-Key', '')
    if api_key:
        return storage.verify_api_key(api_key)
    
    # Also check Authorization header with Bearer token (for API key)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1]
        # Try as API key first
        if storage.verify_api_key(token):
            return True
    
    return False


def require_auth(storage):
    """Decorator to require authentication for API endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_config = storage.get_auth()
            
            # If auth is not enabled, allow access
            if not auth_config.get('enabled', False):
                return f(*args, **kwargs)
            
            # Check if local network bypass is enabled
            if auth_config.get('bypass_local_networks', False):
                client_ip = get_client_ip()
                if is_local_network(client_ip):
                    logger.info(f"Bypassing auth for local network IP: {client_ip}")
                    return f(*args, **kwargs)
            
            # Check API key first (works regardless of auth type)
            if check_api_key_auth(storage):
                authenticated = True
            else:
                # Check authentication based on auth type
                auth_type = auth_config.get('auth_type', 'forms')
                username = auth_config.get('username', '')
                
                authenticated = False
                
                if auth_type == 'basic':
                    # Check Basic Auth
                    basic_auth = check_basic_auth(storage)
                    if basic_auth:
                        auth_username, password = basic_auth
                        if auth_username == username and storage.verify_password(password):
                            authenticated = True
                elif auth_type == 'forms':
                    # Check session token (Bearer token)
                    session_auth = check_session_auth(storage)
                    if session_auth:
                        auth_username, token_hash = session_auth
                        stored_hash = auth_config.get('password_hash', '')
                        if auth_username == username and token_hash == stored_hash:
                            authenticated = True
                    # Also check Basic Auth as fallback (for API calls)
                    if not authenticated:
                        basic_auth = check_basic_auth(storage)
                        if basic_auth:
                            auth_username, password = basic_auth
                            if auth_username == username and storage.verify_password(password):
                                authenticated = True
            
            if not authenticated:
                if auth_type == 'basic':
                    return Response(
                        'Authentication required',
                        401,
                        {'WWW-Authenticate': 'Basic realm="App Watch"'}
                    )
                else:
                    return jsonify({'error': 'Authentication required'}), 401
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


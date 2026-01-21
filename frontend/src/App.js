import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const API_BASE = window.location.origin;

// Favicon path - use this constant so favicon can be changed in one place
const FAVICON_PATH = '/icon-192.png';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'add-app', 'edit-app', or 'settings'
  const [editingApp, setEditingApp] = useState(null);
  const [message, setMessage] = useState(null);
  const [checking, setChecking] = useState({});
  const [posting, setPosting] = useState({});
  
  // Authentication state
  const [authStatus, setAuthStatus] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token') || null);
  
  // Ref to track if apps have been loaded to prevent duplicate calls
  const appsLoadedRef = useRef(false);
  const loadingAppsRef = useRef(false); // Track if currently loading to prevent concurrent calls

  // Check authentication status on mount - only once
  useEffect(() => {
    checkAuthStatus();
  }, []); // Empty dependency array - only run once on mount

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/status`);
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
        
        // If auth is not configured, we'll show onboarding
        if (!data.configured) {
          setAuthLoading(false);
          return;
        }
        
        // If auth is configured, check if we have a token
        if (data.enabled) {
          const token = localStorage.getItem('auth_token');
          if (token) {
            // Set authenticated state optimistically (token exists)
            setIsAuthenticated(true);
            setAuthToken(token);
            setAuthLoading(false);
            // Verify token in background (non-blocking)
            verifyAuth(token).catch(() => {
              // If verification fails, we'll handle it in verifyAuth
            });
          } else {
            setAuthLoading(false);
          }
        } else {
          // Auth is configured but disabled, proceed normally
          setIsAuthenticated(true);
          setAuthLoading(false);
          loadApps();
        }
      } else {
        setAuthLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthLoading(false);
    }
  };

  const verifyAuth = async (token = null) => {
    const tokenToVerify = token || authToken || localStorage.getItem('auth_token');
    if (!tokenToVerify) {
      setIsAuthenticated(false);
      setAuthLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/status`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        setAuthToken(tokenToVerify);
        if (authLoading) {
          setAuthLoading(false);
          // Don't call loadApps here - let useEffect handle it
        }
      } else if (response.status === 401) {
        // Token invalid, clear it
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setIsAuthenticated(false);
        setAuthLoading(false);
      }
    } catch (error) {
      console.error('Error verifying auth:', error);
      // Don't clear token on network errors - might be temporary
      // Only clear on actual 401 responses
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        setAuthLoading(false);
        appsLoadedRef.current = false; // Reset flag so useEffect can load apps
        // Don't call loadApps here - let useEffect handle it
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setIsAuthenticated(false);
    // Don't clear authStatus - we still need to know if auth is configured
    // Just mark as not authenticated
  };

  const handleAuthSetup = async (authData) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authData)
      });

      if (response.ok) {
        // After setup, automatically login
        const loginResult = await handleLogin(authData.username, authData.password);
        if (loginResult.success) {
          // Refresh auth status
          await checkAuthStatus();
          return { success: true };
        } else {
          return { success: false, error: 'Setup successful but login failed' };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Setup failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    // Only check routes and load apps if authenticated and not loading
    if (authLoading) {
      return;
    }
    
    // Load apps only once when authenticated and not already loading
    if (isAuthenticated && !appsLoadedRef.current && !loadingAppsRef.current) {
      loadApps();
    }
    
    // Check initial route
    const checkRoute = () => {
      const path = window.location.pathname;
      if (path === '/add-app' || path.includes('/add-app')) {
        setCurrentPage('add-app');
        setEditingApp(null);
      } else if (path.includes('/edit-app/')) {
        setCurrentPage('edit-app');
        // If editingApp is not set, try to load it from URL
        // This handles direct navigation to edit URL
        const appId = path.split('/edit-app/')[1];
        if (appId && !editingApp) {
          // Load apps and find the one to edit
          fetch(`${API_BASE}/api/apps`, { headers: getAuthHeaders() })
            .then(response => response.json())
            .then(apps => {
              const app = apps.find(a => a.id === appId);
              if (app) {
                setEditingApp(app);
              } else {
                // App not found, redirect to dashboard
                setCurrentPage('dashboard');
                setEditingApp(null);
                window.history.replaceState({ page: 'dashboard' }, '', '/');
              }
            })
            .catch(error => {
              console.error('Error loading app:', error);
              setCurrentPage('dashboard');
              setEditingApp(null);
              window.history.replaceState({ page: 'dashboard' }, '', '/');
            });
        }
      } else if (path === '/settings' || path.includes('/settings')) {
        setCurrentPage('settings');
      } else if (path === '/activity' || path.includes('/activity')) {
        setCurrentPage('activity');
      } else {
        setCurrentPage('dashboard');
        setEditingApp(null);
      }
    };
    
    checkRoute();
    
    // Handle browser back/forward buttons
    const handlePopState = () => {
      checkRoute();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]); // Only re-run if auth state changes

  const loadApps = async () => {
    // Prevent duplicate concurrent calls
    if (loadingAppsRef.current) {
      return;
    }
    
    try {
      loadingAppsRef.current = true;
      setLoading(true);
      const token = authToken || localStorage.getItem('auth_token');
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE}/api/apps`, { headers });
      if (response.ok) {
        const data = await response.json();
        setApps(data);
        appsLoadedRef.current = true; // Mark as loaded
        // Ensure we're marked as authenticated if we got data
        if (!isAuthenticated && token) {
          setIsAuthenticated(true);
        }
      } else if (response.status === 401) {
        // Unauthorized, clear token and show login
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setIsAuthenticated(false);
        appsLoadedRef.current = false; // Reset flag
        setAuthStatus(prev => prev ? { ...prev, enabled: true } : null);
      } else {
        showMessage('Failed to load apps', 'error');
      }
    } catch (error) {
      showMessage('Error loading apps: ' + error.message, 'error');
    } finally {
      setLoading(false);
      loadingAppsRef.current = false;
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddApp = () => {
    setEditingApp(null);
    setCurrentPage('add-app');
    window.history.pushState({ page: 'add-app' }, '', '/add-app');
  };
  
  const handleCancelAddApp = () => {
    // Navigate back in history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // If no history, just go to root
      setCurrentPage('dashboard');
      window.history.replaceState({ page: 'dashboard' }, '', '/');
    }
  };

  const handleEditApp = (app) => {
    setEditingApp(app);
    setCurrentPage('edit-app');
    window.history.pushState({ page: 'edit-app' }, '', `/edit-app/${app.id}`);
  };
  
  const handleCancelEditApp = () => {
    // Navigate back in history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // If no history, just go to root
      setCurrentPage('dashboard');
      setEditingApp(null);
      window.history.replaceState({ page: 'dashboard' }, '', '/');
    }
  };

  const handleDeleteApp = async (appId) => {
    if (!window.confirm('Are you sure you want to delete this app?')) {
      return;
    }

    try {
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${API_BASE}/api/apps/${appId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        showMessage('App deleted successfully');
        appsLoadedRef.current = false; // Reset flag to allow reload
        loadApps();
      } else {
        showMessage('Failed to delete app', 'error');
      }
    } catch (error) {
      showMessage('Error deleting app: ' + error.message, 'error');
    }
  };

  const handleCheckApp = async (appId) => {
    setChecking({ ...checking, [appId]: true });
    try {
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${API_BASE}/api/apps/${appId}/check`, {
        method: 'POST',
        headers
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          showMessage(data.message || 'Check completed');
        } else {
          showMessage(data.error || 'Check failed', 'error');
        }
        appsLoadedRef.current = false; // Reset flag to allow reload
        loadApps();
      } else {
        showMessage(data.error || 'Check failed', 'error');
      }
    } catch (error) {
      showMessage('Error checking app: ' + error.message, 'error');
    } finally {
      setChecking({ ...checking, [appId]: false });
    }
  };

  const handlePostApp = async (appId) => {
    setPosting({ ...posting, [appId]: true });
    try {
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${API_BASE}/api/apps/${appId}/post`, {
        method: 'POST',
        headers
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          showMessage(data.message || 'Posted to Discord');
        } else {
          showMessage(data.error || 'Post failed', 'error');
        }
        appsLoadedRef.current = false; // Reset flag to allow reload
        loadApps();
      } else {
        showMessage(data.error || 'Post failed', 'error');
      }
    } catch (error) {
      showMessage('Error posting: ' + error.message, 'error');
    } finally {
      setPosting({ ...posting, [appId]: false });
    }
  };

  const handleSaveApp = async (formData) => {
    try {
      const appId = formData.id || editingApp?.id;
      const url = appId
        ? `${API_BASE}/api/apps/${appId}`
        : `${API_BASE}/api/apps`;
      
      const method = appId ? 'PUT' : 'POST';

      const headers = {
        'Content-Type': 'application/json'
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showMessage(appId ? 'App updated successfully' : 'App added successfully');
        setCurrentPage('dashboard');
        setEditingApp(null);
        window.history.pushState({ page: 'dashboard' }, '', '/');
        appsLoadedRef.current = false; // Reset flag to allow reload
        loadApps();
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to save app', 'error');
      }
    } catch (error) {
      showMessage('Error saving app: ' + error.message, 'error');
    }
  };

  // Show loading while checking auth (only on initial load)
  if (authLoading && !authStatus) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Show onboarding if auth is not configured
  if (authStatus && !authStatus.configured) {
    return (
      <OnboardingPage
        onSetup={handleAuthSetup}
        message={message}
        showMessage={showMessage}
      />
    );
  }

  // Show login if auth is enabled but user is not authenticated
  // Only show if we've finished loading and don't have a token
  if (authStatus && authStatus.enabled && !isAuthenticated && !authLoading) {
    const hasToken = localStorage.getItem('auth_token');
    // If we have a token but aren't authenticated, we're still verifying
    if (hasToken) {
      return (
        <div className="container">
          <div className="loading">Verifying authentication...</div>
        </div>
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        authType={authStatus.auth_type}
        message={message}
        showMessage={showMessage}
      />
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Show add app page instead of dashboard
  if (currentPage === 'add-app') {
    return (
      <AddAppPage
        onSave={handleSaveApp}
        onCancel={handleCancelAddApp}
        message={message}
        showMessage={showMessage}
        editingApp={null}
      />
    );
  }

  // Show edit app page
  if (currentPage === 'edit-app' && editingApp) {
    return (
      <AddAppPage
        onSave={handleSaveApp}
        onCancel={handleCancelEditApp}
        message={message}
        showMessage={showMessage}
        editingApp={editingApp}
      />
    );
  }

  // Show settings page
  if (currentPage === 'settings') {
    return (
      <SettingsPage
        onCancel={() => {
          setCurrentPage('dashboard');
          window.history.pushState({ page: 'dashboard' }, '', '/');
        }}
        message={message}
        showMessage={showMessage}
      />
    );
  }

  // Show activity page
  if (currentPage === 'activity') {
    return (
      <ActivityPage
        onCancel={() => {
          setCurrentPage('dashboard');
          window.history.pushState({ page: 'dashboard' }, '', '/');
        }}
        apps={apps}
        message={message}
        showMessage={showMessage}
      />
    );
  }

  const handleSettingsClick = () => {
    setCurrentPage('settings');
    window.history.pushState({ page: 'settings' }, '', '/settings');
  };

  const handleActivityClick = () => {
    setCurrentPage('activity');
    window.history.pushState({ page: 'activity' }, '', '/activity');
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <div className="logo">
            <img src={FAVICON_PATH} alt="App Watch" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          </div>
          <div className="header-text">
            <h1>App Watch</h1>
            <p>Monitor iOS App Store apps for new releases and Notify</p>
          </div>
        </div>
        <div className="header-right">
          {authStatus && authStatus.enabled && (
            <button 
              className="settings-icon-btn" 
              onClick={handleLogout} 
              aria-label="Logout"
              style={{ marginRight: '8px' }}
              title="Logout"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          )}
          <button className="settings-icon-btn" onClick={handleSettingsClick} aria-label="Settings">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>

      {message && (
        <div className={message.type === 'error' ? 'error' : 'success'}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleAddApp}>
          + Add App
        </button>
        <button className="btn btn-secondary" onClick={handleActivityClick}>
          📋 Activity
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="empty-state">
          <h3>No apps configured</h3>
          <p>Click "Add App" to start monitoring</p>
        </div>
      ) : (
        <div className="app-list">
          {apps.map(app => (
            <AppCard
              key={app.id}
              app={app}
              onEdit={handleEditApp}
              onDelete={handleDeleteApp}
              onCheck={handleCheckApp}
              onPost={handlePostApp}
              checking={checking[app.id]}
              posting={posting[app.id]}
            />
          ))}
        </div>
      )}

    </div>
  );
}

function AppCard({ app, onEdit, onDelete, onCheck, onPost, checking, posting }) {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await fetch(`${API_BASE}/api/apps/${app.id}/check`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.formatted_preview) {
        setPreview(data.formatted_preview);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="app-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {app.icon_url ? (
            <img 
              src={app.icon_url} 
              alt={app.name}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                objectFit: 'cover',
                flexShrink: 0
              }}
              onError={(e) => {
                // Fallback to default icon if image fails to load
                e.target.src = '/iosdefault.png';
              }}
            />
          ) : (
            <img 
              src="/iosdefault.png" 
              alt={app.name}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                objectFit: 'cover',
                flexShrink: 0
              }}
              onError={(e) => {
                // Final fallback to favicon if default icon fails
                e.target.style.display = 'none';
                const fallback = document.createElement('img');
                fallback.src = FAVICON_PATH;
                fallback.alt = app.name;
                fallback.style.cssText = 'width: 48px; height: 48px; border-radius: 10px; object-fit: contain; background-color: #e0e0e0; flex-shrink: 0;';
                e.target.parentNode.insertBefore(fallback, e.target);
              }}
            />
          )}
          <h2 style={{ margin: 0 }}>{app.name}</h2>
        </div>
        <span className={`status-badge ${app.enabled ? 'status-enabled' : 'status-disabled'}`}>
          {app.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <div className="app-info">
        <div className="info-item">
          <span className="info-label">App Store ID</span>
          <span className="info-value">{app.app_store_id}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Current Version</span>
          <span className="info-value">{app.current_version || 'Not checked'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Last Posted</span>
          <span className="info-value">{app.last_posted_version || 'Never'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Last Check</span>
          <span className="info-value">
            {app.last_check ? new Date(app.last_check).toLocaleString() : 'Never'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Notification Destinations</span>
          <span className="info-value" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            {(() => {
              const destinations = app.notification_destinations || [];
              // Check for legacy webhook_url (must be non-empty string)
              const hasLegacyWebhook = app.webhook_url && app.webhook_url.trim();
              
              if (destinations.length === 0 && !hasLegacyWebhook) {
                return '✗ Not configured';
              }
              
              if (destinations.length === 0 && hasLegacyWebhook) {
                // Legacy support
                return '✓ 1 Discord webhook (legacy)';
              }
              
              // Count valid destinations by type
              const validDestinations = destinations.filter(d => {
                if (['discord', 'slack', 'teams', 'generic'].includes(d.type)) {
                  return d.webhook_url && d.webhook_url.trim();
                } else if (d.type === 'telegram') {
                  return (d.bot_token && d.bot_token.trim()) && (d.chat_id && d.chat_id.trim());
                } else if (d.type === 'email') {
                  return d.email && d.email.trim() && (d.smtp_host && d.smtp_host.trim());
                }
                return false;
              });
              
              if (validDestinations.length === 0) {
                return '✗ Not configured';
              }
              
              // Count by type
              const counts = {};
              validDestinations.forEach(d => {
                counts[d.type] = (counts[d.type] || 0) + 1;
              });
              
              const parts = [];
              if (counts.discord) parts.push(`${counts.discord} Discord${counts.discord > 1 ? ' webhooks' : ' webhook'}`);
              if (counts.slack) parts.push(`${counts.slack} Slack${counts.slack > 1 ? ' webhooks' : ' webhook'}`);
              if (counts.telegram) parts.push(`${counts.telegram} Telegram${counts.telegram > 1 ? ' bots' : ' bot'}`);
              if (counts.teams) parts.push(`${counts.teams} Teams${counts.teams > 1 ? ' webhooks' : ' webhook'}`);
              if (counts.email) parts.push(`${counts.email} Email${counts.email > 1 ? ' addresses' : ' address'}`);
              if (counts.generic) parts.push(`${counts.generic} Generic${counts.generic > 1 ? ' webhooks' : ' webhook'}`);
              
              return parts.length > 0 ? `✓ ${parts.join(', ')}` : '✗ Not configured';
            })()}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Interval</span>
          <span className="info-value">{app.interval_override || 'Default (12h)'}</span>
        </div>
      </div>

      {preview && (
        <div>
          <strong>Preview:</strong>
          <div className="preview-box">{preview}</div>
        </div>
      )}

      <div className="button-group">
        <button
          className="btn btn-secondary"
          onClick={() => onCheck(app.id)}
          disabled={checking || posting}
        >
          {checking ? 'Checking...' : 'Check Now'}
        </button>
        <button
          className="btn btn-success"
          onClick={() => onPost(app.id)}
          disabled={checking || posting}
        >
          {posting ? 'Posting...' : 'Post Now'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={loadPreview}
          disabled={loadingPreview}
        >
          {loadingPreview ? 'Loading...' : 'Preview'}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onEdit(app)}
          disabled={checking || posting}
        >
          Edit
        </button>
        <button
          className="btn btn-danger"
          onClick={() => onDelete(app.id)}
          disabled={checking || posting}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Helper function to get webhook type instructions
const getWebhookInstructions = (type) => {
  const instructions = {
    discord: 'Go to Discord Server Settings → Integrations → Webhooks → New Webhook. Copy the webhook URL.',
    slack: 'Go to Slack App Settings → Incoming Webhooks → Add New Webhook. Copy the webhook URL (starts with https://hooks.slack.com/).',
    telegram: '1. Message @BotFather on Telegram to create a bot and get a bot token. 2. Get your chat ID by messaging @userinfobot. 3. Enter bot token (or set in Settings) and chat ID.',
    teams: 'Go to Microsoft Teams → Channel → Connectors → Incoming Webhook → Configure. Copy the webhook URL.',
    email: 'Enter recipient email address. SMTP settings can be configured in Settings or per destination.',
    generic: 'Enter any HTTP/HTTPS webhook URL. Optionally customize the JSON payload template.'
  };
  return instructions[type] || '';
};

function AddAppPage({ onSave, onCancel, message, showMessage, editingApp }) {
  // Initialize destinations from editingApp if provided
  const initializeDestinations = () => {
    if (editingApp?.notification_destinations && editingApp.notification_destinations.length > 0) {
      return editingApp.notification_destinations.map(dest => ({
        type: dest.type || '',
        webhook_url: dest.webhook_url || '',
        bot_token: dest.bot_token || '',
        chat_id: dest.chat_id || '',
        email: dest.email || '',
        smtp_host: dest.smtp_host || '',
        smtp_port: dest.smtp_port || '',
        smtp_user: dest.smtp_user || '',
        smtp_password: dest.smtp_password || '',
        smtp_from: dest.smtp_from || '',
        payload_template: dest.payload_template || ''
      }));
    } else if (editingApp?.webhook_url) {
      // Legacy support - convert old webhook_url to new format
      return [{ type: 'discord', webhook_url: editingApp.webhook_url }];
    }
    return [{ type: '', webhook_url: '', bot_token: '', chat_id: '', email: '', smtp_host: '', smtp_port: '', smtp_user: '', smtp_password: '', smtp_from: '', payload_template: '' }];
  };

  const [formData, setFormData] = useState({
    name: editingApp?.name || '',
    app_store_id: editingApp?.app_store_id || '',
    interval_override: editingApp?.interval_override || '',
    enabled: editingApp?.enabled !== false,
    icon_url: editingApp?.icon_url || ''
  });

  const [errors, setErrors] = useState({});
  const [destinations, setDestinations] = useState(initializeDestinations);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [suggestedName, setSuggestedName] = useState('');
  
  useEffect(() => {
    // Update document title
    document.title = editingApp ? 'Edit App - App Watch' : 'Add New App - App Watch';
    
    // Load default monitoring setting only if not editing
    if (!editingApp) {
      const loadDefaultSettings = async () => {
        try {
          const response = await fetch(`${API_BASE}/api/settings`, { headers: getAuthHeaders() });
          if (response.ok) {
            const settings = await response.json();
            setFormData(prev => ({
              ...prev,
              enabled: settings.monitoring_enabled_by_default !== false
            }));
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      };
      
      loadDefaultSettings();
    }
    
    return () => {
      document.title = 'App Watch';
    };
  }, [editingApp]);

  // Auto-fetch metadata when App Store ID changes
  useEffect(() => {
    const appStoreId = formData.app_store_id.trim();
    
    // Only fetch if we have a valid App Store ID and it's different from the editing app
    if (appStoreId && /^\d+$/.test(appStoreId)) {
      // Don't fetch if editing and ID hasn't changed
      if (editingApp && editingApp.app_store_id === appStoreId) {
        return;
      }
      
      // Debounce the fetch
      const timeoutId = setTimeout(async () => {
        setFetchingMetadata(true);
        try {
          const response = await fetch(`${API_BASE}/api/apps/metadata/${appStoreId}`, { headers: getAuthHeaders() });
          if (response.ok) {
            const metadata = await response.json();
            // Update icon automatically
            if (metadata.artworkUrl) {
              setFormData(prev => ({
                ...prev,
                icon_url: metadata.artworkUrl
              }));
            }
            // Suggest app name (only if name field is empty)
            if (metadata.trackName) {
              setSuggestedName(metadata.trackName);
              // Auto-fill name if it's empty
              setFormData(prev => {
                if (!prev.name.trim()) {
                  return {
                    ...prev,
                    name: metadata.trackName
                  };
                }
                return prev;
              });
            }
          } else {
            // API failed - clear suggestions and use default icon
            setSuggestedName('');
            setFormData(prev => ({
              ...prev,
              icon_url: '' // Will use default icon
            }));
          }
        } catch (error) {
          // API failed - clear suggestions and use default icon
          setSuggestedName('');
          setFormData(prev => ({
            ...prev,
            icon_url: '' // Will use default icon
          }));
        } finally {
          setFetchingMetadata(false);
        }
      }, 800); // 800ms debounce
      
      return () => clearTimeout(timeoutId);
    } else {
      // Invalid ID - clear suggestions
      setSuggestedName('');
      setFormData(prev => ({
        ...prev,
        icon_url: ''
      }));
    }
  }, [formData.app_store_id, editingApp]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'App Name is required';
    }
    
    if (!formData.app_store_id.trim()) {
      newErrors.app_store_id = 'App Store ID is required';
    } else if (!/^\d+$/.test(formData.app_store_id.trim())) {
      newErrors.app_store_id = 'App Store ID must be a number';
    }
    
    // Validate notification destinations
    destinations.forEach((dest, index) => {
      if (dest.type) {
        if (['discord', 'slack', 'teams', 'generic'].includes(dest.type)) {
          if (!dest.webhook_url || !dest.webhook_url.trim()) {
            newErrors[`dest_${index}_webhook_url`] = `${dest.type.charAt(0).toUpperCase() + dest.type.slice(1)} webhook URL is required`;
          } else if (dest.type === 'discord' && !dest.webhook_url.trim().startsWith('https://discord.com/api/webhooks/')) {
            newErrors[`dest_${index}_webhook_url`] = 'Invalid Discord webhook URL';
          } else if (dest.type === 'slack' && !dest.webhook_url.trim().startsWith('https://hooks.slack.com/')) {
            newErrors[`dest_${index}_webhook_url`] = 'Invalid Slack webhook URL';
          } else if (dest.type === 'generic' && !dest.webhook_url.trim().startsWith('http://') && !dest.webhook_url.trim().startsWith('https://')) {
            newErrors[`dest_${index}_webhook_url`] = 'Invalid webhook URL (must start with http:// or https://)';
          }
          
          // Validate payload_template for generic webhooks
          if (dest.type === 'generic' && dest.payload_template && dest.payload_template.trim()) {
            try {
              JSON.parse(dest.payload_template);
            } catch (e) {
              newErrors[`dest_${index}_payload_template`] = 'Invalid JSON in payload template';
            }
          }
        } else if (dest.type === 'telegram') {
          if (!dest.bot_token || !dest.bot_token.trim()) {
            newErrors[`dest_${index}_bot_token`] = 'Telegram bot token is required (or set in Settings)';
          }
          if (!dest.chat_id || !dest.chat_id.trim()) {
            newErrors[`dest_${index}_chat_id`] = 'Telegram chat ID is required';
          }
        } else if (dest.type === 'email') {
          if (!dest.email || !dest.email.trim()) {
            newErrors[`dest_${index}_email`] = 'Email address is required';
          } else if (!dest.email.includes('@') || !dest.email.split('@')[1] || !dest.email.split('@')[1].includes('.')) {
            newErrors[`dest_${index}_email`] = 'Invalid email address format';
          }
          if (!dest.smtp_host || !dest.smtp_host.trim()) {
            newErrors[`dest_${index}_smtp_host`] = 'SMTP host is required (or set in Settings)';
          }
        }
      }
    });
    
    if (formData.interval_override.trim()) {
      // Validate interval format
      const intervalRegex = /^\d+[hmsd]$/i;
      if (!intervalRegex.test(formData.interval_override.trim())) {
        newErrors.interval_override = 'Invalid interval format. Use format like: 6h, 30m, 1d';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    // Basic validation - name and app_store_id are required
    if (!formData.name.trim() || !formData.app_store_id.trim() || !/^\d+$/.test(formData.app_store_id.trim())) {
      return false;
    }
    
    // Validate interval if provided
    if (formData.interval_override.trim() && !/^\d+[hmsd]$/i.test(formData.interval_override.trim())) {
      return false;
    }
    
    // Validate destinations - if a type is selected, required fields must be valid
    for (const dest of destinations) {
      if (dest.type) {
        if (['discord', 'slack', 'teams', 'generic'].includes(dest.type)) {
          if (!dest.webhook_url || !dest.webhook_url.trim()) return false;
          if (dest.type === 'discord' && !dest.webhook_url.trim().startsWith('https://discord.com/api/webhooks/')) return false;
          if (dest.type === 'slack' && !dest.webhook_url.trim().startsWith('https://hooks.slack.com/')) return false;
          if (dest.type === 'generic' && !dest.webhook_url.trim().startsWith('http://') && !dest.webhook_url.trim().startsWith('https://')) return false;
          if (dest.type === 'generic' && dest.payload_template && dest.payload_template.trim()) {
            try { JSON.parse(dest.payload_template); } catch { return false; }
          }
        } else if (dest.type === 'telegram') {
          if (!dest.bot_token || !dest.bot_token.trim()) return false;
          if (!dest.chat_id || !dest.chat_id.trim()) return false;
        } else if (dest.type === 'email') {
          if (!dest.email || !dest.email.trim() || !dest.email.includes('@')) return false;
          if (!dest.smtp_host || !dest.smtp_host.trim()) return false;
        }
      }
    }
    
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDestinationTypeChange = (index, value) => {
    setDestinations(prev => {
      const newDests = [...prev];
      // Preserve existing values when changing type
      const existing = newDests[index] || {};
      newDests[index] = { 
        type: value, 
        webhook_url: existing.webhook_url || '',
        bot_token: existing.bot_token || '',
        chat_id: existing.chat_id || '',
        email: existing.email || '',
        smtp_host: existing.smtp_host || '',
        smtp_port: existing.smtp_port || '',
        smtp_user: existing.smtp_user || '',
        smtp_password: existing.smtp_password || '',
        smtp_from: existing.smtp_from || '',
        payload_template: existing.payload_template || ''
      };
      
      // If a destination is selected and it's not the last one, add a new empty destination
      if (value && index === newDests.length - 1) {
        newDests.push({ type: '', webhook_url: '', bot_token: '', chat_id: '', email: '', smtp_host: '', smtp_port: '', smtp_user: '', smtp_password: '', smtp_from: '', payload_template: '' });
      }
      
      // Remove empty destinations at the end (except the last one)
      while (newDests.length > 1 && !newDests[newDests.length - 2].type && !newDests[newDests.length - 1].type) {
        newDests.pop();
      }
      
      return newDests;
    });
    
    // Clear errors
    Object.keys(errors).forEach(key => {
      if (key.startsWith(`dest_${index}_`)) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    });
  };

  const handleDestinationFieldChange = (index, field, value) => {
    setDestinations(prev => {
      const newDests = [...prev];
      newDests[index] = { ...newDests[index], [field]: value };
      return newDests;
    });
    
    // Clear error when user starts typing
    const errorKey = `dest_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showMessage('Please fill in all required fields correctly', 'error');
      return;
    }

    // Build notification destinations array - only include destinations with a type
    const notificationDestinations = destinations
      .filter(dest => dest.type)
      .map(dest => {
        const result = { type: dest.type };
        
        // Add fields based on type
        if (['discord', 'slack', 'teams', 'generic'].includes(dest.type)) {
          if (dest.webhook_url) result.webhook_url = dest.webhook_url.trim();
          if (dest.type === 'generic' && dest.payload_template) {
            result.payload_template = dest.payload_template.trim();
          }
        } else if (dest.type === 'telegram') {
          if (dest.bot_token) result.bot_token = dest.bot_token.trim();
          if (dest.chat_id) result.chat_id = dest.chat_id.trim();
        } else if (dest.type === 'email') {
          if (dest.email) result.email = dest.email.trim();
          if (dest.smtp_host) result.smtp_host = dest.smtp_host.trim();
          if (dest.smtp_port) result.smtp_port = dest.smtp_port.trim();
          if (dest.smtp_user) result.smtp_user = dest.smtp_user.trim();
          if (dest.smtp_password) result.smtp_password = dest.smtp_password.trim();
          if (dest.smtp_from) result.smtp_from = dest.smtp_from.trim();
        }
        
        return result;
      });

    const submitData = {
      ...formData,
      notification_destinations: notificationDestinations
    };
    
    // Include app ID if editing
    if (editingApp) {
      submitData.id = editingApp.id;
    }
    
    await onSave(submitData);
  };

  return (
    <div className="add-app-page-wrapper">
      <div className="add-app-header">
        <button className="close-button" onClick={onCancel} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h1>{editingApp ? 'Edit App' : 'Add New App'}</h1>
      </div>

      <div className="add-app-content">
        <div className="add-app-form-section">
          {message && (
            <div className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`}>
              {message.text}
            </div>
          )}

          <div className="form-prompt">
            <h2>{editingApp ? 'Edit your app details' : "Let's start with the details for your app"}</h2>
            <p className="form-subtitle">{editingApp ? 'Update the information below to modify app monitoring settings' : 'Fill in the information below to start monitoring app releases'}</p>
          </div>

          <form onSubmit={handleSubmit} className="add-app-form">
            <div className="form-group">
              <label htmlFor="name">App Name (*)</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={suggestedName || "Enter your app name"}
                className={errors.name ? 'error-input' : ''}
              />
              {suggestedName && !formData.name && (
                <small style={{ color: '#666', fontStyle: 'italic', display: 'block', marginTop: '5px' }}>
                  Suggested: {suggestedName} (from App Store)
                </small>
              )}
              {fetchingMetadata && (
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                  Fetching app info...
                </small>
              )}
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="app_store_id">App Store ID (*)</label>
              <div className="input-with-hint">
                <input
                  type="text"
                  id="app_store_id"
                  name="app_store_id"
                  value={formData.app_store_id}
                  onChange={handleChange}
                  placeholder="Enter your App Store ID"
                  className={errors.app_store_id ? 'error-input' : ''}
                  disabled={fetchingMetadata}
                />
                {formData.app_store_id && !errors.app_store_id && (
                  <span className="input-hint">ID: {formData.app_store_id}</span>
                )}
              </div>
              {errors.app_store_id && <span className="error-text">{errors.app_store_id}</span>}
              <small>Find this in the App Store URL: apps.apple.com/app/id123456789. App name and icon will be fetched automatically.</small>
            </div>

            <div className="form-group">
              <label>Notification Destinations (optional)</label>
              <small style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                Add one or more notification destinations. You can add multiple destinations of the same type.
              </small>
              {destinations.map((dest, index) => (
                <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label htmlFor={`destination_type_${index}`}>
                      {index === 0 ? 'Notification Destination' : `Additional Destination ${index + 1}`}
                    </label>
                    <select
                      id={`destination_type_${index}`}
                      value={dest.type}
                      onChange={(e) => handleDestinationTypeChange(index, e.target.value)}
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    >
                      <option value="">Select a destination (optional)</option>
                      <option value="discord">Discord</option>
                      <option value="slack">Slack</option>
                      <option value="telegram">Telegram</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="email">Email (SMTP)</option>
                      <option value="generic">Generic Webhook</option>
                    </select>
                    {dest.type && (
                      <small style={{ display: 'block', marginTop: '5px', color: '#666', fontStyle: 'italic' }}>
                        {getWebhookInstructions(dest.type)}
                      </small>
                    )}
                  </div>
                  
                  {dest.type === 'discord' && (
                    <div>
                      <label htmlFor={`webhook_url_${index}`}>Discord Webhook URL *</label>
                      <input
                        type="url"
                        id={`webhook_url_${index}`}
                        value={dest.webhook_url || ''}
                        onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className={errors[`dest_${index}_webhook_url`] ? 'error-input' : ''}
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                      />
                      {errors[`dest_${index}_webhook_url`] && (
                        <span className="error-text">{errors[`dest_${index}_webhook_url`]}</span>
                      )}
                    </div>
                  )}
                  
                  {dest.type === 'slack' && (
                    <div>
                      <label htmlFor={`webhook_url_${index}`}>Slack Webhook URL *</label>
                      <input
                        type="url"
                        id={`webhook_url_${index}`}
                        value={dest.webhook_url || ''}
                        onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className={errors[`dest_${index}_webhook_url`] ? 'error-input' : ''}
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                      />
                      {errors[`dest_${index}_webhook_url`] && (
                        <span className="error-text">{errors[`dest_${index}_webhook_url`]}</span>
                      )}
                    </div>
                  )}
                  
                  {dest.type === 'telegram' && (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <label htmlFor={`bot_token_${index}`}>Bot Token *</label>
                        <input
                          type="text"
                          id={`bot_token_${index}`}
                          value={dest.bot_token || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'bot_token', e.target.value)}
                          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                          className={errors[`dest_${index}_bot_token`] ? 'error-input' : ''}
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          Get from @BotFather on Telegram. Can also be set in Settings for all apps.
                        </small>
                        {errors[`dest_${index}_bot_token`] && (
                          <span className="error-text">{errors[`dest_${index}_bot_token`]}</span>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`chat_id_${index}`}>Chat ID *</label>
                        <input
                          type="text"
                          id={`chat_id_${index}`}
                          value={dest.chat_id || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'chat_id', e.target.value)}
                          placeholder="123456789"
                          className={errors[`dest_${index}_chat_id`] ? 'error-input' : ''}
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          Get from @userinfobot on Telegram or from message updates.
                        </small>
                        {errors[`dest_${index}_chat_id`] && (
                          <span className="error-text">{errors[`dest_${index}_chat_id`]}</span>
                        )}
                      </div>
                    </>
                  )}
                  
                  {dest.type === 'teams' && (
                    <div>
                      <label htmlFor={`webhook_url_${index}`}>Microsoft Teams Webhook URL *</label>
                      <input
                        type="url"
                        id={`webhook_url_${index}`}
                        value={dest.webhook_url || ''}
                        onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                        placeholder="https://outlook.office.com/webhook/..."
                        className={errors[`dest_${index}_webhook_url`] ? 'error-input' : ''}
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                      />
                      {errors[`dest_${index}_webhook_url`] && (
                        <span className="error-text">{errors[`dest_${index}_webhook_url`]}</span>
                      )}
                    </div>
                  )}
                  
                  {dest.type === 'email' && (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <label htmlFor={`email_${index}`}>Email Address *</label>
                        <input
                          type="email"
                          id={`email_${index}`}
                          value={dest.email || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'email', e.target.value)}
                          placeholder="recipient@example.com"
                          className={errors[`dest_${index}_email`] ? 'error-input' : ''}
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                        {errors[`dest_${index}_email`] && (
                          <span className="error-text">{errors[`dest_${index}_email`]}</span>
                        )}
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label htmlFor={`smtp_host_${index}`}>SMTP Host *</label>
                        <input
                          type="text"
                          id={`smtp_host_${index}`}
                          value={dest.smtp_host || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'smtp_host', e.target.value)}
                          placeholder="smtp.gmail.com"
                          className={errors[`dest_${index}_smtp_host`] ? 'error-input' : ''}
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          Can also be set in Settings for all apps.
                        </small>
                        {errors[`dest_${index}_smtp_host`] && (
                          <span className="error-text">{errors[`dest_${index}_smtp_host`]}</span>
                        )}
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label htmlFor={`smtp_port_${index}`}>SMTP Port</label>
                        <input
                          type="text"
                          id={`smtp_port_${index}`}
                          value={dest.smtp_port || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'smtp_port', e.target.value)}
                          placeholder="587"
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label htmlFor={`smtp_user_${index}`}>SMTP Username</label>
                        <input
                          type="text"
                          id={`smtp_user_${index}`}
                          value={dest.smtp_user || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'smtp_user', e.target.value)}
                          placeholder="your-email@example.com"
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          Can also be set in Settings for all apps.
                        </small>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label htmlFor={`smtp_password_${index}`}>SMTP Password</label>
                        <input
                          type="password"
                          id={`smtp_password_${index}`}
                          value={dest.smtp_password || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'smtp_password', e.target.value)}
                          placeholder="Your SMTP password"
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          Can also be set in Settings for all apps.
                        </small>
                      </div>
                      <div>
                        <label htmlFor={`smtp_from_${index}`}>From Address</label>
                        <input
                          type="email"
                          id={`smtp_from_${index}`}
                          value={dest.smtp_from || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'smtp_from', e.target.value)}
                          placeholder="sender@example.com"
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                      </div>
                    </>
                  )}
                  
                  {dest.type === 'generic' && (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <label htmlFor={`webhook_url_${index}`}>Webhook URL *</label>
                        <input
                          type="url"
                          id={`webhook_url_${index}`}
                          value={dest.webhook_url || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                          placeholder="https://example.com/webhook"
                          className={errors[`dest_${index}_webhook_url`] ? 'error-input' : ''}
                          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                        {errors[`dest_${index}_webhook_url`] && (
                          <span className="error-text">{errors[`dest_${index}_webhook_url`]}</span>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`payload_template_${index}`}>Custom Payload Template (JSON, optional)</label>
                        <textarea
                          id={`payload_template_${index}`}
                          value={dest.payload_template || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'payload_template', e.target.value)}
                          placeholder='{"app": "{{app_name}}", "version": "{{version}}", "notes": "{{release_notes}}"}'
                          rows="4"
                          style={{ width: '100%', padding: '8px', marginTop: '5px', fontFamily: 'monospace' }}
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          Use placeholders: {'{{app_name}}'}, {'{{version}}'}, {'{{release_notes}}'}, {'{{formatted_content}}'}
                        </small>
                        {errors[`dest_${index}_payload_template`] && (
                          <span className="error-text">{errors[`dest_${index}_payload_template`]}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="form-group">
              <label htmlFor="interval_override">Check Interval (optional)</label>
              <input
                type="text"
                id="interval_override"
                name="interval_override"
                value={formData.interval_override}
                onChange={handleChange}
                placeholder="6h, 30m, 1d"
                className={errors.interval_override ? 'error-input' : ''}
              />
              {errors.interval_override && <span className="error-text">{errors.interval_override}</span>}
              <small>Override default interval (e.g., 6h, 30m, 1d). Leave empty for default.</small>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="enabled"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                />
                <label htmlFor="enabled">Enable Monitoring</label>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={!isFormValid()}
              >
                {editingApp ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

function SettingsPage({ onCancel, message, showMessage }) {
  const [settings, setSettings] = useState({
    default_interval: '12h',
    monitoring_enabled_by_default: true,
    auto_post_on_update: false,
    telegram_bot_token: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
    smtp_use_tls: true,
    version: '1.8.5', // Will be loaded from backend
    api_key: '' // Will be loaded from auth status
  });
  const [apiKey, setApiKey] = useState('');
  const [regeneratingApiKey, setRegeneratingApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadSettings();
    loadApiKey();
    document.title = 'Settings - App Watch';
    return () => {
      document.title = 'App Watch';
    };
  }, []);

  const loadApiKey = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/status`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.api_key || '');
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate the API key? This will invalidate the current key and any scripts using it will need to be updated.')) {
      return;
    }

    try {
      setRegeneratingApiKey(true);
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };
      const response = await fetch(`${API_BASE}/api/auth/api-key/regenerate`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setApiKey(data.api_key);
        showMessage('API key regenerated successfully', 'success');
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Failed to regenerate API key', 'error');
      }
    } catch (error) {
      showMessage('Error regenerating API key: ' + error.message, 'error');
    } finally {
      setRegeneratingApiKey(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/settings`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        showMessage('Failed to load settings', 'error');
      }
    } catch (error) {
      showMessage('Error loading settings: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateInterval = (interval) => {
    if (!interval || !interval.trim()) {
      return 'Interval is required';
    }
    const intervalRegex = /^\d+[hmsd]$/i;
    if (!intervalRegex.test(interval.trim())) {
      return 'Invalid interval format. Use format like: 6h, 30m, 1d';
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const newErrors = {};
    const intervalError = validateInterval(settings.default_interval);
    if (intervalError) {
      newErrors.default_interval = intervalError;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showMessage('Please fix the errors before saving', 'error');
      return;
    }

    try {
      setSaving(true);
      // Don't send version to backend
      const { version, ...settingsToSave } = settings;
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settingsToSave)
      });

      if (response.ok) {
        showMessage('Settings saved successfully');
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      showMessage('Error saving settings: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-page-wrapper">
      <div className="settings-header">
        <button className="close-button" onClick={onCancel} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <div className="settings-form-section">
          {message && (
            <div className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`}>
              {message.text}
            </div>
          )}

          <div className="form-prompt">
            <h2>Configure Application Settings</h2>
            <p className="form-subtitle">Customize default behavior for monitoring apps</p>
          </div>

          <form onSubmit={handleSubmit} className="settings-form">
            {/* General Settings Section */}
            <div className="settings-section">
              <h3 className="settings-section-title">General Settings</h3>
              <p className="settings-section-description">Configure default behavior and monitoring preferences</p>
              
              <div className="form-group">
                <label htmlFor="default_interval">Default Check Interval (*)</label>
                <input
                  type="text"
                  id="default_interval"
                  name="default_interval"
                  value={settings.default_interval}
                  onChange={handleChange}
                  placeholder="12h"
                  className={errors.default_interval ? 'error-input' : ''}
                />
                {errors.default_interval && <span className="error-text">{errors.default_interval}</span>}
                <small>Default interval for checking app updates (e.g., 6h, 30m, 1d). This applies to new apps unless overridden.</small>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="monitoring_enabled_by_default"
                    name="monitoring_enabled_by_default"
                    checked={settings.monitoring_enabled_by_default}
                    onChange={handleChange}
                  />
                  <label htmlFor="monitoring_enabled_by_default">Enable Monitoring by Default</label>
                </div>
                <small>When enabled, new apps will have monitoring turned on automatically.</small>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="auto_post_on_update"
                    name="auto_post_on_update"
                    checked={settings.auto_post_on_update}
                    onChange={handleChange}
                  />
                  <label htmlFor="auto_post_on_update">Auto-Post Notifications on Update</label>
                </div>
                <small>Automatically send notifications to all configured destinations when a new version is detected (in addition to checking).</small>
              </div>
            </div>

            {/* Webhook Settings Section */}
            <div className="settings-section">
              <h3 className="settings-section-title">Webhook Settings</h3>
              <p className="settings-section-description">
                These settings can be used as defaults for all apps. Individual apps can override these values.
              </p>
              
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="telegram_bot_token">Telegram Bot Token</label>
                <input
                  type="text"
                  id="telegram_bot_token"
                  name="telegram_bot_token"
                  value={settings.telegram_bot_token || ''}
                  onChange={handleChange}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Get from @BotFather on Telegram. This will be used for all Telegram notifications unless overridden per app.
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="smtp_host">SMTP Host</label>
                <input
                  type="text"
                  id="smtp_host"
                  name="smtp_host"
                  value={settings.smtp_host || ''}
                  onChange={handleChange}
                  placeholder="smtp.gmail.com"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Default SMTP server for email notifications (e.g., smtp.gmail.com, smtp.outlook.com).
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="smtp_port">SMTP Port</label>
                <input
                  type="text"
                  id="smtp_port"
                  name="smtp_port"
                  value={settings.smtp_port || ''}
                  onChange={handleChange}
                  placeholder="587"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Default SMTP port (usually 587 for TLS, 465 for SSL, 25 for unencrypted).
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="smtp_user">SMTP Username</label>
                <input
                  type="text"
                  id="smtp_user"
                  name="smtp_user"
                  value={settings.smtp_user || ''}
                  onChange={handleChange}
                  placeholder="your-email@example.com"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Default SMTP username for authentication.
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="smtp_password">SMTP Password</label>
                <input
                  type="password"
                  id="smtp_password"
                  name="smtp_password"
                  value={settings.smtp_password || ''}
                  onChange={handleChange}
                  placeholder="Your SMTP password"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Default SMTP password. For Gmail, use an App Password.
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="smtp_from">Default From Email Address</label>
                <input
                  type="email"
                  id="smtp_from"
                  name="smtp_from"
                  value={settings.smtp_from || ''}
                  onChange={handleChange}
                  placeholder="sender@example.com"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Default sender email address for email notifications.
                </small>
              </div>

              <div className="checkbox-group" style={{ marginBottom: '15px' }}>
                <input
                  type="checkbox"
                  id="smtp_use_tls"
                  name="smtp_use_tls"
                  checked={settings.smtp_use_tls !== false}
                  onChange={handleChange}
                />
                <label htmlFor="smtp_use_tls">Use TLS for SMTP</label>
              </div>
            </div>

            {/* Security Settings Section */}
            <div className="settings-section">
              <h3 className="settings-section-title">Security Settings</h3>
              <p className="settings-section-description">
                Manage authentication and API access for your application
              </p>
              
              <div className="form-group">
                <label htmlFor="api_key">API Key</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    id="api_key"
                    value={apiKey}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      background: '#f8f9fa',
                      cursor: 'text'
                    }}
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRegenerateApiKey}
                    disabled={regeneratingApiKey}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {regeneratingApiKey ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
                <small>
                  Use this API key for programmatic access. Include it in the <code>X-Api-Key</code> header or as a Bearer token in the <code>Authorization</code> header.
                  <br />
                  <strong>Warning:</strong> Regenerating will invalidate the current key.
                </small>
              </div>

              <div className="form-group">
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                  <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '14px' }}>
                    Authentication is configured and enabled. To change authentication settings, you may need to modify the configuration file directly or reset authentication.
                  </p>
                  <p style={{ margin: 0, color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                    Note: Security settings are managed through the authentication system. Changes to authentication require re-authentication.
                  </p>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={saving || Object.keys(errors).length > 0}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-large"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="version-info">
            <div className="version-label">Version</div>
            <div className="version-value">{settings.version || '1.8.5'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingPage({ onSetup, message, showMessage }) {
  const [formData, setFormData] = useState({
    auth_type: 'forms',
    username: '',
    password: '',
    confirm_password: '',
    bypass_local_networks: false
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }
    
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showMessage('Please fix the errors before continuing', 'error');
      return;
    }

    setSubmitting(true);
    const result = await onSetup(formData);
    setSubmitting(false);

    if (!result.success) {
      showMessage(result.error || 'Setup failed', 'error');
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-content">
        <div className="auth-form-section">
          <div className="auth-header">
            <div className="logo">
              <img src={FAVICON_PATH} alt="App Watch" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            </div>
            <h1>Welcome to App Watch</h1>
            <p className="auth-subtitle">Let's set up authentication to secure your application</p>
          </div>

          {message && (
            <div className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth_type">Authentication Type</label>
              <select
                id="auth_type"
                name="auth_type"
                value={formData.auth_type}
                onChange={handleChange}
                className="auth-select"
              >
                <option value="forms">Forms (Login Page)</option>
                <option value="basic">Basic (Browser Popup)</option>
              </select>
              <small>
                {formData.auth_type === 'forms' 
                  ? 'Users will see a login page when accessing the application.'
                  : 'Users will see a browser authentication popup when accessing the application.'}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className={errors.username ? 'error-input' : ''}
              />
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={errors.password ? 'error-input' : ''}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
              <small>Password must be at least 3 characters long</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirm_password">Confirm Password *</label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={errors.confirm_password ? 'error-input' : ''}
              />
              {errors.confirm_password && <span className="error-text">{errors.confirm_password}</span>}
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="bypass_local_networks"
                  name="bypass_local_networks"
                  checked={formData.bypass_local_networks}
                  onChange={handleChange}
                />
                <label htmlFor="bypass_local_networks">Bypass authentication for local networks</label>
              </div>
              <small>When enabled, users accessing from local/private networks won't need to authenticate</small>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={submitting || Object.keys(errors).length > 0}
              >
                {submitting ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ActivityPage({ onCancel, apps, message, showMessage }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    event_type: '',
    app_id: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    loadHistory();
    document.title = 'Activity - App Watch';
    return () => {
      document.title = 'App Watch';
    };
  }, []);

  const loadHistory = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '200');
      
      if (filterParams.event_type || filters.event_type) {
        params.append('event_type', filterParams.event_type || filters.event_type);
      }
      if (filterParams.app_id || filters.app_id) {
        params.append('app_id', filterParams.app_id || filters.app_id);
      }
      if (filterParams.status || filters.status) {
        params.append('status', filterParams.status || filters.status);
      }

      const response = await fetch(`${API_BASE}/api/history?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      } else {
        showMessage('Failed to load activity history', 'error');
      }
    } catch (error) {
      showMessage('Error loading activity history: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    loadHistory(newFilters);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      default:
        return '#17a2b8';
    }
  };

  const getEventTypeLabel = (eventType) => {
    const labels = {
      'check': 'Check',
      'post': 'Post',
      'app_created': 'App Created',
      'app_updated': 'App Updated',
      'app_deleted': 'App Deleted',
      'app_enabled': 'App Enabled',
      'app_disabled': 'App Disabled',
      'settings_updated': 'Settings Updated'
    };
    return labels[eventType] || eventType;
  };

  const filteredHistory = history.filter(entry => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        entry.message?.toLowerCase().includes(searchLower) ||
        entry.app_name?.toLowerCase().includes(searchLower) ||
        entry.event_type?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading activity history...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Activity History</h1>
        <button className="btn btn-secondary" onClick={onCancel}>
          ← Back to Dashboard
        </button>
      </div>

      {message && (
        <div className={message.type === 'error' ? 'error' : 'success'}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Event Type</label>
          <select
            value={filters.event_type}
            onChange={(e) => handleFilterChange('event_type', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">All Events</option>
            <option value="check">Check</option>
            <option value="post">Post</option>
            <option value="app_created">App Created</option>
            <option value="app_updated">App Updated</option>
            <option value="app_deleted">App Deleted</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>App</label>
          <select
            value={filters.app_id}
            onChange={(e) => handleFilterChange('app_id', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">All Apps</option>
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search messages..."
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <div className="empty-state">
          <h3>No activity found</h3>
          <p>Activity history will appear here as you use the application</p>
        </div>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Event</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>App</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((entry) => (
                <tr 
                  key={entry.id} 
                  style={{ 
                    borderBottom: '1px solid #dee2e6',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: '#e9ecef',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {getEventTypeLabel(entry.event_type)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {entry.app_name || '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: getStatusColor(entry.status) + '20',
                      color: getStatusColor(entry.status),
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {getStatusIcon(entry.status)} {entry.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {entry.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LoginPage({ onLogin, authType, message, showMessage }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password) {
      setErrors({
        username: !formData.username.trim() ? 'Username is required' : '',
        password: !formData.password ? 'Password is required' : ''
      });
      return;
    }

    setSubmitting(true);
    const result = await onLogin(formData.username, formData.password);
    setSubmitting(false);

    if (!result.success) {
      showMessage(result.error || 'Login failed', 'error');
      setErrors({ password: result.error || 'Invalid credentials' });
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-content">
        <div className="auth-form-section">
          <div className="auth-header">
            <div className="logo">
              <img src={FAVICON_PATH} alt="App Watch" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            </div>
            <h1>App Watch</h1>
            <p className="auth-subtitle">Please sign in to continue</p>
          </div>

          {message && (
            <div className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className={errors.username ? 'error-input' : ''}
                autoFocus
              />
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={errors.password ? 'error-input' : ''}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;


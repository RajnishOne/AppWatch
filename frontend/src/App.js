import React, { useState, useEffect } from 'react';
import './index.css';

const API_BASE = window.location.origin;

function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'add-app', 'edit-app', or 'settings'
  const [editingApp, setEditingApp] = useState(null);
  const [message, setMessage] = useState(null);
  const [checking, setChecking] = useState({});
  const [posting, setPosting] = useState({});

  useEffect(() => {
    loadApps();
    
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
          fetch(`${API_BASE}/api/apps`)
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
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/apps`);
      if (response.ok) {
        const data = await response.json();
        setApps(data);
      } else {
        showMessage('Failed to load apps', 'error');
      }
    } catch (error) {
      showMessage('Error loading apps: ' + error.message, 'error');
    } finally {
      setLoading(false);
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
      const response = await fetch(`${API_BASE}/api/apps/${appId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showMessage('App deleted successfully');
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
      const response = await fetch(`${API_BASE}/api/apps/${appId}/check`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          showMessage(data.message || 'Check completed');
        } else {
          showMessage(data.error || 'Check failed', 'error');
        }
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
      const response = await fetch(`${API_BASE}/api/apps/${appId}/post`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          showMessage(data.message || 'Posted to Discord');
        } else {
          showMessage(data.error || 'Post failed', 'error');
        }
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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showMessage(appId ? 'App updated successfully' : 'App added successfully');
        setCurrentPage('dashboard');
        setEditingApp(null);
        window.history.pushState({ page: 'dashboard' }, '', '/');
        loadApps();
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to save app', 'error');
      }
    } catch (error) {
      showMessage('Error saving app: ' + error.message, 'error');
    }
  };

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

  const handleSettingsClick = () => {
    setCurrentPage('settings');
    window.history.pushState({ page: 'settings' }, '', '/settings');
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <div className="logo">📱</div>
          <div className="header-text">
            <h1>App Watch</h1>
            <p>Monitor iOS App Store apps for new releases and Notify</p>
          </div>
        </div>
        <div className="header-right">
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

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={handleAddApp}>
          + Add App
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
        method: 'POST'
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
                // Final fallback to emoji if default icon fails
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.style.cssText = 'width: 48px; height: 48px; border-radius: 10px; background-color: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;';
                fallback.textContent = '📱';
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
              
              // Count valid destinations (with webhook URLs)
              const validDestinations = destinations.filter(d => {
                if (d.type === 'discord') {
                  return d.webhook_url && d.webhook_url.trim();
                }
                return false;
              });
              
              if (validDestinations.length === 0) {
                return '✗ Not configured';
              }
              
              const discordCount = validDestinations.filter(d => d.type === 'discord').length;
              const parts = [];
              if (discordCount > 0) {
                parts.push(`${discordCount} Discord${discordCount > 1 ? ' webhooks' : ' webhook'}`);
              }
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

function AddAppPage({ onSave, onCancel, message, showMessage, editingApp }) {
  // Initialize destinations from editingApp if provided
  const initializeDestinations = () => {
    if (editingApp?.notification_destinations && editingApp.notification_destinations.length > 0) {
      return editingApp.notification_destinations.map(dest => ({
        type: dest.type || 'discord',
        webhook_url: dest.webhook_url || ''
      }));
    } else if (editingApp?.webhook_url) {
      // Legacy support - convert old webhook_url to new format
      return [{ type: 'discord', webhook_url: editingApp.webhook_url }];
    }
    return [{ type: '', webhook_url: '' }];
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
          const response = await fetch(`${API_BASE}/api/settings`);
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
          const response = await fetch(`${API_BASE}/api/apps/metadata/${appStoreId}`);
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
        if (dest.type === 'discord' && !dest.webhook_url.trim()) {
          newErrors[`webhook_${index}`] = 'Discord Webhook URL is required when Discord is selected';
        } else if (dest.type === 'discord' && dest.webhook_url.trim() && 
                   !dest.webhook_url.trim().startsWith('https://discord.com/api/webhooks/')) {
          newErrors[`webhook_${index}`] = 'Invalid Discord webhook URL';
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
    
    // Validate destinations - if a type is selected, webhook must be valid
    for (const dest of destinations) {
      if (dest.type === 'discord') {
        if (!dest.webhook_url.trim() || !dest.webhook_url.trim().startsWith('https://discord.com/api/webhooks/')) {
          return false;
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
      newDests[index] = { type: value, webhook_url: value === 'discord' ? newDests[index].webhook_url : '' };
      
      // If a destination is selected and it's not the last one, add a new empty destination
      if (value && index === newDests.length - 1) {
        newDests.push({ type: '', webhook_url: '' });
      }
      
      // Remove empty destinations at the end (except the last one)
      while (newDests.length > 1 && !newDests[newDests.length - 2].type && !newDests[newDests.length - 1].type) {
        newDests.pop();
      }
      
      return newDests;
    });
    
    // Clear errors
    if (errors[`webhook_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`webhook_${index}`];
        return newErrors;
      });
    }
  };

  const handleWebhookChange = (index, value) => {
    setDestinations(prev => {
      const newDests = [...prev];
      newDests[index] = { ...newDests[index], webhook_url: value };
      return newDests;
    });
    
    // Clear error when user starts typing
    if (errors[`webhook_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`webhook_${index}`];
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
      .map(dest => ({
        type: dest.type,
        webhook_url: dest.webhook_url.trim()
      }));

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
                    </select>
                  </div>
                  
                  {dest.type === 'discord' && (
                    <div>
                      <label htmlFor={`webhook_url_${index}`}>Discord Webhook URL</label>
                      <input
                        type="url"
                        id={`webhook_url_${index}`}
                        value={dest.webhook_url}
                        onChange={(e) => handleWebhookChange(index, e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className={errors[`webhook_${index}`] ? 'error-input' : ''}
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                      />
                      {errors[`webhook_${index}`] && (
                        <span className="error-text">{errors[`webhook_${index}`]}</span>
                      )}
                    </div>
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
    version: '1.8.5' // Will be loaded from backend
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadSettings();
    document.title = 'Settings - App Watch';
    return () => {
      document.title = 'App Watch';
    };
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/settings`);
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
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
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

export default App;


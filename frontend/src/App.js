import React, { useState, useEffect } from 'react';
import './index.css';

const API_BASE = window.location.origin;

function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'add-app', or 'settings'
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
      } else if (path === '/settings' || path.includes('/settings')) {
        setCurrentPage('settings');
      } else {
        setCurrentPage('dashboard');
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
    setShowModal(true);
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
      const url = editingApp
        ? `${API_BASE}/api/apps/${editingApp.id}`
        : `${API_BASE}/api/apps`;
      
      const method = editingApp ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showMessage(editingApp ? 'App updated successfully' : 'App added successfully');
        setShowModal(false);
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
            <h1>App Release Watcher</h1>
            <p>Monitor iOS App Store apps for new releases and post to Discord</p>
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

      {showModal && (
        <AppModal
          app={editingApp}
          onClose={() => {
            setShowModal(false);
            setEditingApp(null);
          }}
          onSave={handleSaveApp}
        />
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
        <h2>{app.name}</h2>
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
          <span className="info-label">Webhook</span>
          <span className="info-value" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            {app.webhook_url ? '✓ Configured' : '✗ Not configured'}
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

function AddAppPage({ onSave, onCancel, message, showMessage }) {
  const [formData, setFormData] = useState({
    name: '',
    app_store_id: '',
    notification_destinations: [],
    webhook_url: '',
    interval_override: '',
    enabled: true
  });

  const [errors, setErrors] = useState({});
  const [selectedDestination, setSelectedDestination] = useState('');
  
  useEffect(() => {
    // Update document title
    document.title = 'Add New App - App Release Watcher';
    
    // Load default monitoring setting
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
    
    return () => {
      document.title = 'App Release Watcher';
    };
  }, []);

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
    
    if (!selectedDestination) {
      newErrors.notification_destinations = 'Please select a notification destination';
    }
    
    if (selectedDestination === 'discord' && !formData.webhook_url.trim()) {
      newErrors.webhook_url = 'Discord Webhook URL is required';
    } else if (selectedDestination === 'discord' && formData.webhook_url.trim() && 
               !formData.webhook_url.trim().startsWith('https://discord.com/api/webhooks/')) {
      newErrors.webhook_url = 'Invalid Discord webhook URL';
    }
    
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
    return formData.name.trim() &&
           formData.app_store_id.trim() &&
           /^\d+$/.test(formData.app_store_id.trim()) &&
           selectedDestination &&
           (selectedDestination !== 'discord' || (formData.webhook_url.trim() && 
            formData.webhook_url.trim().startsWith('https://discord.com/api/webhooks/'))) &&
           (!formData.interval_override.trim() || /^\d+[hmsd]$/i.test(formData.interval_override.trim()));
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

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setSelectedDestination(value);
    setFormData(prev => ({
      ...prev,
      notification_destinations: value ? [value] : [],
      webhook_url: value !== 'discord' ? '' : prev.webhook_url
    }));
    
    // Clear errors
    if (errors.notification_destinations) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.notification_destinations;
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

    const submitData = {
      ...formData,
      notification_destinations: selectedDestination ? [selectedDestination] : []
    };
    
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
        <h1>Add New App</h1>
      </div>

      <div className="add-app-content">
        <div className="add-app-form-section">
          {message && (
            <div className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`}>
              {message.text}
            </div>
          )}

          <div className="form-prompt">
            <h2>Let's start with the details for your app</h2>
            <p className="form-subtitle">Fill in the information below to start monitoring app releases</p>
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
                placeholder="Enter your app name"
                className={errors.name ? 'error-input' : ''}
              />
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
                />
                {formData.app_store_id && !errors.app_store_id && (
                  <span className="input-hint">ID: {formData.app_store_id}</span>
                )}
              </div>
              {errors.app_store_id && <span className="error-text">{errors.app_store_id}</span>}
              <small>Find this in the App Store URL: apps.apple.com/app/id123456789</small>
            </div>

            <div className="form-group">
              <label htmlFor="notification_destinations">Notification Destinations (*)</label>
              <select
                id="notification_destinations"
                name="notification_destinations"
                value={selectedDestination}
                onChange={handleDestinationChange}
                className={errors.notification_destinations ? 'error-input' : ''}
              >
                <option value="">Select a destination</option>
                <option value="discord">Discord</option>
              </select>
              {errors.notification_destinations && <span className="error-text">{errors.notification_destinations}</span>}
            </div>

            {selectedDestination === 'discord' && (
              <div className="form-group">
                <label htmlFor="webhook_url">Discord Webhook URL (*)</label>
                <input
                  type="url"
                  id="webhook_url"
                  name="webhook_url"
                  value={formData.webhook_url}
                  onChange={handleChange}
                  placeholder="https://discord.com/api/webhooks/..."
                  className={errors.webhook_url ? 'error-input' : ''}
                />
                {errors.webhook_url && <span className="error-text">{errors.webhook_url}</span>}
              </div>
            )}

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
                Save
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

function AppModal({ app, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: app?.name || '',
    app_store_id: app?.app_store_id || '',
    webhook_url: app?.webhook_url || '',
    interval_override: app?.interval_override || '',
    enabled: app?.enabled !== false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{app ? 'Edit App' : 'Add App'}</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">App Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="My App"
            />
          </div>

          <div className="form-group">
            <label htmlFor="app_store_id">App Store ID *</label>
            <input
              type="text"
              id="app_store_id"
              name="app_store_id"
              value={formData.app_store_id}
              onChange={handleChange}
              required
              placeholder="123456789"
            />
            <small>Find this in the App Store URL: apps.apple.com/app/id123456789</small>
          </div>

          <div className="form-group">
            <label htmlFor="webhook_url">Discord Webhook URL *</label>
            <input
              type="url"
              id="webhook_url"
              name="webhook_url"
              value={formData.webhook_url}
              onChange={handleChange}
              required
              placeholder="https://discord.com/api/webhooks/..."
            />
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
            />
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
              <label htmlFor="enabled">Enable monitoring</label>
            </div>
          </div>

          <div className="button-group" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary">
              {app ? 'Update' : 'Add'} App
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
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
    document.title = 'Settings - App Release Watcher';
    return () => {
      document.title = 'App Release Watcher';
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
                <label htmlFor="auto_post_on_update">Auto-Post to Discord on Update</label>
              </div>
              <small>Automatically post release notes to Discord when a new version is detected (in addition to checking).</small>
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


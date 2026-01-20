import React, { useState, useEffect } from 'react';
import './index.css';

const API_BASE = window.location.origin;

function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [message, setMessage] = useState(null);
  const [checking, setChecking] = useState({});
  const [posting, setPosting] = useState({});

  useEffect(() => {
    loadApps();
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
    setShowModal(true);
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

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/export`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `app-release-watcher-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(`Exported ${data.apps.length} app(s) successfully`);
      } else {
        const error = await response.json();
        showMessage(error.error || 'Failed to export', 'error');
      }
    } catch (error) {
      showMessage('Error exporting: ' + error.message, 'error');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!window.confirm(`Import ${data.apps?.length || 0} app(s)? This will add them to your existing apps.`)) {
        return;
      }

      const response = await fetch(`${API_BASE}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        if (result.errors && result.errors.length > 0) {
          showMessage(`Imported ${result.imported}/${result.total} apps. Some errors occurred.`, 'error');
          console.error('Import errors:', result.errors);
        } else {
          showMessage(`Successfully imported ${result.imported} app(s)`);
        }
        loadApps();
      } else {
        showMessage(result.error || 'Failed to import', 'error');
      }
    } catch (error) {
      showMessage('Error importing: ' + error.message, 'error');
    }

    // Reset file input
    event.target.value = '';
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
        setEditingApp(null);
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

  return (
    <div className="container">
      <div className="header">
        <h1>App Release Watcher</h1>
        <p>Monitor iOS App Store apps for new releases and post to Discord</p>
      </div>

      {message && (
        <div className={message.type === 'error' ? 'error' : 'success'}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleAddApp}>
          + Add App
        </button>
        <button className="btn btn-secondary" onClick={handleExport}>
          📥 Export Config
        </button>
        <label className="btn btn-secondary" style={{ margin: 0, cursor: 'pointer' }}>
          📤 Import Config
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </label>
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
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE}/api/apps/${app.id}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        setShowHistory(true);
      } else {
        console.error('Failed to load history');
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
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
          className="btn btn-secondary"
          onClick={loadHistory}
          disabled={loadingHistory}
        >
          {loadingHistory ? 'Loading...' : '📜 History'}
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

      {showHistory && (
        <HistoryModal
          app={app}
          history={history}
          onClose={() => setShowHistory(false)}
        />
      )}
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

function HistoryModal({ app, history, onClose }) {
  // Simple formatter for history display
  const formatReleaseNotes = (version, releaseNotes) => {
    if (!releaseNotes) {
      return `# v${version}\n\nNo release notes available.`;
    }
    
    // Simple formatting - just add version header
    return `# v${version}\n\n${releaseNotes}`;
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh' }}>
        <div className="modal-header">
          <h2>Version History - {app.name}</h2>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <p>No version history yet. History will be populated as versions are checked.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {history.map((entry, index) => (
                <div key={index} style={{ 
                  border: '1px solid #dee2e6', 
                  borderRadius: '4px', 
                  padding: '15px',
                  background: index === 0 ? '#f8f9fa' : 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#007bff' }}>v{entry.version}</h3>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown date'}
                    </span>
                  </div>
                  {entry.release_notes && (
                    <div className="preview-box" style={{ 
                      marginTop: '10px',
                      background: 'white',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {formatReleaseNotes(entry.version, entry.release_notes)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="button-group" style={{ marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;


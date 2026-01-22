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

// Icons as SVG components
const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  Apps: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>
  ),
  Add: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v8"/>
      <path d="M8 12h8"/>
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6"/>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
      <path d="M3 22v-6h6"/>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Delete: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  )
};

// Sidebar Component
function Sidebar({ currentPage, onNavigate, onLogout, authStatus, appsCount, sidebarOpen, onCloseSidebar }) {
  const navItems = [
    { id: 'dashboard', label: 'Apps', icon: Icons.Apps, badge: appsCount },
    { id: 'add-app', label: 'Add App', icon: Icons.Add },
    { id: 'activity', label: 'Activity', icon: Icons.Activity },
    { id: 'settings', label: 'Settings', icon: Icons.Settings },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={onCloseSidebar}></div>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={FAVICON_PATH} alt="App Watch" className="sidebar-logo" />
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">App Watch</span>
            <span className="sidebar-brand-tagline">iOS Update Monitor</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Navigation</div>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id || (item.id === 'dashboard' && currentPage === 'edit-app') ? 'active' : ''}`}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseSidebar();
                }}
              >
                <item.icon />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {authStatus && authStatus.enabled && (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">U</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">Admin</div>
                <div className="sidebar-user-role">Authenticated</div>
              </div>
              <button className="logout-btn" onClick={onLogout} title="Logout">
                <Icons.Logout />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

// Main Layout Component
function AppLayout({ children, currentPage, onNavigate, onLogout, authStatus, appsCount }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>
        <Icons.Menu />
      </button>
      
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        authStatus={authStatus}
        appsCount={appsCount}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
      
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
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
  const loadingAppsRef = useRef(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/status`);
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
        
        if (!data.configured) {
          setAuthLoading(false);
          return;
        }
        
        if (data.enabled) {
          const token = localStorage.getItem('auth_token');
          if (token) {
            setIsAuthenticated(true);
            setAuthToken(token);
            setAuthLoading(false);
            verifyAuth(token).catch(() => {});
          } else {
            setAuthLoading(false);
          }
        } else {
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
        headers: { 'Authorization': `Bearer ${tokenToVerify}` }
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        setAuthToken(tokenToVerify);
        if (authLoading) {
          setAuthLoading(false);
        }
      } else if (response.status === 401) {
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setIsAuthenticated(false);
        setAuthLoading(false);
      }
    } catch (error) {
      console.error('Error verifying auth:', error);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        setAuthLoading(false);
        appsLoadedRef.current = false;
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
  };

  const handleAuthSetup = async (authData) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });

      if (response.ok) {
        const loginResult = await handleLogin(authData.username, authData.password);
        if (loginResult.success) {
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
    if (authLoading) return;
    
    if (isAuthenticated && !appsLoadedRef.current && !loadingAppsRef.current) {
      loadApps();
    }
    
    const checkRoute = () => {
      const path = window.location.pathname;
      if (path === '/add-app' || path.includes('/add-app')) {
        setCurrentPage('add-app');
        setEditingApp(null);
      } else if (path.includes('/edit-app/')) {
        setCurrentPage('edit-app');
        const appId = path.split('/edit-app/')[1];
        if (appId && !editingApp) {
          fetch(`${API_BASE}/api/apps`, { headers: getAuthHeaders() })
            .then(response => response.json())
            .then(apps => {
              const app = apps.find(a => a.id === appId);
              if (app) {
                setEditingApp(app);
              } else {
                setCurrentPage('dashboard');
                setEditingApp(null);
                window.history.replaceState({ page: 'dashboard' }, '', '/');
              }
            })
            .catch(() => {
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
    
    const handlePopState = () => checkRoute();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, authLoading, editingApp]);

  const loadApps = async () => {
    if (loadingAppsRef.current) return;
    
    try {
      loadingAppsRef.current = true;
      setLoading(true);
      const token = authToken || localStorage.getItem('auth_token');
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE}/api/apps`, { headers });
      if (response.ok) {
        const data = await response.json();
        setApps(data);
        appsLoadedRef.current = true;
        if (!isAuthenticated && token) {
          setIsAuthenticated(true);
        }
      } else if (response.status === 401) {
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setIsAuthenticated(false);
        appsLoadedRef.current = false;
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

  const handleNavigate = (page) => {
    if (page === 'dashboard') {
      setCurrentPage('dashboard');
      setEditingApp(null);
      window.history.pushState({ page: 'dashboard' }, '', '/');
    } else if (page === 'add-app') {
      setEditingApp(null);
      setCurrentPage('add-app');
      window.history.pushState({ page: 'add-app' }, '', '/add-app');
    } else if (page === 'settings') {
      setCurrentPage('settings');
      window.history.pushState({ page: 'settings' }, '', '/settings');
    } else if (page === 'activity') {
      setCurrentPage('activity');
      window.history.pushState({ page: 'activity' }, '', '/activity');
    }
  };

  const handleEditApp = (app) => {
    setEditingApp(app);
    setCurrentPage('edit-app');
    window.history.pushState({ page: 'edit-app' }, '', `/edit-app/${app.id}`);
  };

  const handleDeleteApp = async (appId) => {
    if (!window.confirm('Are you sure you want to delete this app?')) return;

    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const response = await fetch(`${API_BASE}/api/apps/${appId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        showMessage('App deleted successfully');
        appsLoadedRef.current = false;
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
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const response = await fetch(`${API_BASE}/api/apps/${appId}/check`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      if (response.ok) {
        showMessage(data.success ? (data.message || 'Check completed') : (data.error || 'Check failed'), data.success ? 'success' : 'error');
        appsLoadedRef.current = false;
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
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const response = await fetch(`${API_BASE}/api/apps/${appId}/post`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      if (response.ok) {
        showMessage(data.success ? (data.message || 'Posted to Discord') : (data.error || 'Post failed'), data.success ? 'success' : 'error');
        appsLoadedRef.current = false;
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
      const url = appId ? `${API_BASE}/api/apps/${appId}` : `${API_BASE}/api/apps`;
      const method = appId ? 'PUT' : 'POST';

      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };

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
        appsLoadedRef.current = false;
        loadApps();
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to save app', 'error');
      }
    } catch (error) {
      showMessage('Error saving app: ' + error.message, 'error');
    }
  };

  // Show loading while checking auth
  if (authLoading && !authStatus) {
    return (
      <div className="auth-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show onboarding if auth is not configured
  if (authStatus && !authStatus.configured) {
    return <OnboardingPage onSetup={handleAuthSetup} message={message} showMessage={showMessage} />;
  }

  // Show login if auth is enabled but user is not authenticated
  if (authStatus && authStatus.enabled && !isAuthenticated && !authLoading) {
    const hasToken = localStorage.getItem('auth_token');
    if (hasToken) {
      return (
        <div className="auth-page">
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Verifying authentication...</span>
          </div>
        </div>
      );
    }
    return <LoginPage onLogin={handleLogin} authType={authStatus.auth_type} message={message} showMessage={showMessage} />;
  }

  if (loading) {
    return (
      <AppLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        authStatus={authStatus}
        appsCount={0}
      >
        <div className="page-content">
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading apps...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Render content based on current page
  const renderContent = () => {
    switch (currentPage) {
      case 'add-app':
        return (
          <AddAppPage
            onSave={handleSaveApp}
            onCancel={() => handleNavigate('dashboard')}
            message={message}
            showMessage={showMessage}
            editingApp={null}
          />
        );
      case 'edit-app':
        return editingApp ? (
          <AddAppPage
            onSave={handleSaveApp}
            onCancel={() => handleNavigate('dashboard')}
            message={message}
            showMessage={showMessage}
            editingApp={editingApp}
          />
        ) : null;
      case 'settings':
        return (
          <SettingsPage
            onCancel={() => handleNavigate('dashboard')}
            message={message}
            showMessage={showMessage}
          />
        );
      case 'activity':
        return (
          <ActivityPage
            onCancel={() => handleNavigate('dashboard')}
            apps={apps}
            message={message}
            showMessage={showMessage}
          />
        );
      default:
        return (
          <DashboardPage
            apps={apps}
            message={message}
            onAddApp={() => handleNavigate('add-app')}
            onEditApp={handleEditApp}
            onDeleteApp={handleDeleteApp}
            onCheckApp={handleCheckApp}
            onPostApp={handlePostApp}
            checking={checking}
            posting={posting}
          />
        );
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      authStatus={authStatus}
      appsCount={apps.length}
    >
      {renderContent()}
    </AppLayout>
  );
}

// Dashboard Page Component
function DashboardPage({ apps, message, onAddApp, onEditApp, onDeleteApp, onCheckApp, onPostApp, checking, posting }) {
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Apps</h1>
          <p className="page-subtitle">Monitor your iOS apps for new releases</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={onAddApp}>
            <Icons.Add /> Add App
          </button>
        </div>
      </div>

      <div className="page-content">
        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {apps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📱</div>
            <h3>No apps configured</h3>
            <p>Add your first app to start monitoring for updates</p>
            <button className="btn btn-primary btn-lg" onClick={onAddApp}>
              <Icons.Add /> Add Your First App
            </button>
          </div>
        ) : (
          <div className="apps-grid">
            {apps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onEdit={onEditApp}
                onDelete={onDeleteApp}
                onCheck={onCheckApp}
                onPost={onPostApp}
                checking={checking[app.id]}
                posting={posting[app.id]}
              />
            ))}
          </div>
        )}
      </div>
    </>
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

  const getDestinationSummary = () => {
    const destinations = app.notification_destinations || [];
    const hasLegacyWebhook = app.webhook_url && app.webhook_url.trim();
    
    if (destinations.length === 0 && !hasLegacyWebhook) {
      return <span style={{ color: 'var(--text-muted)' }}>Not configured</span>;
    }
    
    if (destinations.length === 0 && hasLegacyWebhook) {
      return '1 Discord webhook';
    }
    
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
      return <span style={{ color: 'var(--text-muted)' }}>Not configured</span>;
    }
    
    const counts = {};
    validDestinations.forEach(d => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    
    const parts = [];
    if (counts.discord) parts.push(`${counts.discord} Discord`);
    if (counts.slack) parts.push(`${counts.slack} Slack`);
    if (counts.telegram) parts.push(`${counts.telegram} Telegram`);
    if (counts.teams) parts.push(`${counts.teams} Teams`);
    if (counts.email) parts.push(`${counts.email} Email`);
    if (counts.generic) parts.push(`${counts.generic} Generic`);
    
    return parts.join(', ') || <span style={{ color: 'var(--text-muted)' }}>Not configured</span>;
  };

  return (
    <div className="app-card">
      <div className="app-card-header">
        <img 
          src={app.icon_url || '/iosdefault.png'} 
          alt={app.name}
          className="app-icon"
          onError={(e) => { e.target.src = '/iosdefault.png'; }}
        />
        <div className="app-title-section">
          <div className="app-name">{app.name}</div>
          <div className="app-store-id">ID: {app.app_store_id}</div>
        </div>
        <span className={`app-status-badge ${app.enabled ? 'enabled' : 'disabled'}`}>
          {app.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <div className="app-card-body">
        <div className="app-info-grid">
          <div className="app-info-item">
            <span className="app-info-label">Current Version</span>
            <span className="app-info-value">{app.current_version || 'Not checked'}</span>
          </div>
          <div className="app-info-item">
            <span className="app-info-label">Last Posted</span>
            <span className="app-info-value">{app.last_posted_version || 'Never'}</span>
          </div>
          <div className="app-info-item">
            <span className="app-info-label">Last Check</span>
            <span className="app-info-value">
              {app.last_check ? new Date(app.last_check).toLocaleString() : 'Never'}
            </span>
          </div>
          <div className="app-info-item">
            <span className="app-info-label">Check Interval</span>
            <span className="app-info-value">{app.interval_override || 'Default (12h)'}</span>
          </div>
          <div className="app-info-item" style={{ gridColumn: '1 / -1' }}>
            <span className="app-info-label">Notifications</span>
            <span className="app-info-value destinations">{getDestinationSummary()}</span>
          </div>
        </div>

        {preview && (
          <div style={{ marginBottom: '16px' }}>
            <div className="app-info-label" style={{ marginBottom: '8px' }}>Preview</div>
            <div className="preview-box">{preview}</div>
          </div>
        )}

        <div className="app-card-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => onCheck(app.id)} disabled={checking || posting}>
            <Icons.Refresh /> {checking ? 'Checking...' : 'Check'}
          </button>
          <button className="btn btn-success btn-sm" onClick={() => onPost(app.id)} disabled={checking || posting}>
            <Icons.Send /> {posting ? 'Posting...' : 'Post'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadPreview} disabled={loadingPreview}>
            <Icons.Eye /> {loadingPreview ? 'Loading...' : 'Preview'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(app)} disabled={checking || posting}>
            <Icons.Edit /> Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(app.id)} disabled={checking || posting}>
            <Icons.Delete />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get webhook type instructions
const getWebhookInstructions = (type) => {
  const instructions = {
    discord: 'Go to Discord Server Settings → Integrations → Webhooks → New Webhook. Copy the webhook URL.',
    slack: 'Go to Slack App Settings → Incoming Webhooks → Add New Webhook. Copy the webhook URL.',
    telegram: 'Message @BotFather to create a bot and get a token. Get your chat ID from @userinfobot.',
    teams: 'Go to Microsoft Teams → Channel → Connectors → Incoming Webhook → Configure.',
    email: 'Enter recipient email address. SMTP settings can be configured in Settings.',
    generic: 'Enter any HTTP/HTTPS webhook URL. Customize the JSON payload template.'
  };
  return instructions[type] || '';
};

function AddAppPage({ onSave, onCancel, message, showMessage, editingApp }) {
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
    document.title = editingApp ? 'Edit App - App Watch' : 'Add New App - App Watch';
    
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
    
    return () => { document.title = 'App Watch'; };
  }, [editingApp]);

  useEffect(() => {
    const appStoreId = formData.app_store_id.trim();
    
    if (appStoreId && /^\d+$/.test(appStoreId)) {
      if (editingApp && editingApp.app_store_id === appStoreId) return;
      
      const timeoutId = setTimeout(async () => {
        setFetchingMetadata(true);
        try {
          const response = await fetch(`${API_BASE}/api/apps/metadata/${appStoreId}`, { headers: getAuthHeaders() });
          if (response.ok) {
            const metadata = await response.json();
            if (metadata.artworkUrl) {
              setFormData(prev => ({ ...prev, icon_url: metadata.artworkUrl }));
            }
            if (metadata.trackName) {
              setSuggestedName(metadata.trackName);
              setFormData(prev => {
                if (!prev.name.trim()) {
                  return { ...prev, name: metadata.trackName };
                }
                return prev;
              });
            }
          } else {
            setSuggestedName('');
            setFormData(prev => ({ ...prev, icon_url: '' }));
          }
        } catch (error) {
          setSuggestedName('');
          setFormData(prev => ({ ...prev, icon_url: '' }));
        } finally {
          setFetchingMetadata(false);
        }
      }, 800);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestedName('');
      setFormData(prev => ({ ...prev, icon_url: '' }));
    }
  }, [formData.app_store_id, editingApp]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'App Name is required';
    if (!formData.app_store_id.trim()) {
      newErrors.app_store_id = 'App Store ID is required';
    } else if (!/^\d+$/.test(formData.app_store_id.trim())) {
      newErrors.app_store_id = 'App Store ID must be a number';
    }
    
    destinations.forEach((dest, index) => {
      if (dest.type) {
        if (['discord', 'slack', 'teams', 'generic'].includes(dest.type)) {
          if (!dest.webhook_url || !dest.webhook_url.trim()) {
            newErrors[`dest_${index}_webhook_url`] = `${dest.type.charAt(0).toUpperCase() + dest.type.slice(1)} webhook URL is required`;
          }
        } else if (dest.type === 'telegram') {
          if (!dest.bot_token || !dest.bot_token.trim()) {
            newErrors[`dest_${index}_bot_token`] = 'Telegram bot token is required';
          }
          if (!dest.chat_id || !dest.chat_id.trim()) {
            newErrors[`dest_${index}_chat_id`] = 'Telegram chat ID is required';
          }
        } else if (dest.type === 'email') {
          if (!dest.email || !dest.email.trim()) {
            newErrors[`dest_${index}_email`] = 'Email address is required';
          }
          if (!dest.smtp_host || !dest.smtp_host.trim()) {
            newErrors[`dest_${index}_smtp_host`] = 'SMTP host is required';
          }
        }
      }
    });
    
    if (formData.interval_override.trim()) {
      if (!/^\d+[hmsd]$/i.test(formData.interval_override.trim())) {
        newErrors.interval_override = 'Invalid interval format. Use: 6h, 30m, 1d';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    if (!formData.name.trim() || !formData.app_store_id.trim() || !/^\d+$/.test(formData.app_store_id.trim())) {
      return false;
    }
    if (formData.interval_override.trim() && !/^\d+[hmsd]$/i.test(formData.interval_override.trim())) {
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
    }
  };

  const handleDestinationTypeChange = (index, value) => {
    setDestinations(prev => {
      const newDests = [...prev];
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
      
      if (value && index === newDests.length - 1) {
        newDests.push({ type: '', webhook_url: '', bot_token: '', chat_id: '', email: '', smtp_host: '', smtp_port: '', smtp_user: '', smtp_password: '', smtp_from: '', payload_template: '' });
      }
      
      while (newDests.length > 1 && !newDests[newDests.length - 2].type && !newDests[newDests.length - 1].type) {
        newDests.pop();
      }
      
      return newDests;
    });
  };

  const handleDestinationFieldChange = (index, field, value) => {
    setDestinations(prev => {
      const newDests = [...prev];
      newDests[index] = { ...newDests[index], [field]: value };
      return newDests;
    });
    
    const errorKey = `dest_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[errorKey]; return newErrors; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showMessage('Please fill in all required fields correctly', 'error');
      return;
    }

    const notificationDestinations = destinations
      .filter(dest => dest.type)
      .map(dest => {
        const result = { type: dest.type };
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
    
    if (editingApp) submitData.id = editingApp.id;
    await onSave(submitData);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{editingApp ? 'Edit App' : 'Add New App'}</h1>
          <p className="page-subtitle">{editingApp ? 'Update app monitoring settings' : 'Configure a new app to monitor'}</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={onCancel}>
            <Icons.ArrowLeft /> Back
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="form-page">
          {message && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">App Details</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">App Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={suggestedName || "Enter your app name"}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                  />
                  {suggestedName && !formData.name && (
                    <span className="form-hint">Suggested: {suggestedName}</span>
                  )}
                  {fetchingMetadata && <span className="form-hint">Fetching app info...</span>}
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">App Store ID <span className="required">*</span></label>
                  <input
                    type="text"
                    name="app_store_id"
                    value={formData.app_store_id}
                    onChange={handleChange}
                    placeholder="e.g., 123456789"
                    className={`form-input ${errors.app_store_id ? 'error' : ''}`}
                    disabled={fetchingMetadata}
                  />
                  <span className="form-hint">Find this in the App Store URL: apps.apple.com/app/id<strong>123456789</strong></span>
                  {errors.app_store_id && <span className="form-error">{errors.app_store_id}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Check Interval (optional)</label>
                  <input
                    type="text"
                    name="interval_override"
                    value={formData.interval_override}
                    onChange={handleChange}
                    placeholder="e.g., 6h, 30m, 1d"
                    className={`form-input ${errors.interval_override ? 'error' : ''}`}
                  />
                  <span className="form-hint">Override default interval. Leave empty for default (12h).</span>
                  {errors.interval_override && <span className="form-error">{errors.interval_override}</span>}
                </div>

                <div className="form-group">
                  <div className="form-checkbox-group">
                    <input
                      type="checkbox"
                      id="enabled"
                      name="enabled"
                      checked={formData.enabled}
                      onChange={handleChange}
                      className="form-checkbox"
                    />
                    <label htmlFor="enabled" className="form-checkbox-label">Enable Monitoring</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Notification Destinations</h3>
              </div>
              <div className="card-body">
                <p style={{ marginBottom: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Add one or more notification destinations. Leave empty to skip notifications.
                </p>

                {destinations.map((dest, index) => (
                  <div key={index} className="destination-card">
                    <div className="form-group">
                      <label className="form-label">
                        {index === 0 ? 'Destination Type' : `Destination ${index + 1}`}
                      </label>
                      <select
                        value={dest.type}
                        onChange={(e) => handleDestinationTypeChange(index, e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select destination (optional)</option>
                        <option value="discord">Discord</option>
                        <option value="slack">Slack</option>
                        <option value="telegram">Telegram</option>
                        <option value="teams">Microsoft Teams</option>
                        <option value="email">Email (SMTP)</option>
                        <option value="generic">Generic Webhook</option>
                      </select>
                      {dest.type && (
                        <span className="form-hint">{getWebhookInstructions(dest.type)}</span>
                      )}
                    </div>
                    
                    {dest.type === 'discord' && (
                      <div className="form-group">
                        <label className="form-label">Webhook URL <span className="required">*</span></label>
                        <input
                          type="url"
                          value={dest.webhook_url || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          className={`form-input ${errors[`dest_${index}_webhook_url`] ? 'error' : ''}`}
                        />
                        {errors[`dest_${index}_webhook_url`] && <span className="form-error">{errors[`dest_${index}_webhook_url`]}</span>}
                      </div>
                    )}
                    
                    {dest.type === 'slack' && (
                      <div className="form-group">
                        <label className="form-label">Webhook URL <span className="required">*</span></label>
                        <input
                          type="url"
                          value={dest.webhook_url || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                          placeholder="https://hooks.slack.com/services/..."
                          className={`form-input ${errors[`dest_${index}_webhook_url`] ? 'error' : ''}`}
                        />
                        {errors[`dest_${index}_webhook_url`] && <span className="form-error">{errors[`dest_${index}_webhook_url`]}</span>}
                      </div>
                    )}
                    
                    {dest.type === 'telegram' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Bot Token <span className="required">*</span></label>
                          <input
                            type="text"
                            value={dest.bot_token || ''}
                            onChange={(e) => handleDestinationFieldChange(index, 'bot_token', e.target.value)}
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            className={`form-input ${errors[`dest_${index}_bot_token`] ? 'error' : ''}`}
                          />
                          {errors[`dest_${index}_bot_token`] && <span className="form-error">{errors[`dest_${index}_bot_token`]}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Chat ID <span className="required">*</span></label>
                          <input
                            type="text"
                            value={dest.chat_id || ''}
                            onChange={(e) => handleDestinationFieldChange(index, 'chat_id', e.target.value)}
                            placeholder="123456789"
                            className={`form-input ${errors[`dest_${index}_chat_id`] ? 'error' : ''}`}
                          />
                          {errors[`dest_${index}_chat_id`] && <span className="form-error">{errors[`dest_${index}_chat_id`]}</span>}
                        </div>
                      </>
                    )}
                    
                    {dest.type === 'teams' && (
                      <div className="form-group">
                        <label className="form-label">Webhook URL <span className="required">*</span></label>
                        <input
                          type="url"
                          value={dest.webhook_url || ''}
                          onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                          placeholder="https://outlook.office.com/webhook/..."
                          className={`form-input ${errors[`dest_${index}_webhook_url`] ? 'error' : ''}`}
                        />
                        {errors[`dest_${index}_webhook_url`] && <span className="form-error">{errors[`dest_${index}_webhook_url`]}</span>}
                      </div>
                    )}
                    
                    {dest.type === 'email' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Email Address <span className="required">*</span></label>
                          <input
                            type="email"
                            value={dest.email || ''}
                            onChange={(e) => handleDestinationFieldChange(index, 'email', e.target.value)}
                            placeholder="recipient@example.com"
                            className={`form-input ${errors[`dest_${index}_email`] ? 'error' : ''}`}
                          />
                          {errors[`dest_${index}_email`] && <span className="form-error">{errors[`dest_${index}_email`]}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">SMTP Host <span className="required">*</span></label>
                          <input
                            type="text"
                            value={dest.smtp_host || ''}
                            onChange={(e) => handleDestinationFieldChange(index, 'smtp_host', e.target.value)}
                            placeholder="smtp.gmail.com"
                            className={`form-input ${errors[`dest_${index}_smtp_host`] ? 'error' : ''}`}
                          />
                          <span className="form-hint">Can also be set in Settings for all apps.</span>
                          {errors[`dest_${index}_smtp_host`] && <span className="form-error">{errors[`dest_${index}_smtp_host`]}</span>}
                        </div>
                      </>
                    )}
                    
                    {dest.type === 'generic' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Webhook URL <span className="required">*</span></label>
                          <input
                            type="url"
                            value={dest.webhook_url || ''}
                            onChange={(e) => handleDestinationFieldChange(index, 'webhook_url', e.target.value)}
                            placeholder="https://example.com/webhook"
                            className={`form-input ${errors[`dest_${index}_webhook_url`] ? 'error' : ''}`}
                          />
                          {errors[`dest_${index}_webhook_url`] && <span className="form-error">{errors[`dest_${index}_webhook_url`]}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Payload Template (JSON, optional)</label>
                          <textarea
                            value={dest.payload_template || ''}
                            onChange={(e) => handleDestinationFieldChange(index, 'payload_template', e.target.value)}
                            placeholder='{"app": "{{app_name}}", "version": "{{version}}"}'
                            rows="3"
                            className="form-input"
                            style={{ fontFamily: 'monospace' }}
                          />
                          <span className="form-hint">Use: {'{{app_name}}'}, {'{{version}}'}, {'{{release_notes}}'}, {'{{formatted_content}}'}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg" disabled={!isFormValid()}>
                <Icons.Check /> {editingApp ? 'Update App' : 'Save App'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
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
    version: '1.8.5',
    api_key: ''
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
    return () => { document.title = 'App Watch'; };
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
    if (!window.confirm('Regenerate API key? This will invalidate the current key.')) return;

    try {
      setRegeneratingApiKey(true);
      const response = await fetch(`${API_BASE}/api/auth/api-key/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (settings.default_interval && !/^\d+[hmsd]$/i.test(settings.default_interval.trim())) {
      newErrors.default_interval = 'Invalid interval format. Use: 6h, 30m, 1d';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showMessage('Please fix the errors before saving', 'error');
      return;
    }

    try {
      setSaving(true);
      const { version, ...settingsToSave } = settings;
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
      <>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Configure application settings</p>
          </div>
        </div>
        <div className="page-content">
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading settings...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure application settings</p>
        </div>
      </div>

      <div className="page-content">
        <div className="form-page">
          {message && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="settings-section">
              <div className="settings-section-header">
                <h3 className="settings-section-title">General Settings</h3>
                <p className="settings-section-description">Configure default behavior and monitoring preferences</p>
              </div>
              <div className="settings-section-body">
                <div className="form-group">
                  <label className="form-label">Default Check Interval</label>
                  <input
                    type="text"
                    name="default_interval"
                    value={settings.default_interval}
                    onChange={handleChange}
                    placeholder="12h"
                    className={`form-input ${errors.default_interval ? 'error' : ''}`}
                  />
                  <span className="form-hint">Default interval for checking updates (e.g., 6h, 30m, 1d)</span>
                  {errors.default_interval && <span className="form-error">{errors.default_interval}</span>}
                </div>

                <div className="form-group">
                  <div className="form-checkbox-group">
                    <input
                      type="checkbox"
                      id="monitoring_enabled_by_default"
                      name="monitoring_enabled_by_default"
                      checked={settings.monitoring_enabled_by_default}
                      onChange={handleChange}
                      className="form-checkbox"
                    />
                    <label htmlFor="monitoring_enabled_by_default" className="form-checkbox-label">
                      Enable Monitoring by Default
                    </label>
                  </div>
                  <span className="form-hint">New apps will have monitoring enabled automatically</span>
                </div>

                <div className="form-group">
                  <div className="form-checkbox-group">
                    <input
                      type="checkbox"
                      id="auto_post_on_update"
                      name="auto_post_on_update"
                      checked={settings.auto_post_on_update}
                      onChange={handleChange}
                      className="form-checkbox"
                    />
                    <label htmlFor="auto_post_on_update" className="form-checkbox-label">
                      Auto-Post Notifications on Update
                    </label>
                  </div>
                  <span className="form-hint">Automatically send notifications when a new version is detected</span>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-header">
                <h3 className="settings-section-title">Notification Defaults</h3>
                <p className="settings-section-description">Default settings for notification destinations</p>
              </div>
              <div className="settings-section-body">
                <div className="form-group">
                  <label className="form-label">Telegram Bot Token</label>
                  <input
                    type="text"
                    name="telegram_bot_token"
                    value={settings.telegram_bot_token || ''}
                    onChange={handleChange}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="form-input"
                  />
                  <span className="form-hint">Default bot token for Telegram notifications</span>
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Host</label>
                  <input
                    type="text"
                    name="smtp_host"
                    value={settings.smtp_host || ''}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Port</label>
                  <input
                    type="text"
                    name="smtp_port"
                    value={settings.smtp_port || ''}
                    onChange={handleChange}
                    placeholder="587"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Username</label>
                  <input
                    type="text"
                    name="smtp_user"
                    value={settings.smtp_user || ''}
                    onChange={handleChange}
                    placeholder="your-email@example.com"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Password</label>
                  <input
                    type="password"
                    name="smtp_password"
                    value={settings.smtp_password || ''}
                    onChange={handleChange}
                    placeholder="Your SMTP password"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">From Email Address</label>
                  <input
                    type="email"
                    name="smtp_from"
                    value={settings.smtp_from || ''}
                    onChange={handleChange}
                    placeholder="sender@example.com"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <div className="form-checkbox-group">
                    <input
                      type="checkbox"
                      id="smtp_use_tls"
                      name="smtp_use_tls"
                      checked={settings.smtp_use_tls !== false}
                      onChange={handleChange}
                      className="form-checkbox"
                    />
                    <label htmlFor="smtp_use_tls" className="form-checkbox-label">
                      Use TLS for SMTP
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-header">
                <h3 className="settings-section-title">Security</h3>
                <p className="settings-section-description">Manage API access and authentication</p>
              </div>
              <div className="settings-section-body">
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={apiKey}
                      readOnly
                      className="form-input"
                      style={{ fontFamily: 'monospace', flex: 1 }}
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRegenerateApiKey}
                      disabled={regeneratingApiKey}
                    >
                      {regeneratingApiKey ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                  <span className="form-hint">
                    Use this key for programmatic access via <code>X-Api-Key</code> header or Bearer token
                  </span>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                <Icons.Check /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          <div className="version-info">
            <span className="version-label">Version</span>
            <span className="version-value">{settings.version || '1.8.5'}</span>
          </div>
        </div>
      </div>
    </>
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
    return () => { document.title = 'App Watch'; };
  }, []);

  const loadHistory = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '200');
      
      if (filterParams.event_type || filters.event_type) params.append('event_type', filterParams.event_type || filters.event_type);
      if (filterParams.app_id || filters.app_id) params.append('app_id', filterParams.app_id || filters.app_id);
      if (filterParams.status || filters.status) params.append('status', filterParams.status || filters.status);

      const response = await fetch(`${API_BASE}/api/history?${params.toString()}`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      } else {
        showMessage('Failed to load activity history', 'error');
      }
    } catch (error) {
      showMessage('Error loading activity: ' + error.message, 'error');
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
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      default: return 'ℹ';
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

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">View app monitoring history and events</p>
        </div>
      </div>

      <div className="page-content">
        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="filters-bar">
          <div className="filter-group">
            <label className="filter-label">Event Type</label>
            <select
              value={filters.event_type}
              onChange={(e) => handleFilterChange('event_type', e.target.value)}
              className="form-select"
            >
              <option value="">All Events</option>
              <option value="check">Check</option>
              <option value="post">Post</option>
              <option value="app_created">App Created</option>
              <option value="app_updated">App Updated</option>
              <option value="app_deleted">App Deleted</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">App</label>
            <select
              value={filters.app_id}
              onChange={(e) => handleFilterChange('app_id', e.target.value)}
              className="form-select"
            >
              <option value="">All Apps</option>
              {apps.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-select"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search messages..."
              className="form-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading activity...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No activity found</h3>
            <p>Activity history will appear here as you use the application</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>App</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className="status-badge status-info">
                          {getEventTypeLabel(entry.event_type)}
                        </span>
                      </td>
                      <td>{entry.app_name || '-'}</td>
                      <td>
                        <span className={`status-badge status-${entry.status}`}>
                          {getStatusIcon(entry.status)} {entry.status}
                        </span>
                      </td>
                      <td>{entry.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
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
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 3) newErrors.password = 'Password must be at least 3 characters';
    if (!formData.confirm_password) newErrors.confirm_password = 'Please confirm your password';
    else if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img src={FAVICON_PATH} alt="App Watch" className="auth-logo" />
            <h1 className="auth-title">Welcome to App Watch</h1>
            <p className="auth-subtitle">Let's set up authentication to secure your application</p>
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Authentication Type</label>
              <select
                name="auth_type"
                value={formData.auth_type}
                onChange={handleChange}
                className="form-select"
              >
                <option value="forms">Forms (Login Page)</option>
                <option value="basic">Basic (Browser Popup)</option>
              </select>
              <span className="form-hint">
                {formData.auth_type === 'forms' 
                  ? 'Users will see a login page when accessing the application.'
                  : 'Users will see a browser authentication popup.'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className={`form-input ${errors.username ? 'error' : ''}`}
              />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`form-input ${errors.password ? 'error' : ''}`}
              />
              <span className="form-hint">Password must be at least 3 characters</span>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`form-input ${errors.confirm_password ? 'error' : ''}`}
              />
              {errors.confirm_password && <span className="form-error">{errors.confirm_password}</span>}
            </div>

            <div className="form-group">
              <div className="form-checkbox-group">
                <input
                  type="checkbox"
                  id="bypass_local_networks"
                  name="bypass_local_networks"
                  checked={formData.bypass_local_networks}
                  onChange={handleChange}
                  className="form-checkbox"
                />
                <label htmlFor="bypass_local_networks" className="form-checkbox-label">
                  Bypass authentication for local networks
                </label>
              </div>
              <span className="form-hint">Skip auth for users on local/private networks</span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, authType, message, showMessage }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img src={FAVICON_PATH} alt="App Watch" className="auth-logo" />
            <h1 className="auth-title">App Watch</h1>
            <p className="auth-subtitle">Please sign in to continue</p>
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className={`form-input ${errors.username ? 'error' : ''}`}
                autoFocus
              />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`form-input ${errors.password ? 'error' : ''}`}
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
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

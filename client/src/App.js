import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { useTheme } from './context/ThemeContext';

// Services
import api, { getToken, removeToken, apiKeysAPI } from './services/api';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import TweetScheduler from './pages/TweetScheduler';
import RuleManager from './pages/RuleManager';
import Settings from './pages/Settings';
import AuthSuccess from './pages/AuthSuccess';
import AuthError from './pages/AuthError';
import BrandVoicePage from './pages/BrandVoice';
import ContentPillars from './pages/ContentPillars';
import AIGenerator from './pages/AIGenerator';
import Guide from './pages/Guide';
import Workspace from './pages/Workspace';
import ApiKeysSetup from './pages/ApiKeysSetup';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Protected Route — also enforces API key setup gate
const ProtectedRoute = ({ children }) => {
  const { user, loading, setupComplete, setupChecked } = useAuth();
  const location = useLocation();

  if (loading || !setupChecked) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If user hasn't configured Twitter keys, force them to /setup
  // Allow /setup itself to be accessible
  if (!setupComplete && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

// Layout with Sidebar
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`main-content ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <Navbar />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);
  const { theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
        // Check if their API keys are configured
        await checkSetup();
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkSetup = async () => {
    try {
      const res = await apiKeysAPI.get();
      setSetupComplete(res.data?.status?.setupComplete || false);
    } catch {
      setSetupComplete(false);
    } finally {
      setSetupChecked(true);
    }
  };

  const login = async () => {
    try {
      const response = await api.get('/api/auth/twitter');
      if (response.data.success && response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      toast.error('Failed to initiate login');
    }
  };

  const logout = async () => {
    try {
      removeToken();
      await api.post('/api/auth/logout');
      setUser(null);
      setSetupComplete(false);
      setSetupChecked(false);
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      removeToken();
      setUser(null);
      navigate('/');
    }
  };

  const authValue = {
    user, setUser,
    loading,
    login, logout, checkAuth,
    setupComplete, setSetupComplete,
    setupChecked, checkSetup,
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div className="app">
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={user ? <Navigate to={setupComplete ? '/dashboard' : '/setup'} replace /> : <Landing />}
          />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/auth/error" element={<AuthError />} />

          {/* Setup page — inside the dashboard shell so the sidebar stays visible */}
          <Route
            path="/setup"
            element={
              user
                ? (
                  <DashboardLayout>
                    <ApiKeysSetup enforced={!setupComplete} />
                  </DashboardLayout>
                )
                : <Navigate to="/" replace />
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout><Dashboard /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <DashboardLayout><Workspace /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/generate" element={<Navigate to="/workspace?tab=generate" replace />} />
          <Route path="/brand-voice" element={<Navigate to="/workspace?tab=identity" replace />} />
          <Route path="/pillars" element={<Navigate to="/workspace?tab=pillars" replace />} />

          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <DashboardLayout><TweetScheduler /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rules"
            element={
              <ProtectedRoute>
                <DashboardLayout><RuleManager /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout><Settings /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guide"
            element={
              <ProtectedRoute>
                <DashboardLayout><Guide /></DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={theme}
        />
      </div>
    </AuthContext.Provider>
  );
}

export default App;


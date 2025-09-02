import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StockManagement from './pages/StockManagement';
import SalesManagement from './pages/SalesManagement';
import DailyReports from './pages/DailyReports';
import UserManagement from './pages/UserManagement';
import CreditPanel from './pages/CreditPanel';
import ProtectedRoute from './components/ProtectedRoute';

// Security: Clear any potentially cached auth data on app start
const clearAuthCache = () => {
  try {
    // Security: Clear all possible auth-related data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('session') ||
        key.includes('token') ||
        key.includes('user') ||
        key.includes('sb-')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Security: Clear all session storage
    sessionStorage.clear();
    
    // Security: Clear any cookies that might contain auth data
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
  } catch (error) {
    console.warn('Failed to clear auth cache:', error);
  }
};

// Security: Add global error handler for auth errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('auth') || 
      event.error?.message?.includes('session') ||
      event.error?.message?.includes('token')) {
    console.warn('Auth-related error detected, clearing cache');
    clearAuthCache();
  }
});

function App() {
  React.useEffect(() => {
    // Security: Enhanced auth cache clearing on app initialization
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogout = urlParams.get('logout');
    const forceParam = urlParams.get('force');
    
    if (forceLogout === 'true' || forceParam === 'true') {
      clearAuthCache();
      // Security: Clear URL parameters after processing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Security: Add beforeunload handler to clear sensitive data
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear cache, don't prevent unload
      try {
        clearAuthCache();
      } catch (error) {
        console.warn('Failed to clear cache on unload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/stock" element={
                <ProtectedRoute>
                  <Layout>
                    <StockManagement />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/sales" element={
                <ProtectedRoute>
                  <Layout>
                    <SalesManagement />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Layout>
                    <DailyReports />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/users" element={
                <ProtectedRoute>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/credits" element={
                <ProtectedRoute>
                  <Layout>
                    <CreditPanel />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
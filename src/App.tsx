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
    // Clear localStorage items that might contain auth data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    sessionStorage.clear();
  } catch (error) {
    console.warn('Failed to clear auth cache:', error);
  }
};
function App() {
  React.useEffect(() => {
    // Security: Clear any stale auth data on app initialization
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogout = urlParams.get('logout');
    
    if (forceLogout === 'true') {
      clearAuthCache();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
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
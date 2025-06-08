import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginForm from './components/Auth/LoginForm';
import Dashboard from './pages/Dashboard';
import StockManagement from './pages/StockManagement';
import SalesManagement from './pages/SalesManagement';
import UserManagement from './pages/UserManagement';
import CreditPanel from './pages/CreditPanel';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard\" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="stock" element={<StockManagement />} />
              <Route path="sales" element={<SalesManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="credits" element={<CreditPanel />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
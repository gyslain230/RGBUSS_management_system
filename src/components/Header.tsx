import React from 'react';
import { Bell, LogOut, Mail, Clock, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, signOut, sessionTimeRemaining, extendSession, loading } = useAuth();

  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showSessionTimer = sessionTimeRemaining < 5 * 60 * 1000;
  
  const handleSignOut = async () => {
    try {
      // Security: Clear all possible auth data before sign out
      clearCache();
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any Supabase auth tokens
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      await signOut();
      
      // Security: Force complete page reload and redirect
      window.location.replace('/login?logout=true');
    } catch (error) {
      console.error('Sign out error:', error);
      // Security: Force logout even if there's an error
      clearCache();
      localStorage.clear();
      sessionStorage.clear();
      
      // Force redirect even on error
      window.location.replace('/login?logout=true&force=true');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
              Business Management System
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {user && showSessionTimer && sessionTimeRemaining > 0 && (
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  sessionTimeRemaining < 2 * 60 * 1000 
                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                }`}>
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatTimeRemaining(sessionTimeRemaining)}</span>
                </div>
                <button
                  onClick={extendSession}
                  className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Extend
                </button>
              </div>
            )}

            <ThemeToggle />

            <button className="p-2 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 relative transition-colors">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800"></span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {user?.email} • {user?.role}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="p-2 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
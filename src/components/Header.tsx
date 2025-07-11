import React from 'react';
import { Menu, Bell, LogOut, Mail, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, signOut, sessionTimeRemaining, extendSession } = useAuth();

  // Format time remaining for display
  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Show session timer if less than 5 minutes remaining
  const showSessionTimer = sessionTimeRemaining < 5 * 60 * 1000; // 5 minutes

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-xl font-semibold text-gray-900">
              Business Management System
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Session Timer */}
            {user && showSessionTimer && (
              <div className="flex items-center space-x-2">
                <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  sessionTimeRemaining < 2 * 60 * 1000 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatTimeRemaining(sessionTimeRemaining)}</span>
                </div>
                <button
                  onClick={extendSession}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Extend
                </button>
              </div>
            )}

            <button className="p-2 text-gray-400 hover:text-gray-500 relative transition-colors">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-800">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-gray-900">{user?.full_name}</div>
                <div className="text-xs text-gray-500 flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {user?.email} • {user?.role}
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-2 text-gray-400 hover:text-gray-500 transition-colors"
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
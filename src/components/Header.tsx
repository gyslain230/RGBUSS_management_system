import React from 'react';
import { Menu, Bell, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();

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
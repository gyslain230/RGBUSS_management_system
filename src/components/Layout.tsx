import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, extendSession } = useAuth();

  const handleUserActivity = () => {
    if (user) {
      extendSession();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Authentication required</p>
        </div>
      </div>
    );
  }


  return (
    <div 
      className="h-screen grid grid-cols-1 md:grid-cols-[256px_1fr] bg-gray-50 dark:bg-gray-900"
      onClick={handleUserActivity}
      onKeyDown={handleUserActivity}
      onMouseMove={handleUserActivity}
    >
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex flex-col min-h-0">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
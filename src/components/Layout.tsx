import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();

  console.log('Layout: Rendering with user:', user, 'loading:', loading);

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
    console.log('Layout: No user found, should redirect to login');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Authentication required</p>
        </div>
      </div>
    );
  }

  console.log('Layout: Rendering layout for user:', user.email, 'role:', user.role);

  return (
    <div className="h-screen grid grid-cols-1 md:grid-cols-[256px_1fr] bg-gray-50">
      {/* Sidebar - Fixed height, no scroll with page */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-col min-h-0">
        {/* Header - Sticky at top of content area */}
        <Header />
        
        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
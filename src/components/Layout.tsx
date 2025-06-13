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
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <Sidebar />
      
      {/* Main Content Area with Left Margin for Sidebar */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
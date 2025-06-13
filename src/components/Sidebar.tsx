import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  CreditCard,
  Store,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager']
  },
  {
    name: 'Stock Management',
    href: '/stock',
    icon: Package,
    roles: ['admin', 'manager', 'worker']
  },
  {
    name: 'Daily Reports',
    href: '/reports',
    icon: FileText,
    roles: ['admin', 'manager', 'worker']
  },
  {
    name: 'User Management',
    href: '/users',
    icon: Users,
    roles: ['admin']
  },
  {
    name: 'Credit Panel',
    href: '/credits',
    icon: CreditCard,
    roles: ['admin', 'manager', 'worker']
  },
];

export default function Sidebar() {
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || 'worker')
  );

  return (
    <div className="h-full bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-gray-200">
        <Store className="h-8 w-8 text-blue-600" />
        <span className="ml-3 text-xl font-bold text-gray-900">RGBUSS</span>
      </div>
      
      {/* Navigation - Scrollable if needed */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200 ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Info Section - Fixed at bottom */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-800">
                {user?.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
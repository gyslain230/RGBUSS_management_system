import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Store, Phone, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkUsersExist, createInitialAdminUser } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function LoginForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noUsersExist, setNoUsersExist] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Check if any users exist in the system
  useEffect(() => {
    const checkForUsers = async () => {
      try {
        const usersExist = await checkUsersExist();
        setNoUsersExist(!usersExist);
      } catch (error) {
        console.error('Error checking for users:', error);
      } finally {
        setCheckingUsers(false);
      }
    };

    checkForUsers();
  }, []);

  const handleCreateInitialAdmin = async () => {
    setCreatingAdmin(true);
    try {
      const adminCredentials = await createInitialAdminUser();
      setPhone(adminCredentials.phone);
      setPassword(adminCredentials.password);
      setNoUsersExist(false);
      toast.success('Initial admin user created! You can now sign in with the pre-filled credentials.');
    } catch (error: any) {
      console.error('Error creating initial admin:', error);
      toast.error(error.message || 'Failed to create initial admin user');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    try {
      await signIn(phone.trim(), password);
      navigate(from, { replace: true });
    } catch (error: any) {
      // Error handling is done in AuthContext with specific messages
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="flex items-center">
              <Store className="h-12 w-12 text-blue-600" />
              <span className="ml-2 text-3xl font-bold text-gray-900">RGBUSS</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Business Management System
          </p>
        </div>

        {/* No users exist warning */}
        {noUsersExist && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <h3 className="font-medium text-amber-800 mb-2">No Users Found</h3>
                <p className="text-amber-700 mb-3">
                  No user accounts exist in the system yet. You need to create an initial administrator account to get started.
                </p>
                <button
                  onClick={handleCreateInitialAdmin}
                  disabled={creatingAdmin}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingAdmin ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Admin...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Initial Admin
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your phone number (e.g., +1234567890)"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Include country code (e.g., +1 for US, +33 for France)
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || noUsersExist}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need an account? Contact your administrator to create one for you.
            </p>
          </div>
        </form>

        {/* Information about phone authentication */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">📱 Phone Authentication</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Use your phone number with country code to sign in</li>
              <li>Only administrators can create new user accounts</li>
              <li>Contact your admin if you need access to the system</li>
              {noUsersExist && (
                <li className="text-amber-700 font-medium">
                  ⚠️ Create an initial admin account to get started
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Development credentials info */}
        {phone === '+1234567890' && password === 'admin123' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700">
              <p className="font-medium mb-1">🔧 Development Admin Account</p>
              <p className="text-xs">
                Phone: +1234567890 | Password: admin123
              </p>
              <p className="text-xs mt-1">
                This is the initial admin account for development. Change these credentials in production.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
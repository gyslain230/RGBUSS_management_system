import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Store, Mail, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseReady } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { signIn, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // If user is already authenticated, redirect
  React.useEffect(() => {
    if (user && !authLoading) {
      console.log('LoginForm: User already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!isSupabaseReady()) {
      toast.error('Authentication service not configured. Please set up Supabase.');
      return;
    }

    setSubmitting(true);
    try {
      console.log('LoginForm: Starting sign in process...');
      await signIn(email.trim(), password);
      
      // Wait for auth state to update, then navigate
      console.log('LoginForm: Sign in initiated, waiting for auth state...');
      
      // Use a timeout to navigate after auth state should have updated
      setTimeout(() => {
        console.log('LoginForm: Navigating to:', from);
        navigate(from, { replace: true });
      }, 3000);
      
    } catch (error: any) {
      console.error('LoginForm: Login error:', error);
      // Error handling is done in AuthContext with specific messages
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state if either form is submitting or auth is loading
  const isLoading = submitting || authLoading;

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

        {/* Connection Status */}
        <div className={`p-4 rounded-lg border ${
          isSupabaseReady() 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            {isSupabaseReady() ? (
              <Wifi className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600 mr-2" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                isSupabaseReady() ? 'text-green-800' : 'text-red-800'
              }`}>
                {isSupabaseReady() ? 'Connected to Supabase' : 'Supabase Not Configured'}
              </p>
              <p className={`text-xs ${
                isSupabaseReady() ? 'text-green-700' : 'text-red-700'
              }`}>
                {isSupabaseReady() 
                  ? 'Authentication service is ready' 
                  : 'Please set up your Supabase project'
                }
              </p>
            </div>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || !isSupabaseReady()}
                  className="pl-10 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter your email address"
                />
              </div>
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
                  disabled={isLoading || !isSupabaseReady()}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || !isSupabaseReady()}
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
              disabled={isLoading || !isSupabaseReady()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {submitting ? 'Signing in...' : 'Loading profile...'}
                </div>
              ) : !isSupabaseReady() ? (
                'Supabase Not Configured'
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Create one here
              </Link>
            </p>
          </div>
        </form>

        {/* Loading Status */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5"></div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {submitting ? 'Authenticating...' : 'Loading your profile...'}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {submitting 
                    ? 'Verifying your credentials with the server...' 
                    : 'Setting up your dashboard and permissions...'
                  }
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  This may take a few seconds. Please wait...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Tips */}
        {!isLoading && isSupabaseReady() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Authentication Tips
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Make sure you have a stable internet connection</li>
                    <li>If login is slow, please wait - the system is processing your request</li>
                    <li>Create an account first if you don't have one</li>
                    <li>Contact your administrator if you continue having issues</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supabase Configuration Warning */}
        {!isSupabaseReady() && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Supabase Configuration Required
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    The authentication service is not configured. Please set up your Supabase project:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Click "Connect to Supabase" in the top right corner</li>
                    <li>Or configure your environment variables manually</li>
                    <li>Ensure your Supabase URL and API key are correct</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Development credentials info */}
        {isSupabaseReady() && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700">
              <p className="font-medium mb-1">🔧 For Testing</p>
              <p className="text-xs">
                Create an account using the Register page, then sign in here.
              </p>
              <div className="mt-2">
                <Link
                  to="/register"
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Go to Registration →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
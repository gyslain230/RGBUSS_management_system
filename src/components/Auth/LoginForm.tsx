import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Store, AlertCircle, UserPlus, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

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

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (error: any) {
      // Error handling is done in AuthContext with specific messages
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
  };

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

        {/* Test Credentials Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Test Credentials Available
              </h3>
              <div className="mt-2 text-sm text-blue-700 space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestLogin('admin@test.com', 'admin123')}
                    className="text-left p-2 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                  >
                    <div className="font-medium">Admin Account</div>
                    <div className="text-xs">admin@test.com / admin123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestLogin('manager@test.com', 'manager123')}
                    className="text-left p-2 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                  >
                    <div className="font-medium">Manager Account</div>
                    <div className="text-xs">manager@test.com / manager123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestLogin('worker@test.com', 'worker123')}
                    className="text-left p-2 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                  >
                    <div className="font-medium">Worker Account</div>
                    <div className="text-xs">worker@test.com / worker123</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* First Time Setup Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-green-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                New to RGBUSS?
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  If you don't have an account yet, you can create one or use the test credentials above.
                  {' '}
                  <Link
                    to="/register"
                    className="font-medium underline hover:text-green-600 inline-flex items-center"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Create Account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
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
              disabled={loading}
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
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Create one here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
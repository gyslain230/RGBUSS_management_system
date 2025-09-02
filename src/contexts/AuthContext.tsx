import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signInWithEmail, signUpWithEmail, signOut as supabaseSignOut, getCurrentUser, clearCache } from '../lib/supabase';
import { clearAllStorage, isSessionValid, loginRateLimiter } from '../utils/security';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'worker';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionChecked: boolean;
  sessionTimeRemaining: number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'admin' | 'manager' | 'worker') => Promise<void>;
  signOut: () => Promise<void>;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [sessionTimer, setSessionTimer] = useState<NodeJS.Timeout | null>(null);

  // Security: Clear all auth data immediately on provider mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogout = urlParams.get('logout') === 'true';
    const forceParam = urlParams.get('force') === 'true';
    
    if (forceLogout || forceParam) {
      // Security: Force complete logout
      clearAllStorage();
      clearCache();
      setUser(null);
      setSessionChecked(true);
      setLoading(false);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Security: Always check for stale sessions on mount
    checkAuthState();
  }, []);

  // Security: Session timeout management
  useEffect(() => {
    if (user && sessionTimeRemaining > 0) {
      const timer = setInterval(() => {
        setSessionTimeRemaining(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            // Security: Force logout on session expiry
            handleSessionExpiry();
            return 0;
          }
          return newTime;
        });
      }, 1000);

      setSessionTimer(timer);
      return () => clearInterval(timer);
    }
  }, [user, sessionTimeRemaining]);

  // Security: Handle session expiry
  const handleSessionExpiry = useCallback(async () => {
    toast.error('Session expired. Please sign in again.');
    await performSecureSignOut();
  }, []);

  // Security: Enhanced auth state checking
  const checkAuthState = async () => {
    try {
      setLoading(true);
      
      // Security: Clear any potentially stale data first
      clearCache();
      
      const currentUser = await getCurrentUser();
      
      if (currentUser) {
        // Security: Validate user data integrity
        if (!currentUser.id || !currentUser.email || !currentUser.role) {
          throw new Error('Invalid user data structure');
        }
        
        // Security: Validate role is legitimate
        if (!['admin', 'manager', 'worker'].includes(currentUser.role)) {
          throw new Error('Invalid user role');
        }
        
        setUser(currentUser);
        
        // Security: Set session timeout (1 hour)
        setSessionTimeRemaining(60 * 60 * 1000);
      } else {
        setUser(null);
        setSessionTimeRemaining(0);
      }
    } catch (error: any) {
      console.error('Auth state check failed:', error);
      
      // Security: Clear everything on auth check failure
      await performSecureSignOut();
    } finally {
      setSessionChecked(true);
      setLoading(false);
    }
  };

  // Security: Enhanced sign in with rate limiting
  const signIn = async (email: string, password: string) => {
    // Security: Input validation
    if (!email?.trim() || !password) {
      throw new Error('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Security: Rate limiting
    if (!loginRateLimiter.isAllowed(normalizedEmail)) {
      const remainingTime = Math.ceil(loginRateLimiter.getRemainingTime(normalizedEmail) / 60000);
      throw new Error(`Too many login attempts. Please wait ${remainingTime} minutes before trying again.`);
    }

    try {
      setLoading(true);
      
      // Security: Clear any existing data before sign in
      clearCache();
      clearAllStorage();
      
      const { data } = await signInWithEmail(normalizedEmail, password);
      
      if (!data.user || !data.session) {
        throw new Error('Authentication failed - invalid response');
      }

      // Security: Validate session integrity
      if (!isSessionValid(data.session)) {
        throw new Error('Invalid session received');
      }

      // Security: Get fresh user profile
      const userProfile = await getCurrentUser();
      
      if (!userProfile) {
        throw new Error('Failed to load user profile');
      }

      // Security: Validate user profile integrity
      if (!userProfile.id || !userProfile.email || !userProfile.role) {
        throw new Error('Invalid user profile data');
      }

      setUser(userProfile);
      setSessionTimeRemaining(60 * 60 * 1000); // 1 hour
      
      toast.success(`Welcome back, ${userProfile.full_name}!`);
    } catch (error: any) {
      // Security: Clear everything on sign in failure
      setUser(null);
      setSessionTimeRemaining(0);
      clearCache();
      
      // Security: Don't expose internal errors
      const userFriendlyMessage = error.message?.includes('Invalid login credentials') 
        ? 'Invalid email or password'
        : error.message?.includes('Too many requests')
        ? error.message
        : error.message?.includes('network') || error.message?.includes('fetch')
        ? 'Network error. Please check your connection.'
        : 'Sign in failed. Please try again.';
      
      throw new Error(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Security: Enhanced sign up with validation
  const signUp = async (email: string, password: string, fullName: string, role: 'admin' | 'manager' | 'worker' = 'worker') => {
    // Security: Input validation and sanitization
    if (!email?.trim() || !password || !fullName?.trim()) {
      throw new Error('All fields are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const sanitizedFullName = fullName.trim().replace(/[<>]/g, ''); // Basic XSS protection

    // Security: Enhanced validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain uppercase, lowercase, and numbers');
    }

    if (sanitizedFullName.length < 2) {
      throw new Error('Full name must be at least 2 characters long');
    }

    if (!['admin', 'manager', 'worker'].includes(role)) {
      throw new Error('Invalid role specified');
    }

    try {
      setLoading(true);
      
      // Security: Clear any existing data
      clearCache();
      
      await signUpWithEmail(normalizedEmail, password, sanitizedFullName, role);
      
      toast.success('Account created successfully! Please sign in.');
    } catch (error: any) {
      // Security: Don't expose internal errors
      const userFriendlyMessage = error.message?.includes('User already registered')
        ? 'An account with this email already exists'
        : error.message?.includes('network') || error.message?.includes('fetch')
        ? 'Network error. Please check your connection.'
        : error.message || 'Failed to create account. Please try again.';
      
      throw new Error(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Security: Complete secure sign out
  const performSecureSignOut = async () => {
    try {
      // Security: Clear session timer
      if (sessionTimer) {
        clearInterval(sessionTimer);
        setSessionTimer(null);
      }

      // Security: Clear user state immediately
      setUser(null);
      setSessionTimeRemaining(0);
      setSessionChecked(false);
      
      // Security: Clear all caches
      clearCache();
      clearAllStorage();
      
      // Security: Sign out from Supabase
      await supabaseSignOut();
      
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Security: Always clear state even if sign out fails
      setUser(null);
      setSessionTimeRemaining(0);
      clearCache();
      clearAllStorage();
    }
  };

  const signOutHandler = async () => {
    await performSecureSignOut();
  };

  // Security: Extend session
  const extendSession = useCallback(() => {
    if (user) {
      setSessionTimeRemaining(60 * 60 * 1000); // Reset to 1 hour
      toast.success('Session extended for 1 hour');
    }
  }, [user]);

  // Security: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTimer) {
        clearInterval(sessionTimer);
      }
    };
  }, [sessionTimer]);

  // Security: Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Security: Validate session when tab becomes visible
        checkAuthState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Security: Add beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Security: Clear sensitive data on page unload
      if (sessionTimer) {
        clearInterval(sessionTimer);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionTimer]);

  const value = {
    user,
    loading,
    sessionChecked,
    sessionTimeRemaining,
    signIn,
    signUp,
    signOut: signOutHandler,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signInWithEmail, signUpWithEmail, signOut as supabaseSignOut, getCurrentUser, clearCache } from '../lib/supabase';
import { clearAllStorage, isSessionValid, loginRateLimiter, sanitizeInput, isValidEmail, validatePasswordStrength } from '../utils/security';
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

  // Track if session warning has been shown to prevent spam
  const [sessionWarningShown, setSessionWarningShown] = useState(false);

  // Security: Complete auth data clearing on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogout = urlParams.get('logout') === 'true';
    const forceParam = urlParams.get('force') === 'true';
    
    if (forceLogout || forceParam) {
      // Security: Force complete logout
      performCompleteLogout();
      return;
    }

    // Security: Always clear cache and check auth state
    clearCache();
    clearAllStorage();
    checkAuthState();
  }, []);

  // Security: Session timeout management
  useEffect(() => {
    if (user && sessionTimeRemaining > 0) {
      const timer = setInterval(() => {
        setSessionTimeRemaining(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            handleSessionExpiry();
            return 0;
          }
          
          // Show warning only once when session is about to expire
          if (newTime <= 5 * 60 * 1000 && newTime > 4 * 60 * 1000 && !sessionWarningShown) {
            setSessionWarningShown(true);
            toast('Session will expire in 5 minutes', {
              icon: '⏰',
              duration: 4000,
            });
          }
          
          return newTime;
        });
      }, 1000);

      setSessionTimer(timer);
      return () => clearInterval(timer);
    }
  }, [user, sessionTimeRemaining, sessionWarningShown]);

  // Security: Handle session expiry
  const handleSessionExpiry = useCallback(async () => {
    toast.error('Session expired. Please sign in again.');
    await performCompleteLogout();
  }, []);

  // Security: Complete logout function
  const performCompleteLogout = async () => {
    try {
      // Clear session timer
      if (sessionTimer) {
        clearInterval(sessionTimer);
        setSessionTimer(null);
      }

      // Clear user state immediately
      setUser(null);
      setSessionTimeRemaining(0);
      setSessionChecked(false);
      
      // Clear all caches and storage
      clearCache();
      clearAllStorage();
      
      // Sign out from Supabase
      await supabaseSignOut();
      
      // Force page redirect to login
      window.location.replace('/login');
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if error occurs
      setUser(null);
      setSessionTimeRemaining(0);
      clearCache();
      clearAllStorage();
      window.location.replace('/login');
    }
  };

  // Security: Enhanced auth state checking
  const checkAuthState = async () => {
    try {
      setLoading(true);
      
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
        setSessionTimeRemaining(60 * 60 * 1000); // 1 hour
      } else {
        setUser(null);
        setSessionTimeRemaining(0);
      }
    } catch (error: any) {
      console.error('Auth state check failed:', error);
      await performCompleteLogout();
    } finally {
      setSessionChecked(true);
      setLoading(false);
    }
  };

  // Security: Enhanced sign in with comprehensive validation
  const signIn = async (email: string, password: string) => {
    console.log('SignIn attempt started for:', email);
    
    // Security: Input validation
    if (!email?.trim() || !password) {
      throw new Error('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Security: Email validation
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    // Security: Rate limiting
    if (!loginRateLimiter.isAllowed(normalizedEmail)) {
      const remainingTime = Math.ceil(loginRateLimiter.getRemainingTime(normalizedEmail) / 60000);
      throw new Error(`Too many login attempts. Please wait ${remainingTime} minutes before trying again.`);
    }

    try {
      setLoading(true);
      console.log('Starting authentication process...');
      
      // Security: Clear any existing data before sign in
      clearCache();
      // Don't clear all storage during login - only clear auth-specific items
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth') || key.includes('session')
      );
      authKeys.forEach(key => localStorage.removeItem(key));
      
      const { data } = await signInWithEmail(normalizedEmail, password);
      console.log('Authentication response received:', !!data.user);
      
      if (!data || !data.user || !data.session) {
        throw new Error('Authentication failed - invalid response');
      }

      // Security: Validate session integrity
      if (!isSessionValid(data.session)) {
        throw new Error('Invalid session received');
      }

      console.log('Getting user profile...');
      // Security: Get fresh user profile
      const userProfile = await getCurrentUser();
      console.log('User profile received:', !!userProfile);
      
      if (!userProfile) {
        throw new Error('Failed to load user profile');
      }

      // Security: Validate user profile integrity
      if (!userProfile.id || !userProfile.email || !userProfile.role) {
        throw new Error('Invalid user profile data');
      }

      console.log('Setting user state and session...');
      setUser(userProfile);
      setSessionTimeRemaining(60 * 60 * 1000); // 1 hour
      setSessionChecked(true); // Mark session as checked
      
      console.log('Login successful for user:', userProfile.full_name);
      
      // Return success to indicate login completed
      return { success: true, user: userProfile };
    } catch (error: any) {
      console.error('SignIn error:', error);
      // Security: Clear everything on sign in failure
      setUser(null);
      setSessionTimeRemaining(0);
      setSessionChecked(true); // Mark as checked even on failure
      clearCache();
      
      // Security: Sanitized error messages
      const userFriendlyMessage = error.message?.includes('Invalid login credentials') 
        ? 'Invalid email or password'
        : error.message?.includes('Too many requests') || error.message?.includes('rate limit')
        ? error.message
        : error.message?.includes('network') || error.message?.includes('fetch')
        ? 'Network error. Please check your connection.'
        : 'Sign in failed. Please try again.';
      
      throw new Error(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Security: Enhanced sign up with comprehensive validation
  const signUp = async (email: string, password: string, fullName: string, role: 'admin' | 'manager' | 'worker' = 'worker') => {
    // Security: Input validation and sanitization
    if (!email?.trim() || !password || !fullName?.trim()) {
      throw new Error('All fields are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const sanitizedFullName = sanitizeInput(fullName.trim());

    // Security: Enhanced validation
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    if (!validatePasswordStrength(password).isValid) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and numbers');
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
      clearAllStorage();
      
      await signUpWithEmail(normalizedEmail, password, sanitizedFullName, role);
      
      toast.success('Account created successfully! Please sign in.');
    } catch (error: any) {
      // Security: Sanitized error messages
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

  // Security: Extend session with validation
  const extendSession = useCallback(() => {
    if (user && sessionTimeRemaining > 0) {
      setSessionTimeRemaining(60 * 60 * 1000); // Reset to 1 hour
      setSessionWarningShown(false); // Reset warning flag
      toast.success('Session extended for 1 hour');
    }
  }, [user, sessionTimeRemaining]);

  // Security: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTimer) {
        clearInterval(sessionTimer);
      }
    };
  }, [sessionTimer]);

  // Security: Visibility change handler for session validation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Security: Re-validate session when tab becomes visible
        checkAuthState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Security: Beforeunload handler for cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionTimer) {
        clearInterval(sessionTimer);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionTimer]);

  // Security: Global error handler
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('auth') || event.error?.message?.includes('session')) {
        console.error('Global auth error:', event.error);
        performCompleteLogout();
      }
    };

    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  const value = {
    user,
    loading,
    sessionChecked,
    sessionTimeRemaining,
    signIn,
    signUp,
    signOut: performCompleteLogout,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
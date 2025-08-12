import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, signInWithEmail, signUpWithEmail, signOut as supabaseSignOut, isSupabaseReady } from '../lib/supabase';
import toast from 'react-hot-toast';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIMEOUT = 13 * 60 * 1000; // Show warning at 13 minutes

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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  extendSession: () => void;
  sessionTimeRemaining: number;
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
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(INACTIVITY_TIMEOUT);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [warningShown, setWarningShown] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false);
      return;
    }
    
    const getInitialSession = async () => {
      try {
        // Clear any existing session data first
        setUser(null);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          await supabase.auth.signOut();
          setLoading(false);
          setSessionChecked(true);
          return;
        }
        
        if (!session?.user) {
          // No active session
          setLoading(false);
          setSessionChecked(true);
          return;
        }
        
        // Validate session is not expired
        if (session.expires_at && session.expires_at * 1000 < Date.now()) {
          console.warn('Session expired, signing out');
          await supabase.auth.signOut();
          setLoading(false);
          setSessionChecked(true);
          return;
        }
        
        const profile = await getCurrentUser();
        if (profile) {
          setUser(profile);
          setLastActivity(Date.now());
        } else {
          // Profile not found, sign out
          await supabase.auth.signOut();
        }
      } catch (error: any) {
        console.error('Session check error:', error);
        await supabase.auth.signOut();
      } finally {
        setLoading(false);
        setSessionChecked(true);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user && sessionChecked) {
          setLoading(true);
          
          // Validate the session
          if (session.expires_at && session.expires_at * 1000 < Date.now()) {
            console.warn('Received expired session, signing out');
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          
          const profile = await getCurrentUser();
          if (profile) {
            setUser(profile);
            setLastActivity(Date.now());
          } else {
            await supabase.auth.signOut();
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setUser(null);
          if (event === 'SIGNED_OUT') {
            // Clear all local storage and session data
            localStorage.clear();
            sessionStorage.clear();
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionChecked]);

  useEffect(() => {
    if (!user) {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }
      setSessionTimeRemaining(INACTIVITY_TIMEOUT);
      setWarningShown(false);
      return;
    }

    const updateActivity = () => {
      setLastActivity(Date.now());
      setWarningShown(false);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    const startSessionTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      const timer = setTimeout(async () => {
        toast.error('Session expired due to inactivity. Please sign in again.');
        await signOut();
      }, INACTIVITY_TIMEOUT);

      setInactivityTimer(timer);
    };

    const startWarningTimer = () => {
      setTimeout(() => {
        if (user && !warningShown) {
          setWarningShown(true);
          toast((t) => (
            <div className="flex flex-col space-y-2">
              <span className="font-medium">Session expiring soon!</span>
              <span className="text-sm">You'll be signed out in 2 minutes due to inactivity.</span>
              <button
                onClick={() => {
                  extendSession();
                  toast.dismiss(t.id);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Stay signed in
              </button>
            </div>
          ), {
            duration: 120000, // Show for 2 minutes
            icon: '⏰',
          });
        }
      }, WARNING_TIMEOUT);
    };

    startSessionTimer();
    startWarningTimer();

    const updateTimer = setInterval(() => {
      const timeElapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, INACTIVITY_TIMEOUT - timeElapsed);
      setSessionTimeRemaining(remaining);

      if (remaining === 0 && user) {
        clearInterval(updateTimer);
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      clearInterval(updateTimer);
    };
  }, [user, lastActivity, inactivityTimer, warningShown]);

  const extendSession = () => {
    setLastActivity(Date.now());
    setWarningShown(false);
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseReady()) {
      toast.error('Authentication service not configured. Please set up Supabase.');
      throw new Error('Supabase not configured');
    }

    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    try {
      // Clear any existing session first
      await supabase.auth.signOut();
      
      const { user: authUser } = await signInWithEmail(email, password);
      
      if (!authUser) {
        throw new Error('Authentication failed - no user returned');
      }

      setLastActivity(Date.now());
      setWarningShown(false);
      toast.success('Signing in...');
      
    } catch (error: any) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again.';
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'No account found with this email address. Please contact your administrator to create an account.';
      } else if (error.message?.includes('Signup not allowed')) {
        errorMessage = 'Account creation is restricted. Please contact your administrator.';
      } else if (error.message?.includes('Supabase not configured')) {
        errorMessage = 'Authentication service not configured. Please set up Supabase.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet connection and try again.';
      } else if (error.message?.includes('authentication service')) {
        errorMessage = 'Unable to connect to authentication service. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    if (!isSupabaseReady()) {
      toast.error('Authentication service not configured. Please set up Supabase.');
      throw new Error('Supabase not configured');
    }

    // Validate input
    if (!email || !password || !fullName) {
      throw new Error('All fields are required');
    }

    if (!email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (fullName.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters long');
    }

    try {
      const { user: authUser } = await signUpWithEmail(
        email, 
        password, 
        fullName, 
        role as 'admin' | 'manager' | 'worker'
      );

      if (!authUser) {
        throw new Error('User creation failed');
      }

      toast.success('Account created successfully! You can now sign in.');
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'A user with this email address already exists. Please sign in instead.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message?.includes('Signup not allowed')) {
        errorMessage = 'Account creation is currently restricted. Please contact your administrator.';
      } else if (error.message?.includes('Supabase not configured')) {
        errorMessage = 'Authentication service not configured. Please set up Supabase.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message?.includes('authentication service') ||
                 error.message?.includes('database service')) {
        errorMessage = 'Unable to connect to service. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear user state immediately
      setUser(null);
      setLoading(false);
      
      // Clear all timers
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }
      
      setLastActivity(Date.now());
      setWarningShown(false);
      
      // Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      if (!isSupabaseReady()) {
        toast.success('Signed out successfully!');
        return;
      }

      // Sign out from Supabase
      await supabaseSignOut();
      
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Even if sign out fails, clear local state
      setUser(null);
      setLoading(false);
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Signed out successfully!');
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    extendSession,
    sessionTimeRemaining,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
    if (!isSupabaseReady()) {
      setUser(null);
      setLoading(false);
      toast.success('Signed out successfully!');
      return;
    }

    try {
      await supabaseSignOut();
      
      setUser(null);
      setLoading(false);
      
      setLastActivity(Date.now());
      setWarningShown(false);
      toast.success('Signed out successfully!');
    } catch (error: any) {
      setUser(null);
      setLoading(false);
      toast.error(error.message || 'Sign out failed. Please try again.');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    extendSession,
    sessionTimeRemaining,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
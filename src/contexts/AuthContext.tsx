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

  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false);
      return;
    }
    
    const getInitialSession = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 10000);
        });

        const sessionPromise = supabase.auth.getSession();
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) {
          if (error.message?.includes('Failed to fetch') || 
              error.message?.includes('fetch') ||
              error.message?.includes('network') ||
              error.message?.includes('timeout')) {
            toast.error('Unable to connect to authentication service. Please check your connection.');
          }
          
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          try {
            const profile = await getCurrentUser();
            
            if (profile) {
              setUser(profile);
            }
          } catch (profileError: any) {
            if (profileError.message?.includes('Supabase configuration') ||
                profileError.message?.includes('authentication service') ||
                profileError.message?.includes('database service')) {
              toast.error('Database connection error. Please check your Supabase configuration.');
            }
          }
        }
      } catch (error: any) {
        if (error.message?.includes('timeout')) {
          toast.error('Connection timeout. Please check your internet connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 15000); // 15 second timeout
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          setLoading(true);
          
          try {
            let retries = 2;
            let profile = null;
            
            while (retries > 0 && !profile) {
              try {
                const profilePromise = getCurrentUser();
                const timeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(() => reject(new Error('Profile loading timeout')), 8000);
                });
                
                profile = await Promise.race([profilePromise, timeoutPromise]);
                
                if (profile) {
                  setUser(profile);
                  clearTimeout(timeoutId);
                  setLoading(false);
                  return;
                }
              } catch (profileError: any) {
                retries--;
                
                if (retries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                  if (profileError.message?.includes('timeout')) {
                    toast.error('Profile loading timed out. Please refresh the page.');
                  } else if (profileError.message?.includes('Supabase configuration') ||
                           profileError.message?.includes('authentication service') ||
                           profileError.message?.includes('database service')) {
                    toast.error('Database connection error. Please check your Supabase configuration.');
                  } else {
                    toast.error('Error loading user profile. Please try refreshing the page.');
                  }
                }
              }
            }
            
          } catch (profileError: any) {
            toast.error('Error loading user profile. Please try again.');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          clearTimeout(timeoutId);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          clearTimeout(timeoutId);
        } else {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

    try {
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
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, signInWithEmail, signUpWithEmail, signOut as supabaseSignOut, isSupabaseReady } from '../lib/supabase';
import toast from 'react-hot-toast';

// Session management constants
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
    console.log('AuthProvider: Initializing...');
    
    // Check if Supabase is configured
    if (!isSupabaseReady()) {
      console.warn('AuthProvider: Supabase not configured, skipping authentication');
      setLoading(false);
      return;
    }
    
    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Checking for existing session...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 10000);
        });

        const sessionPromise = supabase.auth.getSession();
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
          
          // Handle network errors gracefully
          if (error.message?.includes('Failed to fetch') || 
              error.message?.includes('fetch') ||
              error.message?.includes('network') ||
              error.message?.includes('timeout')) {
            console.error('AuthProvider: Network error - Supabase may not be accessible');
            toast.error('Unable to connect to authentication service. Please check your connection.');
          }
          
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('AuthProvider: Found existing session for user:', session.user.email);
          try {
            const profile = await getCurrentUser();
            
            if (profile) {
              setUser(profile);
              console.log('AuthProvider: User profile loaded:', profile.email, 'Role:', profile.role);
            } else {
              console.log('AuthProvider: No profile found for authenticated user');
            }
          } catch (profileError: any) {
            console.error('AuthProvider: Error loading user profile:', profileError);
            
            // Handle configuration errors
            if (profileError.message?.includes('Supabase configuration') ||
                profileError.message?.includes('authentication service') ||
                profileError.message?.includes('database service')) {
              toast.error('Database connection error. Please check your Supabase configuration.');
            }
          }
        } else {
          console.log('AuthProvider: No existing session found');
        }
      } catch (error: any) {
        console.error('AuthProvider: Error during initialization:', error);
        
        if (error.message?.includes('timeout')) {
          toast.error('Connection timeout. Please check your internet connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes with comprehensive error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('AuthProvider: Auth state change timeout, clearing loading state');
        setLoading(false);
      }, 15000); // 15 second timeout
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in:', session.user.email);
          setLoading(true); // Set loading for profile fetch
          
          try {
            // Add retry logic for profile loading with shorter timeouts
            let retries = 2;
            let profile = null;
            
            while (retries > 0 && !profile) {
              try {
                console.log(`AuthProvider: Attempting to load profile (${3 - retries}/2)...`);
                
                // Add timeout for each profile loading attempt
                const profilePromise = getCurrentUser();
                const timeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(() => reject(new Error('Profile loading timeout')), 8000);
                });
                
                profile = await Promise.race([profilePromise, timeoutPromise]);
                
                if (profile) {
                  setUser(profile);
                  console.log('AuthProvider: Profile loaded after sign in:', profile.email);
                  clearTimeout(timeoutId);
                  setLoading(false);
                  return;
                }
              } catch (profileError: any) {
                console.error(`AuthProvider: Profile loading attempt ${3 - retries} failed:`, profileError);
                retries--;
                
                if (retries > 0) {
                  // Wait before retrying
                  await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                  // Last attempt failed
                  console.error('AuthProvider: All profile loading attempts failed');
                  
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
            console.error('AuthProvider: Error in profile loading logic:', profileError);
            toast.error('Error loading user profile. Please try again.');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          console.log('AuthProvider: User signed out');
          clearTimeout(timeoutId);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthProvider: Token refreshed');
          clearTimeout(timeoutId);
          // Don't change loading state for token refresh
        } else {
          // Handle other events
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (error) {
        console.error('AuthProvider: Error in auth state change handler:', error);
        clearTimeout(timeoutId);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Session management effects
  useEffect(() => {
    if (!user) {
      // Clear timers when user is not logged in
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }
      setSessionTimeRemaining(INACTIVITY_TIMEOUT);
      setWarningShown(false);
      return;
    }

    // Set up activity tracking
    const updateActivity = () => {
      setLastActivity(Date.now());
      setWarningShown(false);
    };

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Set up session timer
    const startSessionTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      const timer = setTimeout(async () => {
        console.log('Session expired due to inactivity');
        toast.error('Session expired due to inactivity. Please sign in again.');
        await signOut();
      }, INACTIVITY_TIMEOUT);

      setInactivityTimer(timer);
    };

    // Set up warning timer
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

    // Update session time remaining every second
    const updateTimer = setInterval(() => {
      const timeElapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, INACTIVITY_TIMEOUT - timeElapsed);
      setSessionTimeRemaining(remaining);

      if (remaining === 0 && user) {
        clearInterval(updateTimer);
      }
    }, 1000);

    // Cleanup function
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

  // Handle window/tab close
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // Sign out when window is closed
      await signOut();
    };


    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // Function to extend session
  const extendSession = () => {
    setLastActivity(Date.now());
    setWarningShown(false);
    console.log('Session extended');
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseReady()) {
      toast.error('Authentication service not configured. Please set up Supabase.');
      throw new Error('Supabase not configured');
    }

    try {
      console.log('AuthProvider: Attempting to sign in with email:', email);
      
      const { user: authUser } = await signInWithEmail(email, password);
      
      if (!authUser) {
        throw new Error('Authentication failed - no user returned');
      }

      console.log('AuthProvider: Sign in successful, auth state change will handle profile loading');
      
      // Reset session timers on successful sign in
      setLastActivity(Date.now());
      setWarningShown(false);
      toast.success('Signing in...');
      
      // Don't set loading here - let the auth state change handler manage it
      
    } catch (error: any) {
      console.error('AuthProvider: Sign in failed:', error);
      
      // Handle specific Supabase auth errors
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
      console.log('AuthProvider: Attempting to sign up with email:', email, 'role:', role);
      
      const { user: authUser } = await signUpWithEmail(
        email, 
        password, 
        fullName, 
        role as 'admin' | 'manager' | 'worker'
      );

      if (!authUser) {
        throw new Error('User creation failed');
      }

      console.log('AuthProvider: User created successfully');
      toast.success('Account created successfully! You can now sign in.');
    } catch (error: any) {
      console.error('AuthProvider: Sign up failed:', error);
      
      // Handle specific Supabase auth errors
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
      console.warn('Supabase not configured, clearing local state only');
      setUser(null);
      setLoading(false);
      toast.success('Signed out successfully!');
      return;
    }

    try {
      console.log('AuthProvider: Signing out...');
      
      await supabaseSignOut();
      
      setUser(null);
      setLoading(false);
      console.log('AuthProvider: Successfully signed out');
      
      // Clear session state
      setLastActivity(Date.now());
      setWarningShown(false);
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('AuthProvider: Sign out failed:', error);
      // Even if sign out fails, clear the local user state
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

  console.log('AuthProvider: Current state - User:', user?.email || 'None', 'Loading:', loading, 'Supabase Ready:', isSupabaseReady());

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
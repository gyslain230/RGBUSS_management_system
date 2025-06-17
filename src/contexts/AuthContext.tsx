import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, signInWithEmail, signUpWithEmail, signOut as supabaseSignOut, isSupabaseReady } from '../lib/supabase';
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    console.log('AuthProvider: Initializing...');
    
    // Check if Supabase is configured
    if (!isSupabaseReady()) {
      console.warn('AuthProvider: Supabase not configured, skipping authentication');
      setLoading(false);
      return;
    }
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Checking for existing session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
          
          // Handle network errors gracefully
          if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
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
            if (profileError.message?.includes('Supabase configuration')) {
              toast.error('Database connection error. Please check your Supabase configuration.');
            }
          }
        } else {
          console.log('AuthProvider: No existing session found');
        }
      } catch (error) {
        console.error('AuthProvider: Error during initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in:', session.user.email);
          
          try {
            const profile = await getCurrentUser();
            
            if (profile) {
              setUser(profile);
              console.log('AuthProvider: Profile loaded after sign in:', profile.email);
            } else {
              console.error('AuthProvider: No profile found after sign in');
              toast.error('Profile not found. Please contact administrator.');
            }
          } catch (profileError: any) {
            console.error('AuthProvider: Error loading profile after sign in:', profileError);
            
            // Handle configuration errors
            if (profileError.message?.includes('Supabase configuration')) {
              toast.error('Database connection error. Please check your Supabase configuration.');
            } else {
              toast.error('Error loading user profile. Please try again.');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          console.log('AuthProvider: User signed out');
        }
      } catch (error) {
        console.error('AuthProvider: Error in auth state change handler:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

      console.log('AuthProvider: Sign in successful, waiting for profile...');
      toast.success('Signing in...');
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
      toast.success('Signed out successfully!');
      return;
    }

    try {
      console.log('AuthProvider: Signing out...');
      
      await supabaseSignOut();
      
      setUser(null);
      console.log('AuthProvider: Successfully signed out');
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('AuthProvider: Sign out failed:', error);
      // Even if sign out fails, clear the local user state
      setUser(null);
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
  };

  console.log('AuthProvider: Current state - User:', user?.email || 'None', 'Loading:', loading, 'Supabase Ready:', isSupabaseReady());

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
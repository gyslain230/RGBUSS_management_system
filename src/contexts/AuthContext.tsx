import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, signInWithPhone, signUpWithPhone, signOut as supabaseSignOut } from '../lib/supabase';
import toast from 'react-hot-toast';

interface User {
  id: string;
  phone_number: string;
  full_name: string;
  role: 'admin' | 'manager' | 'worker';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (phone: string, password: string, fullName: string, role: string) => Promise<void>;
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
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('AuthProvider: Found existing session');
          const profile = await getCurrentUser();
          if (profile) {
            setUser(profile);
            console.log('AuthProvider: User profile loaded:', profile.phone_number, 'Role:', profile.role);
          }
        } else {
          console.log('AuthProvider: No existing session');
        }
      } catch (error) {
        console.error('AuthProvider: Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getCurrentUser();
        if (profile) {
          setUser(profile);
          console.log('AuthProvider: User signed in:', profile.phone_number);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        console.log('AuthProvider: User signed out');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (phone: string, password: string) => {
    try {
      console.log('AuthProvider: Attempting to sign in with phone:', phone);
      
      // Format phone number (ensure it starts with +)
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const { user: authUser } = await signInWithPhone(formattedPhone, password);
      
      if (!authUser) {
        throw new Error('Authentication failed');
      }

      const profile = await getCurrentUser();
      if (!profile) {
        throw new Error('User profile not found');
      }

      setUser(profile);
      console.log('AuthProvider: Successfully signed in:', profile.phone_number, 'Role:', profile.role);
      toast.success(`Signed in successfully as ${profile.role}!`);
    } catch (error: any) {
      console.error('AuthProvider: Sign in failed:', error);
      
      // Handle specific Supabase auth errors
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid phone number or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your phone number before signing in.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again.';
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'No account found with this phone number. Please contact your administrator to create an account.';
      } else if (error.message?.includes('Signup not allowed')) {
        errorMessage = 'Account creation is restricted. Please contact your administrator.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const signUp = async (phone: string, password: string, fullName: string, role: string) => {
    try {
      console.log('AuthProvider: Attempting to sign up with phone:', phone, 'role:', role);
      
      // Format phone number (ensure it starts with +)
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const { user: authUser } = await signUpWithPhone(
        formattedPhone, 
        password, 
        fullName, 
        role as 'admin' | 'manager' | 'worker'
      );

      if (!authUser) {
        throw new Error('User creation failed');
      }

      console.log('AuthProvider: User created successfully');
      toast.success('User created successfully!');
    } catch (error: any) {
      console.error('AuthProvider: Sign up failed:', error);
      
      // Handle specific Supabase auth errors
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'A user with this phone number already exists. Please sign in instead.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message?.includes('Invalid phone number')) {
        errorMessage = 'Please enter a valid phone number with country code (e.g., +1234567890).';
      } else if (error.message?.includes('Signup not allowed')) {
        errorMessage = 'Account creation is currently restricted. Please contact your administrator.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out...');
      await supabaseSignOut();
      setUser(null);
      console.log('AuthProvider: Successfully signed out');
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('AuthProvider: Sign out failed:', error);
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

  console.log('AuthProvider: Current state - User:', user?.phone_number, 'Loading:', loading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'worker';
  full_name: string;
  created_at: string;
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

// Default test users for easy testing
const DEFAULT_USERS = [
  {
    id: '1',
    email: 'admin@test.com',
    password: 'admin123',
    full_name: 'Admin User',
    role: 'admin' as const,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    email: 'manager@test.com',
    password: 'manager123',
    full_name: 'Manager User',
    role: 'manager' as const,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    email: 'worker@test.com',
    password: 'worker123',
    full_name: 'Worker User',
    role: 'worker' as const,
    created_at: new Date().toISOString()
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Initializing...');
    
    try {
      // Initialize default users in localStorage if they don't exist
      const existingUsers = localStorage.getItem('users');
      if (!existingUsers) {
        console.log('AuthProvider: Creating default users');
        localStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
      }

      // Check for existing session
      const currentUser = localStorage.getItem('currentUser');
      console.log('AuthProvider: Checking for existing session:', currentUser);
      
      if (currentUser) {
        try {
          const parsedUser = JSON.parse(currentUser);
          console.log('AuthProvider: Found existing user:', parsedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('AuthProvider: Error parsing stored user:', error);
          localStorage.removeItem('currentUser');
        }
      }
    } catch (error) {
      console.error('AuthProvider: Initialization error:', error);
    } finally {
      setLoading(false);
      console.log('AuthProvider: Initialization complete');
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Attempting to sign in with:', email);
      
      // Get users from localStorage
      const usersData = localStorage.getItem('users');
      if (!usersData) {
        throw new Error('No users found. Please create an account first.');
      }

      const users = JSON.parse(usersData);
      console.log('AuthProvider: Available users:', users.map((u: any) => ({ email: u.email, role: u.role })));
      
      const foundUser = users.find((u: any) => u.email === email && u.password === password);

      if (!foundUser) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }

      console.log('AuthProvider: User found:', foundUser);

      // Create user object without password
      const userWithoutPassword = {
        id: foundUser.id,
        email: foundUser.email,
        full_name: foundUser.full_name,
        role: foundUser.role,
        created_at: foundUser.created_at
      };

      console.log('AuthProvider: Setting user:', userWithoutPassword);

      // Store current user
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);

      console.log('AuthProvider: Successfully signed in:', foundUser.email, 'Role:', foundUser.role);
      toast.success(`Signed in successfully as ${foundUser.role}!`);
    } catch (error: any) {
      console.error('AuthProvider: Sign in failed:', error);
      toast.error(error.message || 'Login failed. Please try again.');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    try {
      console.log('AuthProvider: Attempting to sign up with:', email, role);
      
      // Get existing users
      const usersData = localStorage.getItem('users') || '[]';
      const users = JSON.parse(usersData);

      // Check if user already exists
      const existingUser = users.find((u: any) => u.email === email);
      if (existingUser) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(),
        email: email,
        password: password,
        full_name: fullName,
        role: role as 'admin' | 'manager' | 'worker',
        created_at: new Date().toISOString()
      };

      // Add to users array
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));

      console.log('AuthProvider: User created successfully');
      toast.success('Account created successfully! You can now sign in.');
    } catch (error: any) {
      console.error('AuthProvider: Sign up failed:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out...');
      localStorage.removeItem('currentUser');
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

  console.log('AuthProvider: Current state - User:', user, 'Loading:', loading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
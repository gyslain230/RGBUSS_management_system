import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are properly configured
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_key' &&
  isValidUrl(supabaseUrl);

if (!isSupabaseConfigured) {
  console.warn('Supabase is not properly configured. Please set up your Supabase project by clicking "Connect to Supabase" in the top right corner.');
}

// Create a mock client for development when Supabase is not configured
const createMockClient = () => ({
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Return a mock subscription object
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
    update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }) }),
    delete: () => ({ neq: () => Promise.resolve({ error: new Error('Supabase not configured') }) }),
  }),
});

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient() as any;

// Database types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'worker';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  description?: string;
  status: 'approved' | 'pending';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  product_name: string;
  quantity_sold: number;
  unit_price: number;
  total_amount: number;
  sold_by: string;
  customer_name?: string;
  is_credit: boolean;
  created_at: string;
}

export interface Credit {
  id: string;
  sale_id: string | null;
  customer_name: string;
  amount: number;
  product_name: string;
  issued_by: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface StockAdjustment {
  id: string;
  product_id: string;
  product_name: string;
  adjustment_type: 'increase' | 'decrease';
  quantity_adjusted: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  adjusted_by: string;
  adjusted_by_name: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  total_sales: number;
  total_revenue: number;
  products_sold: number;
  created_at: string;
  report_data: any;
  created_by: string;
}

// Auth helper functions
export const getCurrentUser = async () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured');
    return null;
  }

  try {
    console.log('getCurrentUser: Getting authenticated user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('getCurrentUser: Error getting auth user:', userError);
      return null;
    }
    
    if (!user) {
      console.log('getCurrentUser: No authenticated user found');
      return null;
    }

    console.log('getCurrentUser: Getting profile for user:', user.id);
    
    // Use a more robust query with better error handling
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('getCurrentUser: Error getting user profile:', profileError);
      
      // Provide more specific error information
      if (profileError.code === 'PGRST116') {
        console.error('getCurrentUser: No profile found for user ID:', user.id);
        return null;
      } else if (profileError.code === '42501') {
        console.error('getCurrentUser: Permission denied accessing profile');
        return null;
      } else {
        console.error('getCurrentUser: Database error:', profileError.message);
        return null;
      }
    }

    if (!profile) {
      console.error('getCurrentUser: Profile query returned null');
      return null;
    }

    console.log('getCurrentUser: Profile loaded successfully:', profile.email);
    return profile;
  } catch (error) {
    console.error('getCurrentUser: Unexpected error:', error);
    return null;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  console.log('Attempting to sign in with email:', email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error);
    throw error;
  }

  console.log('Sign in successful for:', email);
  return data;
};

export const signUpWithEmail = async (email: string, password: string, fullName: string, role: 'admin' | 'manager' | 'worker' = 'worker') => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  try {
    console.log('Creating user account for:', email, 'with role:', role);
    
    // Create the auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned from authentication');
    }

    console.log('Auth user created successfully:', authData.user.id);

    // Wait a moment for any triggers to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if profile was created by trigger
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking for existing profile:', profileCheckError);
      // Don't throw here, continue to manual creation
    }

    if (!existingProfile) {
      console.log('Profile not created by trigger, creating manually...');
      
      // Create profile manually
      const profileData = {
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Inserting profile data:', profileData);

      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile manually:', profileError);
        
        // Provide more specific error information
        if (profileError.code === '23505') {
          throw new Error('A user with this email already exists');
        } else if (profileError.code === '42501') {
          throw new Error('Permission denied. Please check your database policies');
        } else {
          throw new Error(`Database error saving new user: ${profileError.message}`);
        }
      }

      console.log('Profile created manually:', newProfile);
      return { ...authData, profile: newProfile };
    } else {
      console.log('Profile created successfully by trigger:', existingProfile);
      return { ...authData, profile: existingProfile };
    }
  } catch (error: any) {
    console.error('SignUp error:', error);
    
    // Provide user-friendly error messages
    if (error.message?.includes('User already registered')) {
      throw new Error('A user with this email address already exists');
    } else if (error.message?.includes('Password should be at least')) {
      throw new Error('Password must be at least 6 characters long');
    } else if (error.message?.includes('Invalid email')) {
      throw new Error('Please enter a valid email address');
    } else if (error.message?.includes('Database error saving new user')) {
      throw error; // Re-throw our custom database error
    } else {
      throw new Error(error.message || 'Failed to create user account');
    }
  }
};

export const signOut = async () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured');
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Utility functions for data operations
export const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createSale = async (saleData: Omit<Sale, 'id' | 'created_at'>) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const { data, error } = await supabase
    .from('sales')
    .insert([saleData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createCredit = async (creditData: Omit<Credit, 'id' | 'created_at' | 'updated_at'>) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const { data, error } = await supabase
    .from('credits')
    .insert([creditData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCredit = async (id: string, updates: Partial<Credit>) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const { data, error } = await supabase
    .from('credits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createStockAdjustment = async (adjustmentData: Omit<StockAdjustment, 'id' | 'created_at'>) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const { data, error } = await supabase
    .from('stock_adjustments')
    .insert([adjustmentData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Debug functions
export const debugDatabase = async () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Cannot debug database.');
    return;
  }

  console.log('Database Debug Information:');
  
  const tables = ['profiles', 'products', 'sales', 'credits', 'stock_adjustments', 'daily_reports'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error fetching ${table}:`, error);
      } else {
        console.log(`${table}:`, data?.length || 0, 'items');
        if (data && data.length > 0) {
          console.log(`   Latest item:`, data[data.length - 1]);
        }
      }
    } catch (err) {
      console.error(`Error with table ${table}:`, err);
    }
  }
};

export const clearAllData = async () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Cannot clear data.');
    return;
  }

  console.log('Clearing all database data...');
  
  const tables = ['daily_reports', 'stock_adjustments', 'credits', 'sales', 'products'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.error(`Error clearing ${table}:`, error);
      } else {
        console.log(`Cleared ${table}`);
      }
    } catch (err) {
      console.error(`Error clearing table ${table}:`, err);
    }
  }
  
  console.log('All data cleared');
};

// Export configuration status for components to check
export const isSupabaseReady = () => isSupabaseConfigured;
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
  phone_number: string;
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
};

export const signInWithPhone = async (phone: string, password: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password,
  });

  if (error) throw error;
  return data;
};

export const signUpWithPhone = async (phone: string, password: string, fullName: string, role: 'admin' | 'manager' | 'worker' = 'worker') => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  // First, create the auth user without additional data
  const { data: authData, error: authError } = await supabase.auth.signUp({
    phone,
    password,
  });

  if (authError) throw authError;

  // If user was created successfully, create the profile
  if (authData.user) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        phone_number: phone,
        full_name: fullName,
        role: role,
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    return { ...authData, profile: profileData };
  }

  return authData;
};

export const signOut = async () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured');
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Check if any users exist in the system
export const checkUsersExist = async () => {
  if (!isSupabaseConfigured) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error checking users:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking users:', error);
    return false;
  }
};

// Create initial admin user for development
export const createInitialAdminUser = async () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  const adminPhone = '+1234567890';
  const adminPassword = 'admin123';
  const adminName = 'System Administrator';

  try {
    // Check if admin already exists - use maybeSingle() to handle no results gracefully
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', adminPhone)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing admin:', checkError);
      throw checkError;
    }

    if (existingUser) {
      console.log('Admin user already exists');
      return { phone: adminPhone, password: adminPassword };
    }

    // Create the admin user using the updated signUpWithPhone function
    const result = await signUpWithPhone(adminPhone, adminPassword, adminName, 'admin');

    console.log('Initial admin user created successfully');
    return { phone: adminPhone, password: adminPassword };
  } catch (error) {
    console.error('Error creating initial admin user:', error);
    throw error;
  }
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
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  isValidUrl(supabaseUrl) &&
  !supabaseUrl.includes('localhost') &&
  !supabaseUrl.includes('127.0.0.1') &&
  supabaseUrl.includes('supabase.co');

if (!isSupabaseConfigured) {
  console.warn('Supabase is not properly configured. Please set up your Supabase project by clicking "Connect to Supabase" in the top right corner.');
}

const createMockClient = () => ({
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
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
  rpc: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
});

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient() as any;

// Cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data or fetch new data
const getCachedData = async (key: string, fetchFn: () => Promise<any>) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};

// Clear cache function
export const clearCache = (key?: string) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

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

export interface DailyReportStorage {
  id: string;
  report_date: string;
  no: number;
  libelle: string;
  stock: number;
  entres: number;
  total_jour: number;
  solde: number;
  sortie: number;
  p_unit1: number;
  p_total: number;
  amavide: number;
  product_id: string;
  created_at: string;
  created_by?: string;
}

export const getCurrentUser = async (): Promise<User | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }

  // Use cache for current user to avoid repeated calls
  const cacheKey = 'current_user';
  
  try {
    return await getCachedData(cacheKey, async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000); // Reduced timeout
      });

      const userPromise = supabase.auth.getUser();
      const { data: { user }, error: userError } = await Promise.race([userPromise, timeoutPromise]);
      
      if (userError || !user) {
        return null;
      }

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]);

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: 'worker'
            }])
            .select()
            .single();
          return newProfile;
        }
        return null;
      }

      return profile;
    });
  } catch (error: any) {
    clearCache(cacheKey);
    return null;
  }
};

// Optimized function to get products with caching
export const getProducts = async () => {
  if (!isSupabaseConfigured) {
    return [];
  }

  const cacheKey = 'products';
  return await getCachedData(cacheKey, async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, quantity, category, status, created_at')
      .eq('status', 'approved')
      .order('name');
    
    if (error) throw error;
    return data || [];
  });
};

// Optimized function to get credits with caching
export const getCredits = async (userId?: string) => {
  if (!isSupabaseConfigured) {
    return [];
  }

  const cacheKey = `credits_${userId || 'all'}`;
  return await getCachedData(cacheKey, async () => {
    let query = supabase
      .from('credits')
      .select('id, customer_name, amount, product_name, status, due_date, created_at')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('issued_by', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
};

// Optimized function to get users with caching
export const getUsers = async () => {
  if (!isSupabaseConfigured) {
    return [];
  }

  const cacheKey = 'users';
  return await getCachedData(cacheKey, async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  });
};

// Optimized function to get stock adjustments with caching
export const getStockAdjustments = async (productId?: string) => {
  if (!isSupabaseConfigured) {
    return [];
  }

  const cacheKey = `stock_adjustments_${productId || 'all'}`;
  return await getCachedData(cacheKey, async () => {
    let query = supabase
      .from('stock_adjustments')
      .select('id, product_name, adjustment_type, quantity_adjusted, previous_quantity, new_quantity, reason, adjusted_by_name, created_at')
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sign in request timeout')), 15000);
    });

    const signInPromise = supabase.auth.signInWithPassword({
      email,
      password,
    });

    const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

    if (error) {
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('fetch') ||
          error.message?.includes('network')) {
        throw new Error('Unable to connect to authentication service. Please check your internet connection.');
      }
      
      throw error;
    }

    return data;
  } catch (error: any) {
    if (error.message?.includes('timeout')) {
      throw new Error('Sign in request timed out. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, fullName: string, role: 'admin' | 'manager' | 'worker' = 'worker') => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sign up request timeout')), 20000);
    });

    const signUpPromise = supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    const { data: authData, error: authError } = await Promise.race([signUpPromise, timeoutPromise]);

    if (authError) {
      if (authError.message?.includes('Failed to fetch') || 
          authError.message?.includes('fetch') ||
          authError.message?.includes('network')) {
        throw new Error('Unable to connect to authentication service. Please check your internet connection.');
      }
      
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned from authentication');
    }


    await new Promise(resolve => setTimeout(resolve, 3000));

    const profileCheckPromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    const { data: existingProfile, error: profileCheckError } = await Promise.race([
      profileCheckPromise, 
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Profile check timeout')), 10000))
    ]);

    if (profileCheckError && !profileCheckError.message?.includes('timeout')) {
    }

    if (!existingProfile) {
      const profileData = {
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: role
      };


      const profileInsertPromise = supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      const { data: newProfile, error: profileError } = await Promise.race([
        profileInsertPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Profile creation timeout')), 10000))
      ]);

      if (profileError) {
        if (profileError.message?.includes('Failed to fetch') || 
            profileError.message?.includes('fetch') ||
            profileError.message?.includes('network') ||
            profileError.message?.includes('timeout')) {
          throw new Error('Unable to connect to database service. Please check your internet connection.');
        }
        
        if (profileError.code === '23505') {
          throw new Error('A user with this email already exists');
        } else if (profileError.code === '42501') {
          throw new Error('Permission denied. Please check your database policies');
        } else {
          throw new Error(`Database error saving new user: ${profileError.message}`);
        }
      }

      return { ...authData, profile: newProfile };
    } else {
      return { ...authData, profile: existingProfile };
    }
  } catch (error: any) {
    if (error.message?.includes('timeout')) {
      throw new Error('Request timed out. Please check your internet connection and try again.');
    }
    
    if (error.message?.includes('User already registered')) {
      throw new Error('A user with this email address already exists');
    } else if (error.message?.includes('Password should be at least')) {
      throw new Error('Password must be at least 6 characters long');
    } else if (error.message?.includes('Invalid email')) {
      throw new Error('Please enter a valid email address');
    } else if (error.message?.includes('Database error saving new user')) {
      throw error;
    } else {
      throw new Error(error.message || 'Failed to create user account');
    }
  }
};

export const signOut = async () => {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sign out timeout')), 5000);
    });

    const signOutPromise = supabase.auth.signOut();
    const { error } = await Promise.race([signOutPromise, timeoutPromise]);
    
    if (error) throw error;
  } catch (error: any) {
  }
};

export const getDailyReportsStorage = async (startDate?: string, endDate?: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  try {
    let query = supabase
      .from('daily_reports_storage')
      .select('*')
      .order('report_date', { ascending: false })
      .order('no', { ascending: true });

    if (startDate) {
      query = query.gte('report_date', startDate);
    }

    if (endDate) {
      query = query.lte('report_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

export const generateDailyReport = async (targetDate: string = new Date().toISOString().split('T')[0]) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  try {
    const { data, error } = await supabase.rpc('manual_generate_daily_report', {
      target_date: targetDate
    });

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

export const getDailyReportForDate = async (date: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your Supabase project.');
  }

  try {
    const { data, error } = await supabase
      .from('daily_reports_storage')
      .select('*')
      .eq('report_date', date)
      .order('no', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

export const isSupabaseReady = () => isSupabaseConfigured;
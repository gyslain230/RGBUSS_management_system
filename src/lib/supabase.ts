import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password,
  });

  if (error) throw error;
  return data;
};

export const signUpWithPhone = async (phone: string, password: string, fullName: string, role: 'admin' | 'manager' | 'worker' = 'worker') => {
  const { data, error } = await supabase.auth.signUp({
    phone,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Utility functions for data operations
export const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
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
  const { data, error } = await supabase
    .from('sales')
    .insert([saleData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createCredit = async (creditData: Omit<Credit, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('credits')
    .insert([creditData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCredit = async (id: string, updates: Partial<Credit>) => {
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
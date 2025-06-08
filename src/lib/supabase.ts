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
  email: string;
  role: 'admin' | 'manager' | 'worker';
  full_name: string;
  created_at: string;
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
  sale_id: string;
  customer_name: string;
  amount: number;
  product_name: string;
  issued_by: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
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
}
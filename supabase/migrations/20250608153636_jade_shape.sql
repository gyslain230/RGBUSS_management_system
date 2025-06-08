/*
  # Initial Schema for RGBUSS Business Management System

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text, enum: admin, manager, worker)
      - `created_at` (timestamp)

    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `price` (numeric)
      - `quantity` (integer)
      - `category` (text)
      - `description` (text, optional)
      - `status` (text, enum: approved, pending)
      - `created_by` (uuid, references user_profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `sales`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `product_name` (text)
      - `quantity_sold` (integer)
      - `unit_price` (numeric)
      - `total_amount` (numeric)
      - `sold_by` (uuid, references user_profiles)
      - `customer_name` (text, optional)
      - `is_credit` (boolean)
      - `created_at` (timestamp)

    - `credits`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, references sales)
      - `customer_name` (text)
      - `amount` (numeric)
      - `product_name` (text)
      - `issued_by` (uuid, references user_profiles)
      - `status` (text, enum: pending, paid, overdue)
      - `due_date` (date)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Admin: full access to all data
    - Manager: read access to most data, limited write access
    - Worker: limited access based on their own records
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  category text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending')),
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  quantity_sold integer NOT NULL CHECK (quantity_sold > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price > 0),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount > 0),
  sold_by uuid NOT NULL REFERENCES user_profiles(id),
  customer_name text,
  is_credit boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id),
  customer_name text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  product_name text NOT NULL,
  issued_by uuid NOT NULL REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for products
CREATE POLICY "Workers can read approved products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved' OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for sales
CREATE POLICY "Users can read their own sales, admins and managers can read all"
  ON sales
  FOR SELECT
  TO authenticated
  USING (
    sold_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Authenticated users can insert sales"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sold_by);

-- Policies for credits
CREATE POLICY "Users can read their own credits, admins and managers can read all"
  ON credits
  FOR SELECT
  TO authenticated
  USING (
    issued_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Authenticated users can insert credits"
  ON credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = issued_by);

CREATE POLICY "Users can update credits they issued, admins and managers can update all"
  ON credits
  FOR UPDATE
  TO authenticated
  USING (
    issued_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON sales(sold_by);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_due_date ON credits(due_date);
CREATE INDEX IF NOT EXISTS idx_credits_issued_by ON credits(issued_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on products
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
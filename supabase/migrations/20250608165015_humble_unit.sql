/*
  # Clear All Data and Logic from Supabase Database

  This migration will:
  1. Delete all data from all tables
  2. Remove all custom functions
  3. Remove all triggers
  4. Remove all policies
  5. Drop all custom tables
  6. Reset the database to a clean state

  WARNING: This will permanently delete all data!
*/

-- Disable RLS temporarily to allow deletions
ALTER TABLE IF EXISTS credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;

DROP POLICY IF EXISTS "Workers can read approved products" ON products;
DROP POLICY IF EXISTS "Managers and admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

DROP POLICY IF EXISTS "Users can read their own sales, admins and managers can read all" ON sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON sales;

DROP POLICY IF EXISTS "Users can read their own credits, admins and managers can read all" ON credits;
DROP POLICY IF EXISTS "Authenticated users can insert credits" ON credits;
DROP POLICY IF EXISTS "Users can update credits they issued, admins and managers can update all" ON credits;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all indexes
DROP INDEX IF EXISTS idx_products_status;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_sales_created_at;
DROP INDEX IF EXISTS idx_sales_sold_by;
DROP INDEX IF EXISTS idx_credits_status;
DROP INDEX IF EXISTS idx_credits_due_date;
DROP INDEX IF EXISTS idx_credits_issued_by;

-- Delete all data from tables (in correct order due to foreign key constraints)
DELETE FROM credits;
DELETE FROM sales;
DELETE FROM products;
DELETE FROM user_profiles;

-- Drop all tables
DROP TABLE IF EXISTS credits;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS user_profiles;

-- Clear any remaining custom types or enums
-- (Add any custom types you want to remove here)

-- Note: This will not affect Supabase Auth users table (auth.users)
-- If you want to delete auth users as well, you'll need to do that through the Supabase dashboard
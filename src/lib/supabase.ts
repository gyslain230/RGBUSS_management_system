// Mock data storage using localStorage

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
  sale_id: string | null;
  customer_name: string;
  amount: number;
  product_name: string;
  issued_by: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
  created_at: string;
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
}

// Mock Supabase client
class MockSupabaseClient {
  from(table: string) {
    return new MockTable(table);
  }

  auth = {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: null }),
    signUp: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    admin: {
      deleteUser: () => Promise.resolve({ error: null })
    }
  };
}

class MockTable {
  private table: string;
  private query: any = {};

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    this.query.select = columns;
    return this;
  }

  insert(data: any[]) {
    console.log(`📝 INSERT operation on table: ${this.table}`, data);
    const items = this.getItems();
    const newItems = data.map(item => ({
      ...item,
      id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString()
    }));
    
    items.push(...newItems);
    this.setItems(items);
    console.log(`✅ Successfully inserted ${newItems.length} items into ${this.table}`);
    console.log(`📊 Total items in ${this.table}:`, items.length);
    
    return {
      select: () => ({
        single: () => Promise.resolve({ data: newItems[0], error: null })
      }),
      then: (callback: any) => callback({ data: newItems, error: null })
    };
  }

  update(data: any) {
    this.query.update = data;
    return this;
  }

  delete() {
    this.query.delete = true;
    return this;
  }

  eq(column: string, value: any) {
    this.query.eq = { column, value };
    return this;
  }

  gt(column: string, value: any) {
    this.query.gt = { column, value };
    return this;
  }

  gte(column: string, value: any) {
    this.query.gte = { column, value };
    return this;
  }

  lt(column: string, value: any) {
    this.query.lt = { column, value };
    return this;
  }

  lte(column: string, value: any) {
    this.query.lte = { column, value };
    return this;
  }

  order(column: string, options: any = {}) {
    this.query.order = { column, ...options };
    return this;
  }

  limit(count: number) {
    this.query.limit = count;
    return this;
  }

  single() {
    return this.executeQuery().then(result => ({
      ...result,
      data: result.data?.[0] || null
    }));
  }

  then(callback: any) {
    return this.executeQuery().then(callback);
  }

  private getItems(): any[] {
    try {
      const items = localStorage.getItem(this.table);
      const parsedItems = items ? JSON.parse(items) : [];
      console.log(`📖 Reading from localStorage table: ${this.table}, found ${parsedItems.length} items`);
      return parsedItems;
    } catch (error) {
      console.error(`❌ Error reading from localStorage table: ${this.table}`, error);
      return [];
    }
  }

  private setItems(items: any[]): void {
    try {
      localStorage.setItem(this.table, JSON.stringify(items));
      console.log(`💾 Saved to localStorage table: ${this.table}, ${items.length} items`);
    } catch (error) {
      console.error(`❌ Error saving to localStorage table: ${this.table}`, error);
    }
  }

  private executeQuery(): Promise<{ data: any[] | null; error: any }> {
    return new Promise((resolve) => {
      try {
        console.log(`🔍 Executing query on table: ${this.table}`, this.query);
        let items = this.getItems();

        // Apply filters
        if (this.query.eq) {
          const beforeFilter = items.length;
          items = items.filter(item => item[this.query.eq.column] === this.query.eq.value);
          console.log(`🔍 Filter eq(${this.query.eq.column}, ${this.query.eq.value}): ${beforeFilter} → ${items.length} items`);
        }

        if (this.query.gt) {
          const beforeFilter = items.length;
          items = items.filter(item => item[this.query.gt.column] > this.query.gt.value);
          console.log(`🔍 Filter gt(${this.query.gt.column}, ${this.query.gt.value}): ${beforeFilter} → ${items.length} items`);
        }

        if (this.query.gte) {
          const beforeFilter = items.length;
          items = items.filter(item => item[this.query.gte.column] >= this.query.gte.value);
          console.log(`🔍 Filter gte(${this.query.gte.column}, ${this.query.gte.value}): ${beforeFilter} → ${items.length} items`);
        }

        if (this.query.lt) {
          const beforeFilter = items.length;
          items = items.filter(item => item[this.query.lt.column] < this.query.lt.value);
          console.log(`🔍 Filter lt(${this.query.lt.column}, ${this.query.lt.value}): ${beforeFilter} → ${items.length} items`);
        }

        if (this.query.lte) {
          const beforeFilter = items.length;
          items = items.filter(item => item[this.query.lte.column] <= this.query.lte.value);
          console.log(`🔍 Filter lte(${this.query.lte.column}, ${this.query.lte.value}): ${beforeFilter} → ${items.length} items`);
        }

        // Apply updates
        if (this.query.update && this.query.eq) {
          console.log(`📝 UPDATE operation on table: ${this.table}`, this.query.update);
          const originalItems = this.getItems();
          const updatedItems = originalItems.map(item => {
            if (item[this.query.eq.column] === this.query.eq.value) {
              const updatedItem = { ...item, ...this.query.update, updated_at: new Date().toISOString() };
              console.log(`✏️ Updated item:`, updatedItem);
              return updatedItem;
            }
            return item;
          });
          this.setItems(updatedItems);
          items = updatedItems.filter(item => item[this.query.eq.column] === this.query.eq.value);
        }

        // Apply deletes
        if (this.query.delete && this.query.eq) {
          console.log(`🗑️ DELETE operation on table: ${this.table}`);
          const originalItems = this.getItems();
          const remainingItems = originalItems.filter(item => item[this.query.eq.column] !== this.query.eq.value);
          this.setItems(remainingItems);
          console.log(`🗑️ Deleted items, remaining: ${remainingItems.length}`);
          items = [];
        }

        // Apply ordering
        if (this.query.order) {
          items.sort((a, b) => {
            const aVal = a[this.query.order.column];
            const bVal = b[this.query.order.column];
            
            if (this.query.order.ascending === false) {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
          console.log(`📊 Ordered by ${this.query.order.column} (${this.query.order.ascending === false ? 'desc' : 'asc'})`);
        }

        // Apply limit
        if (this.query.limit) {
          items = items.slice(0, this.query.limit);
          console.log(`📏 Limited to ${this.query.limit} items`);
        }

        console.log(`✅ Query completed, returning ${items.length} items`);
        resolve({ data: items, error: null });
      } catch (error) {
        console.error(`❌ Query error on table: ${this.table}`, error);
        resolve({ data: null, error });
      }
    });
  }
}

export const supabase = new MockSupabaseClient();

// Initialize with completely empty data for fresh restart
const initializeData = () => {
  console.log('🔄 Initializing localStorage data structure...');
  
  // Define all required tables
  const tables = [
    'products',
    'sales', 
    'credits',
    'user_profiles',
    'stock_adjustments',
    'daily_reports'
  ];

  // Initialize each table if it doesn't exist
  tables.forEach(table => {
    const existingData = localStorage.getItem(table);
    if (!existingData) {
      localStorage.setItem(table, JSON.stringify([]));
      console.log(`📊 Initialized empty table: ${table}`);
    } else {
      const data = JSON.parse(existingData);
      console.log(`📊 Table ${table} already exists with ${data.length} items`);
    }
  });
  
  console.log('✅ LocalStorage initialization complete');
  
  // Log current state
  tables.forEach(table => {
    const data = JSON.parse(localStorage.getItem(table) || '[]');
    console.log(`📈 ${table}: ${data.length} items`);
  });
};

// Initialize data when module loads
initializeData();

// Export utility functions for debugging
export const debugLocalStorage = () => {
  console.log('🔍 LocalStorage Debug Information:');
  const tables = ['products', 'sales', 'credits', 'user_profiles', 'stock_adjustments', 'daily_reports'];
  
  tables.forEach(table => {
    const data = JSON.parse(localStorage.getItem(table) || '[]');
    console.log(`📊 ${table}:`, data.length, 'items');
    if (data.length > 0) {
      console.log(`   Latest item:`, data[data.length - 1]);
    }
  });
};

export const clearAllData = () => {
  console.log('🧹 Clearing all localStorage data...');
  const tables = ['products', 'sales', 'credits', 'user_profiles', 'stock_adjustments', 'daily_reports'];
  
  tables.forEach(table => {
    localStorage.removeItem(table);
    localStorage.setItem(table, JSON.stringify([]));
  });
  
  console.log('✅ All data cleared and reinitialized');
};
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
  sale_id: string;
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
    const items = this.getItems();
    const newItems = data.map(item => ({
      ...item,
      id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString()
    }));
    
    items.push(...newItems);
    this.setItems(items);
    
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
    const items = localStorage.getItem(this.table);
    return items ? JSON.parse(items) : [];
  }

  private setItems(items: any[]): void {
    localStorage.setItem(this.table, JSON.stringify(items));
  }

  private executeQuery(): Promise<{ data: any[] | null; error: any }> {
    return new Promise((resolve) => {
      try {
        let items = this.getItems();

        // Apply filters
        if (this.query.eq) {
          items = items.filter(item => item[this.query.eq.column] === this.query.eq.value);
        }

        if (this.query.gt) {
          items = items.filter(item => item[this.query.gt.column] > this.query.gt.value);
        }

        if (this.query.gte) {
          items = items.filter(item => item[this.query.gte.column] >= this.query.gte.value);
        }

        if (this.query.lt) {
          items = items.filter(item => item[this.query.lt.column] < this.query.lt.value);
        }

        if (this.query.lte) {
          items = items.filter(item => item[this.query.lte.column] <= this.query.lte.value);
        }

        // Apply updates
        if (this.query.update && this.query.eq) {
          items = items.map(item => {
            if (item[this.query.eq.column] === this.query.eq.value) {
              return { ...item, ...this.query.update, updated_at: new Date().toISOString() };
            }
            return item;
          });
          this.setItems(items);
        }

        // Apply deletes
        if (this.query.delete && this.query.eq) {
          items = items.filter(item => item[this.query.eq.column] !== this.query.eq.value);
          this.setItems(items);
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
        }

        // Apply limit
        if (this.query.limit) {
          items = items.slice(0, this.query.limit);
        }

        resolve({ data: items, error: null });
      } catch (error) {
        resolve({ data: null, error });
      }
    });
  }
}

export const supabase = new MockSupabaseClient();

// Initialize with some sample data
const initializeData = () => {
  // Sample products
  if (!localStorage.getItem('products')) {
    const sampleProducts: Product[] = [
      {
        id: '1',
        name: 'Laptop Computer',
        price: 999.99,
        quantity: 10,
        category: 'Electronics',
        description: 'High-performance laptop for business use',
        status: 'approved',
        created_by: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Office Chair',
        price: 199.99,
        quantity: 5,
        category: 'Furniture',
        description: 'Ergonomic office chair with lumbar support',
        status: 'approved',
        created_by: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Coffee Mug',
        price: 12.99,
        quantity: 2,
        category: 'Kitchen',
        description: 'Ceramic coffee mug with company logo',
        status: 'approved',
        created_by: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('products', JSON.stringify(sampleProducts));
  }

  // Initialize empty arrays for other tables
  if (!localStorage.getItem('sales')) {
    localStorage.setItem('sales', JSON.stringify([]));
  }
  if (!localStorage.getItem('credits')) {
    localStorage.setItem('credits', JSON.stringify([]));
  }
  if (!localStorage.getItem('user_profiles')) {
    localStorage.setItem('user_profiles', JSON.stringify([]));
  }
  if (!localStorage.getItem('stock_adjustments')) {
    localStorage.setItem('stock_adjustments', JSON.stringify([]));
  }
};

// Initialize data when module loads
initializeData();
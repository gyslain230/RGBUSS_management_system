import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Package, ShoppingCart, CreditCard, TrendingUp, Users, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product, Sale, Credit, StockAdjustment } from '../lib/supabase';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import MetricCard from '../components/Dashboard/MetricCard';
import RecentSalesTable from '../components/Dashboard/RecentSalesTable';
import StockAlerts from '../components/Dashboard/StockAlerts';
import AIInsights from '../components/Dashboard/AIInsights';
import toast from 'react-hot-toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface DashboardMetrics {
  totalRevenue: number;
  totalProducts: number;
  totalSales: number;
  pendingCredits: number;
  lowStockCount: number;
  todayRevenue: number;
  todayCredits: number;
  todaySorties: number;
}

interface SalesData {
  name: string;
  sales: number;
  revenue: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface RecentSortie {
  id: string;
  product_name: string;
  sortie_quantity: number;
  created_at: string;
  adjustment_type: string;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalProducts: 0,
    totalSales: 0,
    pendingCredits: 0,
    lowStockCount: 0,
    todayRevenue: 0,
    todayCredits: 0,
    todaySorties: 0
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentSorties, setRecentSorties] = useState<RecentSortie[]>([]);
  const [stockAlerts, setStockAlerts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data with error handling
      const fetchWithFallback = async (query: any, fallback: any[] = []) => {
        try {
          const result = await query;
          return result.data || fallback;
        } catch (err) {
          console.warn('Query failed, using fallback:', err);
          return fallback;
        }
      };

      const [products, sales, credits, adjustments] = await Promise.all([
        fetchWithFallback(supabase.from('products').select('*').eq('status', 'approved')),
        fetchWithFallback(supabase.from('sales').select('*').order('created_at', { ascending: false })),
        fetchWithFallback(supabase.from('credits').select('*')),
        fetchWithFallback(supabase.from('stock_adjustments').select('*').order('created_at', { ascending: false }))
      ]);

      // Calculate metrics safely
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      // Today's data
      const todaySales = sales.filter(sale => {
        try {
          return new Date(sale.created_at) >= todayStart && new Date(sale.created_at) <= todayEnd;
        } catch {
          return false;
        }
      });

      const todayCreditsData = credits.filter(credit => {
        try {
          return new Date(credit.created_at) >= todayStart && new Date(credit.created_at) <= todayEnd;
        } catch {
          return false;
        }
      });

      // Calculate today's sorties from stock adjustments
      const todayAdjustments = adjustments.filter(adj => {
        try {
          return new Date(adj.created_at) >= todayStart && new Date(adj.created_at) <= todayEnd;
        } catch {
          return false;
        }
      });

      // Calculate sorties based on daily report logic
      const todaySortiesTotal = calculateTodaySorties(products, todayAdjustments);

      // Recent sorties for display (last 10 adjustments that represent sorties)
      const recentSortiesData = todayAdjustments
        .filter(adj => adj.adjustment_type === 'decrease')
        .slice(0, 10)
        .map(adj => ({
          id: adj.id,
          product_name: adj.product_name,
          sortie_quantity: adj.quantity_adjusted,
          created_at: adj.created_at,
          adjustment_type: adj.adjustment_type
        }));

      // Calculate metrics safely
      const calculatedMetrics: DashboardMetrics = {
        totalRevenue: sales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0),
        totalProducts: products.length,
        totalSales: sales.length,
        pendingCredits: credits
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
        lowStockCount: products.filter(p => (Number(p.quantity) || 0) < 5).length,
        todayRevenue: todaySales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0),
        todayCredits: todayCreditsData.reduce((sum, credit) => sum + (Number(credit.amount) || 0), 0),
        todaySorties: todaySortiesTotal
      };

      // Generate chart data safely
      const salesChartData = generateSalesChartData(sales);
      const categoryChartData = generateCategoryData(products);

      // Recent sales (last 10)
      const recentSalesData = sales.slice(0, 10);

      // Stock alerts (low stock products)
      const stockAlertsData = products.filter(p => (Number(p.quantity) || 0) < 5);

      // Update state
      setMetrics(calculatedMetrics);
      setSalesData(salesChartData);
      setCategoryData(categoryChartData);
      setRecentSales(recentSalesData);
      setRecentSorties(recentSortiesData);
      setStockAlerts(stockAlertsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTodaySorties = (products: Product[], todayAdjustments: StockAdjustment[]) => {
    try {
      let totalSorties = 0;

      products.forEach(product => {
        try {
          // Get today's adjustments for this product
          const productAdjustments = todayAdjustments.filter(adj => adj.product_id === product.id);
          
          // Calculate entres (increases only)
          const entres = productAdjustments
            .filter(adj => adj.adjustment_type === 'increase')
            .reduce((sum, adj) => sum + (Number(adj.quantity_adjusted) || 0), 0);

          // Get previous day stock (simplified - using 0 for now)
          const stock = 0; // Previous day's solde
          const totalJour = stock + entres; // Total available for the day
          const solde = Number(product.quantity) || 0; // Current balance
          const sortie = Math.max(0, totalJour - solde); // Sortie calculation

          totalSorties += sortie;
        } catch (err) {
          console.warn('Error calculating sortie for product:', product.name, err);
        }
      });

      return totalSorties;
    } catch (error) {
      console.warn('Error calculating total sorties:', error);
      return 0;
    }
  };

  const generateSalesChartData = (sales: Sale[]): SalesData[] => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const daySales = sales.filter(sale => {
          try {
            const saleDate = new Date(sale.created_at);
            return saleDate >= dayStart && saleDate <= dayEnd;
          } catch {
            return false;
          }
        });

        return {
          name: format(date, 'MMM dd'),
          sales: daySales.length,
          revenue: daySales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0)
        };
      }).reverse();

      return last7Days;
    } catch (error) {
      console.warn('Error generating sales chart data:', error);
      return [];
    }
  };

  const generateCategoryData = (products: Product[]): CategoryData[] => {
    try {
      const categoryMap = new Map<string, number>();
      
      products.forEach(product => {
        try {
          const category = product.category || 'Unknown';
          const quantity = Number(product.quantity) || 0;
          categoryMap.set(category, (categoryMap.get(category) || 0) + quantity);
        } catch (err) {
          console.warn('Error processing product for category data:', product.name, err);
        }
      });

      return Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value
      }));
    } catch (error) {
      console.warn('Error generating category data:', error);
      return [];
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.full_name}!</h1>
            <p className="text-blue-100 mt-1">Here's what's happening with your business today</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Today's Date</p>
            <p className="text-xl font-semibold">{format(new Date(), 'EEEE, MMMM do')}</p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          change={`+$${metrics.todayRevenue.toFixed(2)}`}
          changeType="increase"
        />
        <MetricCard
          title="Total Products"
          value={metrics.totalProducts.toString()}
          icon={Package}
          change={`${metrics.lowStockCount} low stock`}
          changeType={metrics.lowStockCount > 0 ? "decrease" : "increase"}
        />
        <MetricCard
          title="Total Sales"
          value={metrics.totalSales.toString()}
          icon={ShoppingCart}
          change={`${metrics.todaySorties} sorties today`}
          changeType="increase"
        />
        <MetricCard
          title="Pending Credits"
          value={`$${metrics.pendingCredits.toFixed(2)}`}
          icon={CreditCard}
          change={`+$${metrics.todayCredits.toFixed(2)}`}
          changeType="increase"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sales Overview</h3>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Stock by Category</h3>
            <Package className="h-5 w-5 text-green-500" />
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p>No category data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <RecentSalesTable sales={recentSales} />

        {/* Recent Sorties */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Sorties</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-600">{recentSorties.length} sorties</span>
            </div>
          </div>
          
          {recentSorties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No sorties recorded today</p>
              <p className="text-sm text-gray-400 mt-1">Sorties will appear when stock decreases</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Product</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Sortie Qty</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentSorties.map((sortie) => (
                    <tr key={sortie.id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-900">{sortie.product_name}</td>
                      <td className="py-3 text-sm font-medium text-red-600">-{sortie.sortie_quantity}</td>
                      <td className="py-3 text-sm text-gray-600">
                        {format(new Date(sortie.created_at), 'HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alerts */}
        <StockAlerts alerts={stockAlerts} />

        {/* AI Insights */}
        <AIInsights />
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  Download,
  AlertTriangle,
  Users,
  CreditCard
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MetricCard from '../components/Dashboard/MetricCard';
import RecentSalesTable from '../components/Dashboard/RecentSalesTable';
import StockAlerts from '../components/Dashboard/StockAlerts';
import AIInsights from '../components/Dashboard/AIInsights';

interface DashboardData {
  revenueToday: number;
  salesToday: number;
  productsInStock: number;
  totalRevenue: number;
  salesOverview: any[];
  recentSales: any[];
  stockAlerts: any[];
  creditAlerts: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    revenueToday: 0,
    salesToday: 0,
    productsInStock: 0,
    totalRevenue: 0,
    salesOverview: [],
    recentSales: [],
    stockAlerts: [],
    creditAlerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's revenue and sales
      const { data: todaySales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, quantity_sold')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (salesError) throw salesError;

      const revenueToday = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const salesToday = todaySales?.reduce((sum, sale) => sum + sale.quantity_sold, 0) || 0;

      // Fetch total revenue
      const { data: allSales, error: allSalesError } = await supabase
        .from('sales')
        .select('total_amount');

      if (allSalesError) throw allSalesError;

      const totalRevenue = allSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

      // Fetch products in stock
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('quantity')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      const productsInStock = products?.reduce((sum, product) => sum + product.quantity, 0) || 0;

      // Fetch recent sales
      const { data: recentSales, error: recentSalesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentSalesError) throw recentSalesError;

      // Fetch stock alerts (products with quantity < 5)
      const { data: stockAlerts, error: stockAlertsError } = await supabase
        .from('products')
        .select('*')
        .lt('quantity', 5)
        .eq('status', 'approved');

      if (stockAlertsError) throw stockAlertsError;

      // Fetch credit alerts (credits issued today)
      const { data: creditAlerts, error: creditAlertsError } = await supabase
        .from('credits')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (creditAlertsError) throw creditAlertsError;

      // Generate mock sales overview data (last 7 days)
      const salesOverview = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: Math.floor(Math.random() * 1000) + 500,
          revenue: Math.floor(Math.random() * 5000) + 2000
        };
      });

      setData({
        revenueToday,
        salesToday,
        productsInStock,
        totalRevenue,
        salesOverview,
        recentSales: recentSales || [],
        stockAlerts: stockAlerts || [],
        creditAlerts: creditAlerts || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.full_name}</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Today's Report
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Previous Reports
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Revenue Today"
          value={`$${data.revenueToday.toLocaleString()}`}
          icon={DollarSign}
          change="+12%"
          changeType="increase"
        />
        <MetricCard
          title="Sales Today"
          value={data.salesToday.toString()}
          icon={ShoppingCart}
          change="+8%"
          changeType="increase"
        />
        <MetricCard
          title="Products in Stock"
          value={data.productsInStock.toString()}
          icon={Package}
          change="-3%"
          changeType="decrease"
        />
        <MetricCard
          title="Total Revenue"
          value={`$${data.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          change="+15%"
          changeType="increase"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Overview (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.salesOverview}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <AIInsights />
      </div>

      {/* Tables and Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <RecentSalesTable sales={data.recentSales} />

        {/* Stock Alerts */}
        <StockAlerts alerts={data.stockAlerts} />
      </div>

      {/* Credit Alerts */}
      {data.creditAlerts.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Credit Alerts (Today)</h3>
            <CreditCard className="h-5 w-5 text-orange-500" />
          </div>
          <div className="space-y-3">
            {data.creditAlerts.map((credit) => (
              <div key={credit.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{credit.customer_name}</p>
                  <p className="text-sm text-gray-600">{credit.product_name}</p>
                </div>
                <span className="text-orange-600 font-semibold">${credit.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
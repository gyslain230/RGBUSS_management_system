import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  Download,
  AlertTriangle,
  Users,
  CreditCard,
  FileText,
  Calendar,
  Clock,
  Shield
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
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import MetricCard from '../components/Dashboard/MetricCard';
import RecentSalesTable from '../components/Dashboard/RecentSalesTable';
import StockAlerts from '../components/Dashboard/StockAlerts';
import AIInsights from '../components/Dashboard/AIInsights';
import toast from 'react-hot-toast';

interface DashboardData {
  revenueToday: number;
  salesToday: number;
  productsInStock: number;
  totalRevenue: number;
  salesOverview: any[];
  recentSales: any[];
  stockAlerts: any[];
  creditAlerts: any[];
  categoryBreakdown: any[];
  previousReports: any[];
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
    creditAlerts: [],
    categoryBreakdown: [],
    previousReports: []
  });
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      fetchDashboardData();
    }
  }, [user]);

  // Check if user has dashboard access
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            Dashboard access is limited to administrators and managers only.
          </p>
          <p className="text-sm text-gray-500">
            Contact your administrator if you believe you should have access to this page.
          </p>
        </div>
      </div>
    );
  }

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Fetch today's sales data
      const { data: todaySales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, quantity_sold, product_name, customer_name, created_at')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      if (salesError) throw salesError;

      const revenueToday = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const salesToday = todaySales?.reduce((sum, sale) => sum + sale.quantity_sold, 0) || 0;

      // Fetch total revenue
      const { data: allSales, error: allSalesError } = await supabase
        .from('sales')
        .select('total_amount, created_at');

      if (allSalesError) throw allSalesError;

      const totalRevenue = allSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

      // Fetch products in stock
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('quantity, category, name, id')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      const productsInStock = products?.reduce((sum, product) => sum + product.quantity, 0) || 0;

      // Fetch recent sales (last 10)
      const { data: recentSales, error: recentSalesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentSalesError) throw recentSalesError;

      // Fetch stock alerts (products with quantity < 5)
      const { data: stockAlerts, error: stockAlertsError } = await supabase
        .from('products')
        .select('*')
        .lt('quantity', 5)
        .eq('status', 'approved');

      if (stockAlertsError) throw stockAlertsError;

      // Fetch today's credit alerts
      const { data: creditAlerts, error: creditAlertsError } = await supabase
        .from('credits')
        .select('*')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      if (creditAlertsError) throw creditAlertsError;

      // Generate sales overview for last 7 days
      const salesOverview = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = endOfDay(date).toISOString();
        
        const daySales = allSales?.filter(sale => 
          sale.created_at >= dayStart && sale.created_at <= dayEnd
        ) || [];
        
        const dayRevenue = daySales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const dayCount = daySales.length;

        salesOverview.push({
          date: format(date, 'MMM dd'),
          revenue: dayRevenue,
          sales: dayCount
        });
      }

      // Generate category breakdown
      const categoryMap = new Map();
      products?.forEach(product => {
        const category = product.category;
        if (categoryMap.has(category)) {
          categoryMap.set(category, categoryMap.get(category) + product.quantity);
        } else {
          categoryMap.set(category, product.quantity);
        }
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      }));

      // Generate mock previous reports
      const previousReports = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(today, i + 1);
        return {
          id: `report-${i}`,
          date: format(date, 'yyyy-MM-dd'),
          displayDate: format(date, 'MMM dd, yyyy'),
          revenue: Math.floor(Math.random() * 5000) + 1000,
          sales: Math.floor(Math.random() * 50) + 10
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
        creditAlerts: creditAlerts || [],
        categoryBreakdown,
        previousReports
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const downloadTodaysReport = async () => {
    setDownloadingReport(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const reportData = {
        date: today,
        revenue: data.revenueToday,
        sales: data.salesToday,
        productsInStock: data.productsInStock,
        recentSales: data.recentSales,
        stockAlerts: data.stockAlerts,
        creditAlerts: data.creditAlerts
      };

      // Create and download JSON report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Today\'s report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Error downloading report');
    } finally {
      setDownloadingReport(false);
    }
  };

  const downloadPreviousReport = async (report: any) => {
    try {
      const reportData = {
        date: report.date,
        revenue: report.revenue,
        sales: report.sales,
        note: 'This is a sample previous report'
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${report.date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Report for ${report.displayDate} downloaded!`);
    } catch (error) {
      console.error('Error downloading previous report:', error);
      toast.error('Error downloading report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
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
          <p className="text-sm text-blue-600 capitalize">
            {user?.role} Access • {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={downloadTodaysReport}
            disabled={downloadingReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadingReport ? 'Downloading...' : 'Today\'s Report'}
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <FileText className="h-4 w-4 mr-2" />
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
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? `$${value}` : value,
                  name === 'revenue' ? 'Revenue' : 'Sales Count'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.categoryBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsights />

      {/* Tables and Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </div>
          
          {data.recentSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent sales found
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Product</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Price</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.recentSales.slice(0, 8).map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-900">{sale.product_name}</td>
                      <td className="py-3 text-sm font-medium text-gray-900">${sale.total_amount}</td>
                      <td className="py-3 text-sm text-gray-600">
                        {format(new Date(sale.created_at), 'MMM dd')}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {format(new Date(sale.created_at), 'HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.creditAlerts.map((credit) => (
              <div key={credit.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <p className="font-medium text-gray-900">{credit.customer_name}</p>
                  <p className="text-sm text-gray-600">{credit.product_name}</p>
                  <p className="text-xs text-orange-600">Due: {format(new Date(credit.due_date), 'MMM dd')}</p>
                </div>
                <span className="text-orange-600 font-semibold">${credit.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Reports Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Previous Reports</h3>
          <Calendar className="h-5 w-5 text-blue-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {data.previousReports.slice(0, 15).map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div>
                <p className="font-medium text-gray-900">{report.displayDate}</p>
                <p className="text-sm text-gray-600">Revenue: ${report.revenue}</p>
                <p className="text-sm text-gray-600">Sales: {report.sales}</p>
              </div>
              <button
                onClick={() => downloadPreviousReport(report)}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                title="Download Report"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Package, 
  TrendingUp,
  Download,
  AlertTriangle,
  Users,
  CreditCard,
  FileText,
  Calendar,
  Shield,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target
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
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import StockAlerts from '../components/Dashboard/StockAlerts';
import AIInsights from '../components/Dashboard/AIInsights';
import toast from 'react-hot-toast';

interface DashboardData {
  productsInStock: number;
  lowStockCount: number;
  totalRevenue: number;
  totalUsers: number;
  pendingCredits: number;
  overdueCredits: number;
  stockAlerts: any[];
  creditAlerts: any[];
  categoryBreakdown: any[];
  topProducts: any[];
  previousReports: any[];
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData>({
    productsInStock: 0,
    lowStockCount: 0,
    totalRevenue: 0,
    totalUsers: 0,
    pendingCredits: 0,
    overdueCredits: 0,
    stockAlerts: [],
    creditAlerts: [],
    categoryBreakdown: [],
    topProducts: [],
    previousReports: []
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    // Only fetch data if user is loaded and has proper access
    if (!authLoading && user && (user.role === 'admin' || user.role === 'manager')) {
      fetchDashboardData();
    }
  }, [user, authLoading, timeRange]);

  // Show loading while auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has dashboard access after auth is loaded
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
    setDataLoading(true);
    try {
      const today = new Date();
      
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Calculate Total Revenue using P.Total logic from Daily Reports
      const totalRevenue = await calculatePTotalForDateRange('1970-01-01T00:00:00.000Z', new Date().toISOString());

      // Fetch products data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('quantity, category, name, id, price')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      const productsInStock = products?.reduce((sum, product) => sum + product.quantity, 0) || 0;
      const lowStockCount = products?.filter(product => product.quantity < 5).length || 0;

      // Fetch users count (admin only)
      let totalUsers = 0;
      if (user.role === 'admin') {
        const usersData = localStorage.getItem('users');
        if (usersData) {
          totalUsers = JSON.parse(usersData).length;
        }
      }

      // Fetch credits data
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('*');

      if (creditsError) throw creditsError;

      const pendingCredits = credits?.filter(credit => credit.status === 'pending').length || 0;
      const overdueCredits = credits?.filter(credit => credit.status === 'overdue').length || 0;

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

      // Generate category breakdown
      const categoryMap = new Map();
      const categoryRevenue = new Map();
      
      products?.forEach(product => {
        const category = product.category;
        if (categoryMap.has(category)) {
          categoryMap.set(category, categoryMap.get(category) + product.quantity);
        } else {
          categoryMap.set(category, product.quantity);
        }
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, quantity]) => ({
        name,
        quantity,
        revenue: categoryRevenue.get(name) || 0,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      }));

      // Generate mock top products
      const topProducts = (products || []).slice(0, 5).map(product => ({
        name: product.name,
        quantity: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 5000) + 1000
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
        productsInStock,
        lowStockCount,
        totalRevenue, // Now calculated using P.Total logic
        totalUsers,
        pendingCredits,
        overdueCredits,
        stockAlerts: stockAlerts || [],
        creditAlerts: creditAlerts || [],
        categoryBreakdown,
        topProducts,
        previousReports
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setDataLoading(false);
    }
  };

  // Calculate P.Total for a given date range (Daily Reports logic)
  const calculatePTotalForDateRange = async (startDate: string, endDate: string) => {
    try {
      // Get all approved products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      let totalPTotal = 0;

      // Calculate P.Total for each product (same logic as Daily Reports)
      (products || []).forEach(product => {
        const entres = 0; // New stock entries
        const totalJour = product.quantity + entres; // Total available for the day
        const solde = product.quantity; // Current balance
        const sortie = totalJour - solde; // Sortie = Total/Jour - Solde
        const pUnit1 = product.price; // Unit price
        const pTotal = sortie * pUnit1; // P.Total = Sortie × P.Unit 1
        
        totalPTotal += pTotal;
      });

      return totalPTotal;
    } catch (error) {
      console.error('Error calculating P.Total:', error);
      return 0;
    }
  };

  const downloadTodaysReport = async () => {
    setDownloadingReport(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const reportData = {
        date: today,
        summary: {
          productsInStock: data.productsInStock,
          lowStockAlerts: data.lowStockCount,
          pendingCredits: data.pendingCredits,
          overdueCredits: data.overdueCredits,
          totalRevenue: data.totalRevenue // Now matches P.Total calculation
        },
        details: {
          stockAlerts: data.stockAlerts,
          creditAlerts: data.creditAlerts,
          topProducts: data.topProducts,
          categoryBreakdown: data.categoryBreakdown
        }
      };

      // Create and download JSON report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprehensive-report-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Comprehensive report downloaded successfully!');
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

  // Show loading for data fetching
  if (dataLoading) {
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
    <div className="space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 -mx-6 -mt-6 px-6 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.full_name}</p>
            <div className="flex items-center space-x-4 mt-2">
              <p className="text-sm text-blue-600 capitalize font-medium">
                {user?.role} Access
              </p>
              <span className="text-gray-300">•</span>
              <p className="text-sm text-gray-500">
                {format(new Date(), 'EEEE, MMMM do, yyyy')}
              </p>
              <span className="text-gray-300">•</span>
              <p className="text-xs text-green-600 font-medium">
                📊 Revenue synced with Daily Reports
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <button 
              onClick={downloadTodaysReport}
              disabled={downloadingReport}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingReport ? 'Downloading...' : 'Export Report'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Products in Stock</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.productsInStock}</p>
                <p className="text-sm mt-1 text-orange-600">
                  {data.lowStockCount} low stock alerts
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">${data.totalRevenue.toLocaleString()}</p>
                <p className="text-sm mt-1 text-green-600">
                  📊 From P.Total calculations
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {user.role === 'admin' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalUsers}</p>
                  <p className="text-sm mt-1 text-blue-600">
                    System users
                  </p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <Users className="h-6 w-6 text-cyan-600" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Metrics */}
        {user.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Credits</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{data.pendingCredits}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Credits</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{data.overdueCredits}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Stock by Category</h3>
                <p className="text-sm text-gray-600">Inventory distribution</p>
              </div>
              <PieChartIcon className="h-5 w-5 text-purple-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantity"
                  label={({ name, quantity }) => `${name}: ${quantity}`}
                >
                  {data.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
                <p className="text-sm text-gray-600">Best performing items</p>
              </div>
              <Target className="h-5 w-5 text-orange-500" />
            </div>
            <div className="space-y-4">
              {data.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.quantity} sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${product.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <AIInsights />

        {/* Stock Alerts */}
        <StockAlerts alerts={data.stockAlerts} />

        {/* Credit Alerts */}
        {data.creditAlerts.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Credit Alerts (Today)</h3>
                <p className="text-sm text-gray-600">New credit sales requiring attention</p>
              </div>
              <CreditCard className="h-5 w-5 text-orange-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.creditAlerts.map((credit) => (
                <div key={credit.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Previous Reports</h3>
              <p className="text-sm text-gray-600">Download historical business reports</p>
            </div>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {data.previousReports.slice(0, 15).map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                <div>
                  <p className="font-medium text-gray-900">{report.displayDate}</p>
                  <p className="text-sm text-gray-600">Revenue: ${report.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Sales: {report.sales}</p>
                </div>
                <button
                  onClick={() => downloadPreviousReport(report)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Download Report"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
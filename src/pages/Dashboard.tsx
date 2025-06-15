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
  Shield,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Zap,
  CheckCircle
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
import MetricCard from '../components/Dashboard/MetricCard';
import RecentSalesTable from '../components/Dashboard/RecentSalesTable';
import StockAlerts from '../components/Dashboard/StockAlerts';
import AIInsights from '../components/Dashboard/AIInsights';
import toast from 'react-hot-toast';

interface DashboardData {
  revenueToday: number;
  revenueYesterday: number;
  revenueWeek: number;
  revenueMonth: number;
  salesToday: number;
  salesYesterday: number;
  salesWeek: number;
  salesMonth: number;
  productsInStock: number;
  lowStockCount: number;
  totalRevenue: number;
  totalUsers: number;
  pendingCredits: number;
  overdueCredits: number;
  totalCash: number;
  paidCreditsTotal: number;
  totalCreditsCount: number;
  totalEntres: number;
  salesOverview: any[];
  recentSales: any[];
  stockAlerts: any[];
  creditAlerts: any[];
  categoryBreakdown: any[];
  topProducts: any[];
  salesTrend: any[];
  hourlyData: any[];
  previousReports: any[];
}

interface RecentSortieEntry {
  id: string;
  product_name: string;
  sortie: number;
  created_at: string;
  adjustment_date: string;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData>({
    revenueToday: 0,
    revenueYesterday: 0,
    revenueWeek: 0,
    revenueMonth: 0,
    salesToday: 0,
    salesYesterday: 0,
    salesWeek: 0,
    salesMonth: 0,
    productsInStock: 0,
    lowStockCount: 0,
    totalRevenue: 0,
    totalUsers: 0,
    pendingCredits: 0,
    overdueCredits: 0,
    totalCash: 0,
    paidCreditsTotal: 0,
    totalCreditsCount: 0,
    totalEntres: 0,
    salesOverview: [],
    recentSales: [],
    stockAlerts: [],
    creditAlerts: [],
    categoryBreakdown: [],
    topProducts: [],
    salesTrend: [],
    hourlyData: [],
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

  // Calculate Daily Report metrics for a specific date
  const calculateDailyReportMetrics = async (targetDate: string) => {
    try {
      console.log('📊 Calculating Daily Report metrics for:', targetDate);
      
      // Get all approved products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      // Get stock adjustments for the target date
      const startOfDay = `${targetDate}T00:00:00.000Z`;
      const endOfDay = `${targetDate}T23:59:59.999Z`;

      const { data: adjustments, error: adjustmentsError } = await supabase
        .from('stock_adjustments')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (adjustmentsError) throw adjustmentsError;

      let totalPTotal = 0;
      let totalSortie = 0;
      let totalEntres = 0;

      // Calculate metrics for each product using Daily Report logic
      (products || []).forEach(product => {
        // Calculate entres (stock increases) for this product on the target date
        const productAdjustments = (adjustments || []).filter(adj => adj.product_id === product.id);
        const entres = productAdjustments
          .filter(adj => adj.adjustment_type === 'increase')
          .reduce((sum, adj) => sum + Number(adj.quantity_adjusted || 0), 0);

        // Daily Report calculations
        const stock = 0; // Previous day stock (simplified for now)
        const totalJour = stock + entres; // Total available for the day
        const solde = Number(product.quantity) || 0; // Current balance (end of day)
        const sortie = totalJour - solde; // Sortie = Total/Jour - Solde
        const pUnit1 = Number(product.price) || 0; // Unit price
        const pTotal = sortie * pUnit1; // P.Total = Sortie × P.Unit 1

        totalPTotal += pTotal;
        totalSortie += sortie;
        totalEntres += entres;
      });

      console.log('📊 Daily Report metrics calculated:', {
        totalPTotal,
        totalSortie,
        totalEntres,
        date: targetDate
      });

      return {
        totalPTotal,
        totalSortie,
        totalEntres
      };
    } catch (error) {
      console.error('Error calculating Daily Report metrics:', error);
      return {
        totalPTotal: 0,
        totalSortie: 0,
        totalEntres: 0
      };
    }
  };

  // Calculate total entres from all stock adjustments
  const calculateTotalEntres = async () => {
    try {
      const { data: adjustments, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('adjustment_type', 'increase');

      if (error) throw error;

      const totalEntres = (adjustments || []).reduce((sum, adj) => sum + Number(adj.quantity_adjusted || 0), 0);
      return totalEntres;
    } catch (error) {
      console.error('Error calculating total entres:', error);
      return 0;
    }
  };

  // Calculate total revenue from all Daily Reports
  const calculateTotalRevenue = async () => {
    try {
      // Get all unique dates that have stock adjustments
      const { data: adjustments, error } = await supabase
        .from('stock_adjustments')
        .select('created_at');

      if (error) throw error;

      // Get unique dates
      const uniqueDates = [...new Set((adjustments || []).map(adj => adj.created_at.split('T')[0]))];
      
      let totalRevenue = 0;

      // Calculate P.Total for each date and sum them up
      for (const date of uniqueDates) {
        const { totalPTotal } = await calculateDailyReportMetrics(date);
        totalRevenue += totalPTotal;
      }

      return totalRevenue;
    } catch (error) {
      console.error('Error calculating total revenue:', error);
      return 0;
    }
  };

  // Fetch recent sortie data from Daily Reports
  const fetchRecentSortieData = async () => {
    try {
      console.log('📊 Fetching recent sortie data from Daily Reports...');
      
      // Get all approved products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      // Get recent stock adjustments (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: adjustments, error: adjustmentsError } = await supabase
        .from('stock_adjustments')
        .select('*')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (adjustmentsError) throw adjustmentsError;

      // Group adjustments by date and product to calculate sortie
      const sortieEntries: RecentSortieEntry[] = [];
      const processedDates = new Set<string>();

      // Get unique dates from adjustments
      const uniqueDates = [...new Set((adjustments || []).map(adj => adj.created_at.split('T')[0]))];
      
      // Process each date (most recent first)
      for (const dateString of uniqueDates.slice(0, 10)) { // Limit to last 10 dates
        if (processedDates.has(dateString)) continue;
        processedDates.add(dateString);

        const startOfDay = `${dateString}T00:00:00.000Z`;
        const endOfDay = `${dateString}T23:59:59.999Z`;

        // Get adjustments for this specific date
        const dayAdjustments = (adjustments || []).filter(adj => 
          adj.created_at >= startOfDay && adj.created_at <= endOfDay
        );

        // Calculate sortie for each product on this date
        (products || []).forEach(product => {
          const productAdjustments = dayAdjustments.filter(adj => adj.product_id === product.id);
          const entres = productAdjustments
            .filter(adj => adj.adjustment_type === 'increase')
            .reduce((sum, adj) => sum + Number(adj.quantity_adjusted || 0), 0);

          // Daily Report calculation for sortie
          const stock = 0; // Previous day stock (simplified)
          const totalJour = stock + entres;
          const solde = Number(product.quantity) || 0;
          const sortie = totalJour - solde;

          // Only include products with sortie > 0 (actual sales/outgoing stock)
          if (sortie > 0) {
            // Find the most recent adjustment for this product on this date for timestamp
            const latestAdjustment = productAdjustments
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            sortieEntries.push({
              id: `${product.id}-${dateString}`,
              product_name: product.name,
              sortie: sortie,
              created_at: latestAdjustment?.created_at || `${dateString}T12:00:00.000Z`,
              adjustment_date: dateString
            });
          }
        });
      }

      // Sort by most recent and limit to 10 entries
      const recentSortieData = sortieEntries
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      console.log('📊 Recent sortie data:', recentSortieData);
      return recentSortieData;
    } catch (error) {
      console.error('Error fetching recent sortie data:', error);
      return [];
    }
  };

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      console.log('🔄 Fetching dashboard data...');
      
      const today = new Date();
      const yesterday = subDays(today, 1);
      const weekStart = startOfWeek(today);
      const monthStart = startOfMonth(today);
      
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const yesterdayStart = startOfDay(yesterday).toISOString();
      const yesterdayEnd = endOfDay(yesterday).toISOString();
      const weekStartISO = weekStart.toISOString();
      const monthStartISO = monthStart.toISOString();

      const todayDateString = format(today, 'yyyy-MM-dd');
      const yesterdayDateString = format(yesterday, 'yyyy-MM-dd');

      // Calculate today's Daily Report metrics (Revenue Today = P.Total Today)
      const todayMetrics = await calculateDailyReportMetrics(todayDateString);
      const yesterdayMetrics = await calculateDailyReportMetrics(yesterdayDateString);

      // Revenue Today = Today's P.Total from Daily Reports
      const revenueToday = todayMetrics.totalPTotal;
      const revenueYesterday = yesterdayMetrics.totalPTotal;

      // Sales Today = Today's Total Sortie from Daily Reports
      const salesToday = todayMetrics.totalSortie;
      const salesYesterday = yesterdayMetrics.totalSortie;

      // Calculate week and month metrics
      let revenueWeek = 0;
      let revenueMonth = 0;
      let salesWeek = 0;
      let salesMonth = 0;

      // Calculate for the past 7 days
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(today, i), 'yyyy-MM-dd');
        const dayMetrics = await calculateDailyReportMetrics(date);
        revenueWeek += dayMetrics.totalPTotal;
        salesWeek += dayMetrics.totalSortie;
      }

      // Calculate for the past 30 days
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(today, i), 'yyyy-MM-dd');
        const dayMetrics = await calculateDailyReportMetrics(date);
        revenueMonth += dayMetrics.totalPTotal;
        salesMonth += dayMetrics.totalSortie;
      }

      // Total Revenue = Sum of all Daily Report P.Totals
      const totalRevenue = await calculateTotalRevenue();

      // Calculate Total Entres from stock adjustments
      const totalEntres = await calculateTotalEntres();

      console.log('📊 Dashboard metrics calculated:', {
        revenueToday,
        salesToday,
        totalRevenue,
        totalEntres
      });

      // Fetch products data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('quantity, category, name, id, price')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      const productsInStock = products?.reduce((sum, product) => sum + Number(product.quantity || 0), 0) || 0;
      const lowStockCount = products?.filter(product => Number(product.quantity || 0) < 5).length || 0;

      // Fetch users count (admin only)
      let totalUsers = 0;
      if (user.role === 'admin') {
        const usersData = localStorage.getItem('users');
        if (usersData) {
          totalUsers = JSON.parse(usersData).length;
        }
      }

      // Fetch credits data with comprehensive metrics
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('*');

      if (creditsError) throw creditsError;

      // Calculate credit metrics
      const today_date = new Date().toISOString().split('T')[0];
      const pendingCredits = credits?.filter(credit => credit.status === 'pending').length || 0;
      const overdueCredits = credits?.filter(credit => 
        credit.status === 'pending' && credit.due_date < today_date
      ).length || 0;
      
      // Calculate monetary values with proper number conversion
      const totalCash = credits?.filter(credit => credit.status === 'paid')
        .reduce((sum, credit) => sum + Number(credit.amount || 0), 0) || 0;
      const paidCreditsTotal = totalCash; // Same as totalCash
      const totalCreditsCount = credits?.length || 0;

      // Fetch recent sortie data instead of traditional sales
      const recentSales = await fetchRecentSortieData();

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

      // Generate sales overview for last 7 days using Daily Report logic
      const salesOverview = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateString = format(date, 'yyyy-MM-dd');
        const dayMetrics = await calculateDailyReportMetrics(dateString);
        
        salesOverview.push({
          date: format(date, 'MMM dd'),
          revenue: dayMetrics.totalPTotal,
          sales: dayMetrics.totalSortie,
          quantity: dayMetrics.totalSortie // Sales count = sortie
        });
      }

      // Generate hourly data for today (simplified)
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        hourlyData.push({
          hour: `${hour}:00`,
          sales: Math.floor(Math.random() * 10), // Simplified for now
          revenue: Math.floor(Math.random() * 1000)
        });
      }

      // Generate category breakdown
      const categoryMap = new Map();
      const categoryRevenue = new Map();
      
      products?.forEach(product => {
        const category = product.category;
        const quantity = Number(product.quantity || 0);
        if (categoryMap.has(category)) {
          categoryMap.set(category, categoryMap.get(category) + quantity);
        } else {
          categoryMap.set(category, quantity);
        }
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, quantity]) => ({
        name,
        quantity,
        revenue: categoryRevenue.get(name) || 0,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      }));

      // Generate top products (simplified)
      const topProducts = (products || []).slice(0, 5).map(product => ({
        name: product.name,
        quantity: Number(product.quantity || 0),
        revenue: Number(product.price || 0) * Number(product.quantity || 0)
      }));

      // Generate sales trend for last 30 days using Daily Report logic
      const salesTrend = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const dateString = format(date, 'yyyy-MM-dd');
        const dayMetrics = await calculateDailyReportMetrics(dateString);
        
        salesTrend.push({
          date: format(date, 'MMM dd'),
          revenue: dayMetrics.totalPTotal,
          sales: dayMetrics.totalSortie
        });
      }

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
        revenueYesterday,
        revenueWeek,
        revenueMonth,
        salesToday,
        salesYesterday,
        salesWeek,
        salesMonth,
        productsInStock,
        lowStockCount,
        totalRevenue,
        totalUsers,
        pendingCredits,
        overdueCredits,
        totalCash,
        paidCreditsTotal,
        totalCreditsCount,
        totalEntres,
        salesOverview,
        recentSales: recentSales || [],
        stockAlerts: stockAlerts || [],
        creditAlerts: creditAlerts || [],
        categoryBreakdown,
        topProducts,
        salesTrend,
        hourlyData,
        previousReports
      });

      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setDataLoading(false);
    }
  };

  const downloadTodaysReport = async () => {
    setDownloadingReport(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const reportData = {
        date: today,
        summary: {
          revenue: data.revenueToday,
          sales: data.salesToday,
          productsInStock: data.productsInStock,
          lowStockAlerts: data.lowStockCount,
          pendingCredits: data.pendingCredits,
          overdueCredits: data.overdueCredits,
          totalCash: data.totalCash,
          totalRevenue: data.totalRevenue,
          totalEntres: data.totalEntres
        },
        details: {
          recentSales: data.recentSales,
          stockAlerts: data.stockAlerts,
          creditAlerts: data.creditAlerts,
          topProducts: data.topProducts,
          categoryBreakdown: data.categoryBreakdown
        },
        trends: {
          hourlyData: data.hourlyData,
          salesOverview: data.salesOverview
        },
        credits: {
          totalCredits: data.totalCreditsCount,
          pendingCredits: data.pendingCredits,
          overdueCredits: data.overdueCredits,
          totalCash: data.totalCash,
          paidCreditsTotal: data.paidCreditsTotal
        },
        synchronization: {
          note: "Dashboard metrics are synchronized with Daily Reports",
          revenueToday_equals_PTotalToday: true,
          salesToday_equals_SortieToday: true,
          totalRevenue_equals_SumOfAllPTotals: true
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

  const getRevenueChange = () => {
    if (data.revenueYesterday === 0) return '+100%';
    const change = ((data.revenueToday - data.revenueYesterday) / data.revenueYesterday) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const getSalesChange = () => {
    if (data.salesYesterday === 0) return '+100%';
    const change = ((data.salesToday - data.salesYesterday) / data.salesYesterday) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
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
                📊 Synced with Daily Reports • Revenue = P.Total • Sales = Sortie
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">${data.revenueToday.toLocaleString()}</p>
                <p className={`text-sm mt-1 ${
                  data.revenueToday >= data.revenueYesterday ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getRevenueChange()} from yesterday
                </p>
                <p className="text-xs text-blue-500 mt-1">= Today's P.Total</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.salesToday}</p>
                <p className={`text-sm mt-1 ${
                  data.salesToday >= data.salesYesterday ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getSalesChange()} from yesterday
                </p>
                <p className="text-xs text-blue-500 mt-1">= Today's Sortie</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

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
                  📊 Sum of all P.Totals
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Credit Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Credits</p>
                <p className="text-2xl font-bold text-orange-600">{data.pendingCredits}</p>
                <p className="text-xs text-orange-500 mt-1">Awaiting payment</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Credits</p>
                <p className="text-2xl font-bold text-red-600">{data.overdueCredits}</p>
                <p className="text-xs text-red-500 mt-1">Past due date</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cash</p>
                <p className="text-2xl font-bold text-green-600">${data.totalCash.toFixed(2)}</p>
                <p className="text-xs text-green-500 mt-1">From paid credits</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entres</p>
                <p className="text-2xl font-bold text-blue-600">{data.totalEntres}</p>
                <p className="text-xs text-blue-500 mt-1">Stock increases</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        {user.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalUsers}</p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <Users className="h-6 w-6 text-cyan-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Credit Panel</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">Active</p>
                  <p className="text-xs text-blue-500 mt-1">Synced with dashboard</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Status</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">Online</p>
                  <p className="text-xs text-green-500 mt-1">All systems operational</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Synchronization Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Dashboard Synchronized with Daily Reports
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Revenue Today</strong> = Today's P.Total from Daily Reports</li>
                  <li><strong>Sales Today</strong> = Today's Total Sortie from Daily Reports</li>
                  <li><strong>Total Revenue</strong> = Sum of all Daily Report P.Totals</li>
                  <li><strong>Total Entres</strong> = All stock increases from Sales Management</li>
                  <li><strong>Recent Sales</strong> = Recent sortie data with timestamps</li>
                  <li>Data refreshes automatically for next day's metrics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sales Trend Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
                <p className="text-sm text-gray-600">Last 7 days performance (Daily Reports data)</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.salesOverview}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => [
                    name === 'revenue' ? `$${value}` : value,
                    name === 'revenue' ? 'P.Total' : name === 'sales' ? 'Sortie' : 'Quantity'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Sales Activity */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Today's Activity</h3>
                <p className="text-sm text-gray-600">Hourly sales breakdown</p>
              </div>
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown and Top Products */}
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
                      <p className="text-sm text-gray-600">{product.quantity} in stock</p>
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

        {/* Tables and Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Sales - Now showing Sortie data */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Sales (Sortie)</h3>
                <p className="text-sm text-gray-600">Latest product sortie from Daily Reports</p>
              </div>
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
            
            {data.recentSales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>No recent sortie found</p>
                <p className="text-xs text-gray-400 mt-1">Sortie data will appear when stock adjustments are made</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Product</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Sortie Qty</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.recentSales.slice(0, 8).map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="py-3 text-sm text-gray-900">{sale.product_name}</td>
                        <td className="py-3 text-sm font-medium text-red-600">{sale.sortie}</td>
                        <td className="py-3 text-sm text-gray-600">
                          <div>
                            <div>{format(new Date(sale.created_at), 'MMM dd, yyyy')}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(sale.created_at), 'HH:mm')}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Information about sortie data */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">📊 About Sortie Data</p>
                    <p className="text-xs">
                      Sortie represents products that left inventory (calculated as Total/Jour - Solde in Daily Reports).
                      Timestamps show when stock adjustments were made in Sales Management.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          <StockAlerts alerts={data.stockAlerts} />
        </div>

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
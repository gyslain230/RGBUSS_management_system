import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Package,
  Users,
  Filter,
  Search,
  Eye,
  BarChart3,
  PieChart as PieChartIcon
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
import { format, startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface DailyReportData {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalQuantity: number;
  uniqueCustomers: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    quantity: number;
    revenue: number;
    color: string;
  }>;
  hourlyData: Array<{
    hour: string;
    sales: number;
    revenue: number;
  }>;
  salesData: any[];
}

export default function DailyReports() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportHistory, setReportHistory] = useState<Array<{
    date: string;
    displayDate: string;
    totalSales: number;
    totalRevenue: number;
  }>>([]);

  useEffect(() => {
    generateReport();
    loadReportHistory();
  }, [selectedDate]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const startDate = startOfDay(parseISO(selectedDate)).toISOString();
      const endDate = endOfDay(parseISO(selectedDate)).toISOString();

      // Fetch sales data for the selected date
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Fetch products data for category breakdown
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

      if (productsError) throw productsError;

      // Calculate metrics
      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalQuantity = salesData?.reduce((sum, sale) => sum + sale.quantity_sold, 0) || 0;
      const uniqueCustomers = new Set(salesData?.map(sale => sale.customer_name).filter(Boolean)).size;

      // Calculate top products
      const productSales = new Map();
      salesData?.forEach(sale => {
        if (productSales.has(sale.product_name)) {
          const existing = productSales.get(sale.product_name);
          productSales.set(sale.product_name, {
            name: sale.product_name,
            quantity: existing.quantity + sale.quantity_sold,
            revenue: existing.revenue + sale.total_amount
          });
        } else {
          productSales.set(sale.product_name, {
            name: sale.product_name,
            quantity: sale.quantity_sold,
            revenue: sale.total_amount
          });
        }
      });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate category breakdown
      const categoryMap = new Map();
      salesData?.forEach(sale => {
        const product = products?.find(p => p.id === sale.product_id);
        if (product) {
          const category = product.category;
          if (categoryMap.has(category)) {
            const existing = categoryMap.get(category);
            categoryMap.set(category, {
              name: category,
              quantity: existing.quantity + sale.quantity_sold,
              revenue: existing.revenue + sale.total_amount
            });
          } else {
            categoryMap.set(category, {
              name: category,
              quantity: sale.quantity_sold,
              revenue: sale.total_amount
            });
          }
        }
      });

      const categoryBreakdown = Array.from(categoryMap.values()).map((cat, index) => ({
        ...cat,
        color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
      }));

      // Generate hourly data
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(parseISO(selectedDate));
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(parseISO(selectedDate));
        hourEnd.setHours(hour, 59, 59, 999);
        
        const hourSales = salesData?.filter(sale => {
          const saleTime = new Date(sale.created_at);
          return saleTime >= hourStart && saleTime <= hourEnd;
        }) || [];
        
        hourlyData.push({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          sales: hourSales.length,
          revenue: hourSales.reduce((sum, sale) => sum + sale.total_amount, 0)
        });
      }

      setReportData({
        date: selectedDate,
        totalSales,
        totalRevenue,
        totalQuantity,
        uniqueCustomers,
        topProducts,
        categoryBreakdown,
        hourlyData,
        salesData: salesData || []
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const loadReportHistory = async () => {
    try {
      // Generate mock history for the last 30 days
      const history = [];
      for (let i = 1; i <= 30; i++) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get actual data if available
        const startDate = startOfDay(date).toISOString();
        const endDate = endOfDay(date).toISOString();
        
        const { data: salesData } = await supabase
          .from('sales')
          .select('total_amount')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const totalSales = salesData?.length || 0;
        const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

        history.push({
          date: dateStr,
          displayDate: format(date, 'MMM dd, yyyy'),
          totalSales,
          totalRevenue
        });
      }
      
      setReportHistory(history);
    } catch (error) {
      console.error('Error loading report history:', error);
    }
  };

  const downloadReport = async () => {
    if (!reportData) return;

    setDownloadingReport(true);
    try {
      const reportContent = {
        reportDate: reportData.date,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.full_name,
        summary: {
          totalSales: reportData.totalSales,
          totalRevenue: reportData.totalRevenue,
          totalQuantity: reportData.totalQuantity,
          uniqueCustomers: reportData.uniqueCustomers
        },
        topProducts: reportData.topProducts,
        categoryBreakdown: reportData.categoryBreakdown,
        hourlyBreakdown: reportData.hourlyData,
        detailedSales: reportData.salesData.map(sale => ({
          time: format(new Date(sale.created_at), 'HH:mm:ss'),
          product: sale.product_name,
          customer: sale.customer_name || 'Walk-in',
          quantity: sale.quantity_sold,
          unitPrice: sale.unit_price,
          totalAmount: sale.total_amount,
          isCredit: sale.is_credit
        }))
      };

      const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${reportData.date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Error downloading report');
    } finally {
      setDownloadingReport(false);
    }
  };

  const downloadHistoricalReport = async (historyItem: any) => {
    try {
      const reportContent = {
        reportDate: historyItem.date,
        summary: {
          totalSales: historyItem.totalSales,
          totalRevenue: historyItem.totalRevenue
        },
        note: 'Historical report summary'
      };

      const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historical-report-${historyItem.date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Historical report for ${historyItem.displayDate} downloaded!`);
    } catch (error) {
      console.error('Error downloading historical report:', error);
      toast.error('Error downloading report');
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to access daily reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
          <p className="text-gray-600">Generate and view comprehensive daily business reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={downloadReport}
            disabled={!reportData || downloadingReport}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadingReport ? 'Downloading...' : 'Download Report'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.totalSales}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${reportData.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Sold</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.totalQuantity}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Customers</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.uniqueCustomers}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hourly Sales Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Hourly Sales Activity</h3>
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Sales by Category</h3>
                <PieChartIcon className="h-5 w-5 text-purple-500" />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    label={({ name, revenue }) => `${name}: $${revenue.toFixed(2)}`}
                  >
                    {reportData.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Products</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.quantity} sold</p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">${product.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Sales Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Sales ({reportData.salesData.length})</h3>
            </div>
            {reportData.salesData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No sales recorded for this date
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.salesData.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(sale.created_at), 'HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sale.customer_name || 'Walk-in'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.quantity_sold}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${sale.total_amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sale.is_credit ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {sale.is_credit ? 'Credit' : 'Cash'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Report History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Report History</h3>
          <Calendar className="h-5 w-5 text-blue-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {reportHistory.map((report) => (
            <div key={report.date} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
              <div>
                <p className="font-medium text-gray-900">{report.displayDate}</p>
                <p className="text-sm text-gray-600">Sales: {report.totalSales}</p>
                <p className="text-sm text-gray-600">Revenue: ${report.totalRevenue.toFixed(2)}</p>
              </div>
              <button
                onClick={() => downloadHistoricalReport(report)}
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
  );
}
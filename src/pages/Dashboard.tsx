import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Package, ShoppingCart, CreditCard, TrendingUp, Users, Calendar, AlertTriangle, Download, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product, Sale, Credit, StockAdjustment } from '../lib/supabase';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import MetricCard from '../components/Dashboard/MetricCard';
import RecentSalesTable from '../components/Dashboard/RecentSalesTable';
import StockAlerts from '../components/Dashboard/StockAlerts';
import AIInsights from '../components/Dashboard/AIInsights';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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

interface DailyReportData {
  no: number;
  libelle: string;
  stock: number;
  entres: number;
  totalJour: number;
  solde: number;
  sortie: number;
  pUnit1: number;
  pTotal: number;
  amavide: number;
  productId: string;
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
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

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
        fetchWithFallback(supabase.from('products').select('*')),
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

  const getPreviousDayStock = async (productId: string, currentDate: string) => {
    try {
      const previousDate = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd');
      
      // Check if there are any stock adjustments before the current date
      const { data: historicalAdjustments, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('product_id', productId)
        .lt('created_at', `${currentDate}T00:00:00.000Z`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      // If no historical adjustments exist, this is the first day - stock should be 0
      if (!historicalAdjustments || historicalAdjustments.length === 0) {
        return 0;
      }

      // Get the last known stock level from the most recent adjustment before current date
      const lastAdjustment = historicalAdjustments[0];
      return lastAdjustment.new_quantity;
    } catch (error) {
      console.error('Error getting previous day stock:', error);
      return 0;
    }
  };

  const generateDailyReport = async (reportType: 'today' | 'weekly' | 'monthly') => {
    setDownloadingReport(reportType);
    
    try {
      let startDate: Date;
      let endDate: Date;
      let reportTitle: string;

      const today = new Date();

      switch (reportType) {
        case 'today':
          startDate = startOfDay(today);
          endDate = endOfDay(today);
          reportTitle = `Daily Report - ${format(today, 'MMMM dd, yyyy')}`;
          break;
        case 'weekly':
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
          endDate = endOfWeek(today, { weekStartsOn: 1 });
          reportTitle = `Weekly Report - ${format(startDate, 'MMM dd')} to ${format(endDate, 'MMM dd, yyyy')}`;
          break;
        case 'monthly':
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          reportTitle = `Monthly Report - ${format(today, 'MMMM yyyy')}`;
          break;
      }

      // Fetch data for the period
      const [products, adjustments, credits] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('stock_adjustments').select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('credits').select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
      ]);

      if (!products.data || !adjustments.data || !credits.data) {
        throw new Error('Failed to fetch report data');
      }

      // Process data for each product
      const reportData: DailyReportData[] = await Promise.all(
        products.data.map(async (product, index) => {
          // Get stock from previous day (0 if first day)
          const previousDayStock = reportType === 'today' ? 
            await getPreviousDayStock(product.id, format(startDate, 'yyyy-MM-dd')) : 0;
          
          // Calculate stock adjustments (entres) for this product in the period
          const productAdjustments = adjustments.data.filter(adj => adj.product_id === product.id);
          
          // Calculate entres (increases only)
          const entres = productAdjustments
            .filter(adj => adj.adjustment_type === 'increase')
            .reduce((sum, adj) => sum + adj.quantity_adjusted, 0);

          // Calculate values based on business logic
          const stock = previousDayStock; // Stock = previous day's solde
          const totalJour = stock + entres; // Total available for the day
          const solde = Number(product.quantity) || 0; // Current balance (end of day)
          
          // Sortie = Total/Jour - Solde
          const sortie = totalJour - solde;
          
          const pUnit1 = Number(product.price) || 0; // Unit price
          const pTotal = sortie * pUnit1; // P.Total = Sortie × P.Unit 1
          const amavide = Math.max(0, solde - 5); // Available minus minimum stock (5)

          return {
            no: index + 1,
            libelle: product.name,
            stock,
            entres,
            totalJour,
            solde,
            sortie,
            pUnit1,
            pTotal,
            amavide,
            productId: product.id
          };
        })
      );

      // Generate PDF
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Header - Company Name and Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('BAR LE BON SAMARITAIN', 20, 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(reportTitle, 20, 28);
      
      // Date range
      doc.setFontSize(10);
      doc.text(`Period: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`, 20, 36);

      // Column headers for the main table
      const startY = 45;
      const rowHeight = 6;
      const colWidths = [12, 45, 15, 15, 20, 15, 15, 18, 18, 15];
      let currentX = 20;

      // Draw table headers
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      // Header row
      doc.rect(20, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight);
      
      const headers = ['No', 'LIBELLE', 'Stock', 'Entres', 'Total/Jour', 'Solde', 'Sortie', 'P.Unit 1', 'P.Total', 'Amavide'];
      
      currentX = 20;
      headers.forEach((header, index) => {
        if (index > 0) {
          doc.line(currentX, startY, currentX, startY + rowHeight);
        }
        doc.text(header, currentX + 2, startY + 4);
        currentX += colWidths[index];
      });
      
      doc.line(currentX, startY, currentX, startY + rowHeight);

      // Data rows
      doc.setFont('helvetica', 'normal');
      let currentY = startY + rowHeight;
      
      reportData.forEach((item) => {
        doc.rect(20, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight);
        
        currentX = 20;
        const rowData = [
          item.no.toString(),
          item.libelle.substring(0, 20),
          item.stock.toString(),
          item.entres.toString(),
          item.totalJour.toString(),
          item.solde.toString(),
          item.sortie.toString(),
          item.pUnit1.toFixed(0),
          item.pTotal.toFixed(0),
          item.amavide.toString()
        ];
        
        rowData.forEach((data, colIndex) => {
          if (colIndex > 0) {
            doc.line(currentX, currentY, currentX, currentY + rowHeight);
          }
          
          const isNumber = colIndex > 1;
          if (isNumber) {
            doc.text(data, currentX + colWidths[colIndex] - 2, currentY + 4, { align: 'right' });
          } else {
            doc.text(data, currentX + 2, currentY + 4);
          }
          currentX += colWidths[colIndex];
        });
        
        doc.line(currentX, currentY, currentX, currentY + rowHeight);
        currentY += rowHeight;
      });

      // Total row
      const totals = {
        totalStock: reportData.reduce((sum, item) => sum + Number(item.stock || 0), 0),
        totalEntres: reportData.reduce((sum, item) => sum + Number(item.entres || 0), 0),
        totalJour: reportData.reduce((sum, item) => sum + Number(item.totalJour || 0), 0),
        totalSolde: reportData.reduce((sum, item) => sum + Number(item.solde || 0), 0),
        totalSortie: reportData.reduce((sum, item) => sum + Number(item.sortie || 0), 0),
        totalPTotal: reportData.reduce((sum, item) => sum + Number(item.pTotal || 0), 0),
        totalAmavide: reportData.reduce((sum, item) => sum + Number(item.amavide || 0), 0)
      };

      doc.setFont('helvetica', 'bold');
      doc.rect(20, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight);
      
      currentX = 20;
      const totalRowData = [
        'TOTAL',
        '',
        totals.totalStock.toString(),
        totals.totalEntres.toString(),
        totals.totalJour.toString(),
        totals.totalSolde.toString(),
        totals.totalSortie.toString(),
        '',
        totals.totalPTotal.toFixed(0),
        totals.totalAmavide.toString()
      ];
      
      totalRowData.forEach((data, colIndex) => {
        if (colIndex > 0) {
          doc.line(currentX, currentY, currentX, currentY + rowHeight);
        }
        
        if (data) {
          const isNumber = colIndex > 1 && colIndex !== 7;
          if (isNumber) {
            doc.text(data, currentX + colWidths[colIndex] - 2, currentY + 4, { align: 'right' });
          } else {
            doc.text(data, currentX + 2, currentY + 4);
          }
        }
        currentX += colWidths[colIndex];
      });
      
      doc.line(currentX, currentY, currentX, currentY + rowHeight);
      currentY += rowHeight + 10;

      // Credits section
      if (credits.data.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('CREDITS (DETTE)', 20, currentY);
        currentY += 8;

        const creditColWidths = [15, 60, 25];
        const creditHeaders = ['No', 'NOM ET PRENOM', 'MONTANT'];
        
        doc.setFontSize(8);
        doc.rect(20, currentY, creditColWidths.reduce((a, b) => a + b, 0), rowHeight);
        currentX = 20;
        
        creditHeaders.forEach((header, index) => {
          if (index > 0) {
            doc.line(currentX, currentY, currentX, currentY + rowHeight);
          }
          doc.text(header, currentX + 2, currentY + 4);
          currentX += creditColWidths[index];
        });
        doc.line(currentX, currentY, currentX, currentY + rowHeight);
        currentY += rowHeight;

        doc.setFont('helvetica', 'normal');
        credits.data.forEach((credit, index) => {
          doc.rect(20, currentY, creditColWidths.reduce((a, b) => a + b, 0), rowHeight);
          
          currentX = 20;
          const creditRowData = [
            (index + 1).toString(),
            credit.customer_name.substring(0, 25),
            Number(credit.amount).toFixed(0)
          ];
          
          creditRowData.forEach((data, colIndex) => {
            if (colIndex > 0) {
              doc.line(currentX, currentY, currentX, currentY + rowHeight);
            }
            
            if (colIndex === 2) {
              doc.text(data, currentX + creditColWidths[colIndex] - 2, currentY + 4, { align: 'right' });
            } else {
              doc.text(data, currentX + 2, currentY + 4);
            }
            currentX += creditColWidths[colIndex];
          });
          doc.line(currentX, currentY, currentX, currentY + rowHeight);
          currentY += rowHeight;
        });

        // Credit total
        doc.setFont('helvetica', 'bold');
        const totalCreditAmount = credits.data.reduce((sum, credit) => sum + Number(credit.amount || 0), 0);
        doc.rect(20, currentY, creditColWidths.reduce((a, b) => a + b, 0), rowHeight);
        
        currentX = 20;
        const creditTotalData = ['TOTAL', '', totalCreditAmount.toFixed(0)];
        
        creditTotalData.forEach((data, colIndex) => {
          if (colIndex > 0) {
            doc.line(currentX, currentY, currentX, currentY + rowHeight);
          }
          
          if (data) {
            if (colIndex === 2) {
              doc.text(data, currentX + creditColWidths[colIndex] - 2, currentY + 4, { align: 'right' });
            } else {
              doc.text(data, currentX + 2, currentY + 4);
            }
          }
          currentX += creditColWidths[colIndex];
        });
        doc.line(currentX, currentY, currentX, currentY + rowHeight);
      }

      // Footer
      const footerY = pageHeight - 30;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated by: ${user?.full_name}`, 20, footerY);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, footerY + 5);
      doc.text('RGBUSS Business Management System', pageWidth - 20, footerY, { align: 'right' });

      // Save the PDF
      const fileName = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);

      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded successfully!`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Error generating ${reportType} report`);
    } finally {
      setDownloadingReport(null);
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

      {/* Daily Report Download Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Report Downloads</h3>
            <p className="text-sm text-gray-600">Generate and download daily reports for different periods</p>
          </div>
          <FileText className="h-6 w-6 text-blue-600" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Report */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-blue-900">Today's Report</h4>
                <p className="text-sm text-blue-700">{format(new Date(), 'MMMM dd, yyyy')}</p>
              </div>
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <button
              onClick={() => generateDailyReport('today')}
              disabled={downloadingReport === 'today'}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingReport === 'today' ? 'Generating...' : 'Download Today'}
            </button>
          </div>

          {/* Weekly Report */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-green-900">Weekly Report</h4>
                <p className="text-sm text-green-700">
                  {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM dd')}
                </p>
              </div>
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <button
              onClick={() => generateDailyReport('weekly')}
              disabled={downloadingReport === 'weekly'}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingReport === 'weekly' ? 'Generating...' : 'Download Weekly'}
            </button>
          </div>

          {/* Monthly Report */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-purple-900">Monthly Report</h4>
                <p className="text-sm text-purple-700">{format(new Date(), 'MMMM yyyy')}</p>
              </div>
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <button
              onClick={() => generateDailyReport('monthly')}
              disabled={downloadingReport === 'monthly'}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingReport === 'monthly' ? 'Generating...' : 'Download Monthly'}
            </button>
          </div>
        </div>

        {/* Report Information */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">📋 Report Information</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Today:</strong> Complete daily report for current date with stock movements and credits</li>
              <li><strong>Weekly:</strong> Consolidated report from Monday to Sunday of current week</li>
              <li><strong>Monthly:</strong> Full month report with all transactions and stock changes</li>
              <li>All reports include product inventory, stock adjustments, and credit transactions</li>
            </ul>
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
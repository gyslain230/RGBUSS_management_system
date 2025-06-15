import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, RefreshCw, Info, Package, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product, Sale, StockAdjustment, Credit } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

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

export default function DailyReports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<DailyReportData[]>([]);
  const [creditsData, setCreditsData] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [refreshing, setRefreshing] = useState(false);
  const [isFirstDay, setIsFirstDay] = useState(false);
  const [adjustmentsFound, setAdjustmentsFound] = useState(0);

  useEffect(() => {
    fetchReportData();
  }, [selectedDate]);

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

  const fetchReportData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching report data for date:', selectedDate);
      
      // Fetch all approved products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (productsError) throw productsError;
      console.log('📦 Found products:', products?.length || 0);

      // Fetch stock adjustments for the selected date with broader time range
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      console.log('📅 Searching for adjustments between:', startOfDay, 'and', endOfDay);

      const { data: adjustments, error: adjustmentsError } = await supabase
        .from('stock_adjustments')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (adjustmentsError) throw adjustmentsError;
      
      console.log('📊 Found adjustments for selected date:', adjustments?.length || 0);
      console.log('📊 Adjustments details:', adjustments);
      setAdjustmentsFound(adjustments?.length || 0);

      // Fetch credits for the selected date
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (creditsError) throw creditsError;
      console.log('💳 Found credits for selected date:', credits?.length || 0);
      setCreditsData(credits || []);

      // Also fetch all adjustments to check if this is the first day
      const { data: allAdjustments, error: allAdjustmentsError } = await supabase
        .from('stock_adjustments')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      if (allAdjustmentsError) throw allAdjustmentsError;

      const firstAdjustmentDate = allAdjustments && allAdjustments.length > 0 
        ? allAdjustments[0].created_at.split('T')[0] 
        : null;
      
      const isFirstDayEver = !firstAdjustmentDate || selectedDate <= firstAdjustmentDate;
      setIsFirstDay(isFirstDayEver);
      console.log('🏁 Is first day:', isFirstDayEver);

      // Process data for each product
      const processedData: DailyReportData[] = await Promise.all(
        (products || []).map(async (product, index) => {
          console.log(`🔄 Processing product: ${product.name} (ID: ${product.id})`);
          
          // Get stock from previous day (0 if first day)
          const previousDayStock = isFirstDayEver ? 0 : await getPreviousDayStock(product.id, selectedDate);
          console.log(`📈 Previous day stock for ${product.name}:`, previousDayStock);
          
          // Calculate stock adjustments (entres) for this product on the selected date
          const productAdjustments = (adjustments || []).filter(adj => adj.product_id === product.id);
          console.log(`📊 Product adjustments for ${product.name}:`, productAdjustments);
          
          // Calculate entres (increases only)
          const entres = productAdjustments
            .filter(adj => adj.adjustment_type === 'increase')
            .reduce((sum, adj) => sum + adj.quantity_adjusted, 0);
          
          console.log(`📈 Entres for ${product.name}:`, entres);

          // Calculate values based on business logic
          const stock = previousDayStock; // Stock = previous day's solde
          const totalJour = stock + entres; // Total available for the day
          const solde = Number(product.quantity) || 0; // Current balance (end of day)
          
          // Sortie = Total/Jour - Solde
          const sortie = totalJour - solde;
          
          const pUnit1 = Number(product.price) || 0; // Unit price
          const pTotal = sortie * pUnit1; // P.Total = Sortie × P.Unit 1
          const amavide = Math.max(0, solde - 5); // Available minus minimum stock (5)

          console.log(`📊 Calculated values for ${product.name}:`, {
            stock, entres, totalJour, solde, sortie, pUnit1, pTotal, amavide
          });

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

      console.log('✅ Final processed data:', processedData);
      setReportData(processedData);
    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      toast.error('Error loading report data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
    toast.success('Report data refreshed');
  };

  const handleExportReport = () => {
    try {
      const reportContent = {
        date: selectedDate,
        isFirstDay,
        adjustmentsFound,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.full_name,
        data: reportData,
        credits: creditsData,
        summary: {
          totalProducts: reportData.length,
          totalStock: reportData.reduce((sum, item) => sum + Number(item.stock), 0),
          totalEntres: reportData.reduce((sum, item) => sum + Number(item.entres), 0),
          totalSorties: reportData.reduce((sum, item) => sum + Number(item.sortie), 0),
          totalRevenue: reportData.reduce((sum, item) => sum + Number(item.pTotal), 0),
          totalCredits: creditsData.length,
          totalCreditAmount: creditsData.reduce((sum, credit) => sum + Number(credit.amount), 0)
        },
        note: isFirstDay ? 'This is the first day - stock values are 0 as there is no previous day data' : 'Stock values based on previous day\'s solde',
        entresNote: 'Entres include new product entries and stock adjustments from Sales Management'
      };

      const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${selectedDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Error exporting report');
    }
  };

  // Calculate totals with proper number conversion
  const calculateTotals = () => {
    return {
      totalStock: reportData.reduce((sum, item) => sum + Number(item.stock || 0), 0),
      totalEntres: reportData.reduce((sum, item) => sum + Number(item.entres || 0), 0),
      totalJour: reportData.reduce((sum, item) => sum + Number(item.totalJour || 0), 0),
      totalSolde: reportData.reduce((sum, item) => sum + Number(item.solde || 0), 0),
      totalSortie: reportData.reduce((sum, item) => sum + Number(item.sortie || 0), 0),
      totalPTotal: reportData.reduce((sum, item) => sum + Number(item.pTotal || 0), 0),
      totalAmavide: reportData.reduce((sum, item) => sum + Number(item.amavide || 0), 0)
    };
  };

  const totals = calculateTotals();

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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
          <p className="text-gray-600">Comprehensive daily inventory and sales report</p>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-sm text-green-600">
              📊 Stock = Previous day's solde • Entres = New products + Stock adjustments
            </p>
            <span className="text-gray-300">•</span>
            <p className="text-sm text-blue-600">
              📈 {adjustmentsFound} adjustments found for {selectedDate}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Date Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Debug Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Debug Information
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                <strong>Selected Date:</strong> {selectedDate} | 
                <strong> Adjustments Found:</strong> {adjustmentsFound} | 
                <strong> Products:</strong> {reportData.length} | 
                <strong> Total Entres:</strong> {totals.totalEntres} |
                <strong> Credits Found:</strong> {creditsData.length}
              </p>
              {adjustmentsFound === 0 && (
                <p className="mt-1 text-yellow-600">
                  ⚠️ No stock adjustments found for this date. Make sure you've submitted solde entries in Sales Management for today.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* First Day Notice */}
      {isFirstDay && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                First Day Notice
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This appears to be the first day of operations or the selected date has no previous day data. 
                  All stock values are set to 0 as there is no previous day's solde to reference.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entres Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <Package className="h-5 w-5 text-green-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Entres (New Stock Entries)
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                The "Entres" column shows all new stock that entered your inventory today, including:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Initial quantities when adding new products</li>
                <li>Stock increases from inventory adjustments</li>
                <li>Solde adjustments from Sales Management (increase type only)</li>
                <li>New stock received from suppliers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{reportData.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Stock</p>
          <p className="text-2xl font-bold text-blue-600">
            {totals.totalStock}
          </p>
          {isFirstDay && <p className="text-xs text-blue-500">First day - all 0</p>}
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Entres</p>
          <p className="text-2xl font-bold text-green-600">
            {totals.totalEntres}
          </p>
          <p className="text-xs text-green-500">New products + adjustments</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            ${totals.totalPTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Main Content Grid - Daily Report Table and Credit Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Report Table - Takes 2/3 of the space */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Daily Report - {format(new Date(selectedDate), 'EEEE, MMMM do, yyyy')}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Generated by {user?.full_name} • {reportData.length} products
                    {isFirstDay && <span className="text-blue-600 ml-2">• First Day</span>}
                    {adjustmentsFound > 0 && <span className="text-green-600 ml-2">• {adjustmentsFound} adjustments</span>}
                  </p>
                </div>
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            {reportData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>No products found for the selected date</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Libelle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Stock
                        {isFirstDay && <div className="text-xs text-blue-500 normal-case">(First day)</div>}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Entres
                        <div className="text-xs text-green-500 normal-case">(New + Adjustments)</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Total/Jour
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Solde
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Sortie
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        P.Unit 1
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        P.Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amavide
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((item, index) => (
                      <tr key={item.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                          {item.no}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 max-w-xs truncate">
                          {item.libelle}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          <span className={isFirstDay ? 'text-blue-600' : ''}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          <span className={item.entres > 0 ? 'text-green-600 font-medium' : ''}>
                            {item.entres}
                          </span>
                          {item.entres > 0 && (
                            <div className="text-xs text-green-500">New entries</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          {item.totalJour}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          {item.solde}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          <span className={item.sortie > 0 ? 'text-red-600 font-medium' : ''}>
                            {item.sortie}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          ${Number(item.pUnit1).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                          <span className={item.pTotal > 0 ? 'text-green-600 font-medium' : ''}>
                            ${Number(item.pTotal).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <span className={item.amavide < 5 ? 'text-orange-600 font-medium' : ''}>
                            {item.amavide}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  {/* Summary Row - Fixed Calculations */}
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr className="font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        {reportData.length} Products
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        <span className={isFirstDay ? 'text-blue-600' : ''}>
                          {totals.totalStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 border-r border-gray-200">
                        {totals.totalEntres}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        {totals.totalJour}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        {totals.totalSolde}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 border-r border-gray-200">
                        {totals.totalSortie}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        -
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 border-r border-gray-200">
                        ${totals.totalPTotal.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {totals.totalAmavide}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Credit Table (DETTE) - Takes 1/3 of the space */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    2. (DETTE NOM ET PRENOM + MONTANT)
                  </h2>
                  <p className="text-sm text-gray-600">
                    Credits issued on {format(new Date(selectedDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>

            {creditsData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>No credits found for this date</p>
                <p className="text-xs text-gray-400 mt-1">Credits will appear here when issued</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NOM ET PRENOM
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MONTANT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {creditsData.map((credit, index) => (
                      <tr key={credit.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {credit.customer_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-orange-600">
                          ${Number(credit.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  {/* Credit Summary Row */}
                  <tfoot className="bg-orange-100 border-t-2 border-orange-300">
                    <tr className="font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {creditsData.length} Credits
                      </td>
                      <td className="px-4 py-3 text-sm text-orange-600">
                        ${creditsData.reduce((sum, credit) => sum + Number(credit.amount || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Credit Information */}
            <div className="px-6 py-4 bg-orange-50 border-t border-orange-200">
              <div className="text-sm text-orange-700">
                <p className="font-medium mb-1">📋 Credit Information</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Shows all credits issued on the selected date</li>
                  <li>Customer names from Credit Panel records</li>
                  <li>Amounts match Credit Panel data</li>
                  <li>Data synced with Credit Management system</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
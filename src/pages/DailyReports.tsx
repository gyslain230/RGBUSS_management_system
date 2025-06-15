import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, RefreshCw, Info, Package, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product, Sale, StockAdjustment, Credit } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
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

export default function DailyReports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<DailyReportData[]>([]);
  const [creditsData, setCreditsData] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [refreshing, setRefreshing] = useState(false);
  const [isFirstDay, setIsFirstDay] = useState(false);
  const [adjustmentsFound, setAdjustmentsFound] = useState(0);
  const [hasReportData, setHasReportData] = useState(false);

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

      // Check if we have meaningful report data
      const hasData = (products && products.length > 0) && 
                     ((adjustments && adjustments.length > 0) || 
                      (credits && credits.length > 0) || 
                      isFirstDayEver);
      
      setHasReportData(hasData);
      console.log('📊 Has report data:', hasData);

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
      setHasReportData(false);
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
    // Check if we have meaningful report data
    if (!hasReportData || (reportData.length === 0 && creditsData.length === 0 && adjustmentsFound === 0)) {
      toast.error(`No daily report data found for ${format(new Date(selectedDate), 'MMMM dd, yyyy')}. Please select a date with stock adjustments or credits.`);
      return;
    }

    try {
      // Create PDF in A4 format
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Header - Company Name and Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('BAR LE BON SAMARITAIN', 20, 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('FICHE D\'EXPLOITATION/CAISSE', 20, 28);
      
      // Date
      doc.setFontSize(10);
      doc.text(`DATE: ${format(new Date(selectedDate), 'dd/MM/yyyy')}`, 20, 36);

      // Column headers for the main table (matching the image exactly)
      const startY = 45;
      const rowHeight = 6;
      const colWidths = [12, 45, 15, 15, 20, 15, 15, 18, 18, 15]; // Adjusted column widths
      let currentX = 20;

      // Draw table headers
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      // Header row
      doc.rect(20, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight);
      
      const headers = ['No', 'LIBELLE', 'Stock', 'Entres', 'Total/Jour', 'Solde', 'Sortie', 'P.Unit 1', 'P.Total', 'Amavide'];
      
      currentX = 20;
      headers.forEach((header, index) => {
        // Draw vertical lines
        if (index > 0) {
          doc.line(currentX, startY, currentX, startY + rowHeight);
        }
        
        // Add text
        doc.text(header, currentX + 2, startY + 4);
        currentX += colWidths[index];
      });
      
      // Draw right border
      doc.line(currentX, startY, currentX, startY + rowHeight);

      // Data rows
      doc.setFont('helvetica', 'normal');
      let currentY = startY + rowHeight;
      
      reportData.forEach((item, index) => {
        // Draw row border
        doc.rect(20, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight);
        
        currentX = 20;
        const rowData = [
          item.no.toString(),
          item.libelle.substring(0, 20), // Truncate long names
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
          // Draw vertical lines
          if (colIndex > 0) {
            doc.line(currentX, currentY, currentX, currentY + rowHeight);
          }
          
          // Add text (right align for numbers, left align for text)
          const isNumber = colIndex > 1; // All columns except No and LIBELLE are numbers
          if (isNumber) {
            doc.text(data, currentX + colWidths[colIndex] - 2, currentY + 4, { align: 'right' });
          } else {
            doc.text(data, currentX + 2, currentY + 4);
          }
          currentX += colWidths[colIndex];
        });
        
        // Draw right border
        doc.line(currentX, currentY, currentX, currentY + rowHeight);
        currentY += rowHeight;
      });

      // Total row
      const totals = calculateTotals();
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
        // Draw vertical lines
        if (colIndex > 0) {
          doc.line(currentX, currentY, currentX, currentY + rowHeight);
        }
        
        // Add text
        if (data) {
          const isNumber = colIndex > 1 && colIndex !== 7; // Skip P.Unit 1 column
          if (isNumber) {
            doc.text(data, currentX + colWidths[colIndex] - 2, currentY + 4, { align: 'right' });
          } else {
            doc.text(data, currentX + 2, currentY + 4);
          }
        }
        currentX += colWidths[colIndex];
      });
      
      // Draw right border
      doc.line(currentX, currentY, currentX, currentY + rowHeight);
      currentY += rowHeight + 10;

      // Section 2: DETTE (Credits) - Bottom left
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('2.(DETTE NOM ET PRENOM + MONTANT)', 20, currentY);
      currentY += 8;

      if (creditsData.length > 0) {
        // Credit table headers
        doc.setFontSize(8);
        const creditColWidths = [15, 60, 25];
        const creditHeaders = ['No', 'NOM ET PRENOM', 'MONTANT'];
        
        // Header row
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

        // Credit data rows
        doc.setFont('helvetica', 'normal');
        creditsData.forEach((credit, index) => {
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
            
            if (colIndex === 2) { // Amount column - right align
              doc.text(data, currentX + creditColWidths[colIndex] - 2, currentY + 4, { align: 'right' });
            } else {
              doc.text(data, currentX + 2, currentY + 4);
            }
            currentX += creditColWidths[colIndex];
          });
          doc.line(currentX, currentY, currentX, currentY + rowHeight);
          currentY += rowHeight;
        });

        // Credit total row
        doc.setFont('helvetica', 'bold');
        const totalCreditAmount = creditsData.reduce((sum, credit) => sum + Number(credit.amount || 0), 0);
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
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('No credits found for this date', 20, currentY);
      }

      // Section 3: Bottom right section (matching the image)
      const rightSectionX = 130;
      let rightSectionY = currentY - 40; // Position it higher to align with credits section
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('3.ROPORO Y\'AMAVIDE N\'IBIRAHURE', rightSectionX, rightSectionY);
      rightSectionY += 8;

      // Small table on the right
      const rightColWidths = [20, 25, 25, 25];
      const rightHeaders = ['AYATUWE', 'ATAMENETSE', 'UBUSOBANURO', 'IBIRAHURE'];
      
      // Header row for right section
      doc.rect(rightSectionX, rightSectionY, rightColWidths.reduce((a, b) => a + b, 0), rowHeight);
      currentX = rightSectionX;
      
      rightHeaders.forEach((header, index) => {
        if (index > 0) {
          doc.line(currentX, rightSectionY, currentX, rightSectionY + rowHeight);
        }
        doc.text(header, currentX + 1, rightSectionY + 4);
        currentX += rightColWidths[index];
      });
      doc.line(currentX, rightSectionY, currentX, rightSectionY + rowHeight);
      
      // Add a few empty rows for the right section
      for (let i = 0; i < 3; i++) {
        rightSectionY += rowHeight;
        doc.rect(rightSectionX, rightSectionY, rightColWidths.reduce((a, b) => a + b, 0), rowHeight);
        currentX = rightSectionX;
        rightColWidths.forEach((width, index) => {
          if (index > 0) {
            doc.line(currentX, rightSectionY, currentX, rightSectionY + rowHeight);
          }
          currentX += width;
        });
        doc.line(currentX, rightSectionY, currentX, rightSectionY + rowHeight);
      }

      // Footer information
      const footerY = pageHeight - 30;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated by: ${user?.full_name}`, 20, footerY);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, footerY + 5);
      doc.text('RGBUSS Business Management System', pageWidth - 20, footerY, { align: 'right' });

      // Save the PDF
      const fileName = `daily-report-${selectedDate}.pdf`;
      doc.save(fileName);

      toast.success('Daily report exported as PDF successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error exporting PDF report');
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
            Export PDF
          </button>
        </div>
      </div>

      {/* No Data Warning */}
      {!hasReportData && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                No Report Data Available
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  No daily report data found for <strong>{format(new Date(selectedDate), 'MMMM dd, yyyy')}</strong>.
                  This could mean:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>No stock adjustments were made on this date</li>
                  <li>No credits were issued on this date</li>
                  <li>No products were added or modified on this date</li>
                </ul>
                <p className="mt-2 font-medium">
                  💡 Try selecting a different date or add some stock adjustments in Sales Management first.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <strong> Credits Found:</strong> {creditsData.length} |
                <strong> Has Report Data:</strong> {hasReportData ? 'Yes' : 'No'}
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
                <p className="text-sm text-gray-400 mt-2">
                  Add products in Stock Management or submit solde entries in Sales Management
                </p>
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
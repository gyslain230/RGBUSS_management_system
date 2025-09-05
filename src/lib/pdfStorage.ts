import { supabase } from './supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface PDFMetadata {
  id: string;
  report_date: string;
  pdf_path: string;
  file_name: string;
  file_size: number;
  created_by: string;
  created_at: string;
  metadata: any;
}

export interface DailyReportData {
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

/**
 * Generate PDF from daily report data and store in Supabase Storage
 */
export const generateAndStoreDailyReportPDF = async (
  reportData: DailyReportData[],
  creditsData: any[],
  selectedDate: string,
  user: any,
  useStoredData: boolean = false
): Promise<{ success: boolean; pdfPath?: string; error?: string }> => {
  try {
    if (!user?.id) {
      throw new Error('User authentication required');
    }

    // Generate PDF
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BAR LE BON SAMARITAIN', 20, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('FICHE D\'EXPLOITATION/CAISSE', 20, 28);
    
    doc.setFontSize(10);
    doc.text(`DATE: ${new Date(selectedDate).toLocaleDateString('fr-FR')}`, 20, 36);
    doc.text(`Source: ${useStoredData ? 'Stored Database Report' : 'Live Generated Report'}`, 20, 42);

    // Main table
    const startY = 50;
    const rowHeight = 6;
    const colWidths = [12, 45, 15, 15, 20, 15, 15, 18, 18, 15];

    // Table headers
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.rect(20, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight);
    
    const headers = ['No', 'LIBELLE', 'Stock', 'Entres', 'Total/Jour', 'Solde', 'Sortie', 'P.Unit 1', 'P.Total', 'Amavide'];
    
    let currentX = 20;
    headers.forEach((header, index) => {
      if (index > 0) {
        doc.line(currentX, startY, currentX, startY + rowHeight);
      }
      doc.text(header, currentX + 2, startY + 4);
      currentX += colWidths[index];
    });
    doc.line(currentX, startY, currentX, startY + rowHeight);

    // Table data
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

    // Totals row
    const totals = calculateTotals(reportData);
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
    if (creditsData.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('2.(DETTE NOM ET PRENOM + MONTANT)', 20, currentY);
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

      // Credits total
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
    }

    // Footer
    const footerY = pageHeight - 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated by: ${user?.full_name}`, 20, footerY);
    doc.text(`Generated on: ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`, 20, footerY + 5);
    doc.text(`Data source: ${useStoredData ? 'Database Storage' : 'Live Generation'}`, 20, footerY + 10);
    doc.text('RGBUSS Business Management System', pageWidth - 20, footerY, { align: 'right' });

    // Convert PDF to blob
    const pdfBlob = doc.output('blob');
    
    // Generate file name and path
    const fileName = `daily-report-${selectedDate}.pdf`;
    const filePath = `${user.id}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('daily-report-pdfs')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Save metadata to database
    const pdfMetadata = {
      report_date: selectedDate,
      pdf_path: filePath,
      file_name: fileName,
      file_size: pdfBlob.size,
      created_by: user.id,
      metadata: {
        products_count: reportData.length,
        credits_count: creditsData.length,
        total_revenue: totals.totalPTotal,
        data_source: useStoredData ? 'stored' : 'live'
      }
    };

    const { error: dbError } = await supabase
      .from('daily_report_pdfs')
      .upsert([pdfMetadata]);

    if (dbError) {
      throw new Error(`Failed to save PDF metadata: ${dbError.message}`);
    }

    return {
      success: true,
      pdfPath: filePath
    };

  } catch (error: any) {
    console.error('Error generating and storing PDF:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate and store PDF'
    };
  }
};

/**
 * Retrieve stored PDF metadata
 */
export const getStoredPDFReports = async (): Promise<PDFMetadata[]> => {
  try {
    const { data, error } = await supabase
      .from('daily_report_pdfs')
      .select('*')
      .order('report_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch PDF reports: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error fetching stored PDF reports:', error);
    return [];
  }
};

/**
 * Get PDF download URL
 */
export const getPDFDownloadURL = async (pdfPath: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('daily-report-pdfs')
      .createSignedUrl(pdfPath, 3600); // 1 hour expiry

    if (error) {
      throw new Error(`Failed to create download URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error('Error creating PDF download URL:', error);
    return null;
  }
};

/**
 * Delete stored PDF
 */
export const deleteStoredPDF = async (pdfPath: string, reportDate: string): Promise<boolean> => {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('daily-report-pdfs')
      .remove([pdfPath]);

    if (storageError) {
      throw new Error(`Failed to delete PDF from storage: ${storageError.message}`);
    }

    // Delete metadata from database
    const { error: dbError } = await supabase
      .from('daily_report_pdfs')
      .delete()
      .eq('report_date', reportDate);

    if (dbError) {
      throw new Error(`Failed to delete PDF metadata: ${dbError.message}`);
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting stored PDF:', error);
    return false;
  }
};

/**
 * Convert PDF data back to table format (mock implementation)
 * Note: This is a simplified version. In a real implementation, you might need
 * a PDF parsing library or store the original data alongside the PDF.
 */
export const convertPDFToTableData = async (pdfMetadata: PDFMetadata): Promise<{
  reportData: DailyReportData[];
  creditsData: any[];
} | null> => {
  try {
    // Since we can't easily parse PDF back to structured data,
    // we'll retrieve the original data from the daily_reports_storage table
    const { data: reportData, error: reportError } = await supabase
      .from('daily_reports_storage')
      .select('*')
      .eq('report_date', pdfMetadata.report_date)
      .order('no', { ascending: true });

    if (reportError) {
      throw new Error(`Failed to fetch report data: ${reportError.message}`);
    }

    // Get credits data for the same date
    const startOfDay = `${pdfMetadata.report_date}T00:00:00.000Z`;
    const endOfDay = `${pdfMetadata.report_date}T23:59:59.999Z`;

    const { data: creditsData, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (creditsError) {
      throw new Error(`Failed to fetch credits data: ${creditsError.message}`);
    }

    // Convert to expected format
    const convertedReportData: DailyReportData[] = (reportData || []).map(item => ({
      no: item.no,
      libelle: item.libelle,
      stock: item.stock,
      entres: item.entres,
      totalJour: item.total_jour,
      solde: item.solde,
      sortie: item.sortie,
      pUnit1: item.p_unit1,
      pTotal: item.p_total,
      amavide: item.amavide,
      productId: item.product_id
    }));

    return {
      reportData: convertedReportData,
      creditsData: creditsData || []
    };

  } catch (error: any) {
    console.error('Error converting PDF to table data:', error);
    return null;
  }
};

// Helper function to calculate totals
const calculateTotals = (reportData: DailyReportData[]) => {
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
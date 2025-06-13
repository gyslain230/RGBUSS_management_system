import React, { useState, useEffect } from 'react';
import { History, Plus, Minus, Search, Calendar } from 'lucide-react';
import { supabase, StockAdjustment } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface StockAdjustmentHistoryProps {
  productId?: string;
}

export default function StockAdjustmentHistory({ productId }: StockAdjustmentHistoryProps) {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchAdjustments();
  }, [productId]);

  const fetchAdjustments = async () => {
    try {
      let query = supabase
        .from('stock_adjustments')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by product if specified
      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAdjustments(data || []);
    } catch (error) {
      console.error('Error fetching stock adjustments:', error);
      toast.error('Error loading adjustment history');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdjustments = adjustments.filter(adjustment => {
    const matchesSearch = adjustment.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         adjustment.adjusted_by_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         adjustment.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || 
                       adjustment.created_at.split('T')[0] === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {productId ? 'Product Adjustment History' : 'Stock Adjustment History'}
          </h3>
        </div>
        <span className="text-sm text-gray-600">
          {filteredAdjustments.length} adjustments
        </span>
      </div>

      {/* Filters */}
      {!productId && (
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product, user, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Adjustments List */}
      {filteredAdjustments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p>No stock adjustments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  {!productId && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adjusted By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{format(new Date(adjustment.created_at), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(adjustment.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </td>
                    {!productId && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {adjustment.product_name}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        adjustment.adjustment_type === 'increase'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {adjustment.adjustment_type === 'increase' ? (
                          <Plus className="h-3 w-3 mr-1" />
                        ) : (
                          <Minus className="h-3 w-3 mr-1" />
                        )}
                        {adjustment.adjustment_type === 'increase' ? 'Increase' : 'Decrease'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${
                        adjustment.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {adjustment.adjustment_type === 'increase' ? '+' : '-'}{adjustment.quantity_adjusted}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>{adjustment.previous_quantity}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{adjustment.new_quantity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {adjustment.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {adjustment.adjusted_by_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
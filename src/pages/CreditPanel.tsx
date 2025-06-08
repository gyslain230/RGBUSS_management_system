import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Filter, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase, Credit } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CreditPanel() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    fetchCredits();
  }, [user]);

  const fetchCredits = async () => {
    try {
      let query = supabase.from('credits').select('*');

      // Workers can only see credits they issued
      if (user?.role === 'worker') {
        query = query.eq('issued_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Update overdue status
      const today = new Date().toISOString().split('T')[0];
      const updatedCredits = (data || []).map(credit => ({
        ...credit,
        status: credit.status === 'pending' && credit.due_date < today ? 'overdue' : credit.status
      }));

      setCredits(updatedCredits);
    } catch (error) {
      console.error('Error fetching credits:', error);
      toast.error('Error loading credits');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (creditId: string) => {
    try {
      const { error } = await supabase
        .from('credits')
        .update({ status: 'paid' })
        .eq('id', creditId);

      if (error) throw error;

      toast.success('Credit marked as paid');
      fetchCredits();
    } catch (error) {
      console.error('Error updating credit status:', error);
      toast.error('Error updating credit status');
    }
  };

  const filteredCredits = credits.filter(credit => {
    const matchesSearch = credit.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credit.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || credit.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPending = credits.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const totalOverdue = credits.filter(c => c.status === 'overdue').reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = credits.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Panel</h1>
        <p className="text-gray-600">Monitor and manage credit sales</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Credits</p>
              <p className="text-2xl font-bold text-orange-600">${totalPending.toFixed(2)}</p>
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
              <p className="text-2xl font-bold text-red-600">${totalOverdue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Credits</p>
              <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid' | 'overdue')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Credits Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Credit Sales ({filteredCredits.length})
          </h2>
        </div>

        {filteredCredits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No credits found matching your criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCredits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {credit.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {credit.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${credit.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(credit.due_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        credit.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : credit.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {credit.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {credit.status === 'overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {credit.status.charAt(0).toUpperCase() + credit.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(credit.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {credit.status === 'pending' || credit.status === 'overdue' ? (
                        <button
                          onClick={() => handleMarkAsPaid(credit.id)}
                          className="text-green-600 hover:text-green-900 text-sm font-medium"
                        >
                          Mark as Paid
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

interface Sale {
  id: string;
  product_name: string;
  total_amount: number;
  customer_name: string;
  created_at: string;
}

interface RecentSalesTableProps {
  sales: Sale[];
}

export default function RecentSalesTable({ sales }: RecentSalesTableProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
        <ShoppingCart className="h-5 w-5 text-blue-500" />
      </div>
      
      {sales.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No recent sales found
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Product</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Customer</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-900">{sale.product_name}</td>
                  <td className="py-3 text-sm text-gray-600">{sale.customer_name || 'Walk-in'}</td>
                  <td className="py-3 text-sm font-medium text-gray-900">${sale.total_amount}</td>
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
  );
}
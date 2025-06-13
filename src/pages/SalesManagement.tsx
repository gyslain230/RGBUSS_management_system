import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function SalesManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600">Process sales and view transaction history</p>
        </div>
      </div>

      {/* Empty Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sales Management</h3>
          <p className="text-gray-600">Content will be added here</p>
        </div>
      </div>
    </div>
  );
}
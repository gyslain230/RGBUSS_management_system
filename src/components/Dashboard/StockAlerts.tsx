import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
  category: string;
}

interface StockAlertsProps {
  alerts: Product[];
}

export default function StockAlerts({ alerts }: StockAlertsProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Stock Alerts</h3>
        <AlertTriangle className="h-5 w-5 text-red-500" />
      </div>
      
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          All items are well stocked
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div>
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">{product.category}</p>
              </div>
              <div className="text-right">
                <span className="text-red-600 font-semibold">{product.quantity} left</span>
                <p className="text-xs text-red-500">Low stock</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
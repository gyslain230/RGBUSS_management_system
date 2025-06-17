import React, { useState } from 'react';
import { Package, AlertTriangle, Settings, History } from 'lucide-react';
import { Product } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import StockAdjustmentModal from './StockAdjustmentModal';
import StockAdjustmentHistory from './StockAdjustmentHistory';

interface ProductCardProps {
  product: Product;
  onStockUpdated: () => void;
  canManage: boolean;
}

export default function ProductCard({ product, onStockUpdated, canManage }: ProductCardProps) {
  const { user } = useAuth();
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const isLowStock = product.quantity < 5;

  // Check if user can adjust stock (workers and managers)
  const canAdjustStock = user?.role === 'worker' || user?.role === 'manager' || user?.role === 'admin';

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{product.category}</p>
            {product.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {isLowStock && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Price:</span>
            <span className="font-semibold text-gray-900">${product.price}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Quantity:</span>
            <div className="flex items-center space-x-2">
              <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                {product.quantity}
                {isLowStock && (
                  <span className="text-xs text-red-500 ml-1">(Low)</span>
                )}
              </span>
              {canAdjustStock && (
                <button
                  onClick={() => setShowAdjustmentModal(true)}
                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                  title="Adjust Stock"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Stock Management Actions */}
          <div className="flex space-x-2">
            {canAdjustStock && (
              <button
                onClick={() => setShowAdjustmentModal(true)}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Settings className="h-4 w-4 mr-1" />
                Adjust Stock
              </button>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              title="View adjustment history"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stock Adjustment History */}
        {showHistory && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <StockAdjustmentHistory productId={product.id} />
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <StockAdjustmentModal
          isOpen={showAdjustmentModal}
          onClose={() => setShowAdjustmentModal(false)}
          product={product}
          onSuccess={onStockUpdated}
        />
      )}
    </>
  );
}
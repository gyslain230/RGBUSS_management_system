import React from 'react';
import { Check, X, Package, AlertTriangle } from 'lucide-react';
import { Product } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ProductCardProps {
  product: Product;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  canManage: boolean;
}

export default function ProductCard({ product, onApprove, onReject, canManage }: ProductCardProps) {
  const { user } = useAuth();
  const isLowStock = product.quantity < 5;

  return (
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
          {product.status === 'pending' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Pending
            </span>
          )}
          {isLowStock && product.status === 'approved' && (
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
          <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
            {product.quantity}
            {isLowStock && product.status === 'approved' && (
              <span className="text-xs text-red-500 ml-1">(Low)</span>
            )}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            product.status === 'approved' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {product.status === 'approved' ? 'Approved' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Admin Actions */}
      {canManage && product.status === 'pending' && (
        <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onApprove(product.id)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </button>
          <button
            onClick={() => onReject(product.id)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
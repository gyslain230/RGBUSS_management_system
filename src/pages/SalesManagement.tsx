import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Save, Trash2, Package, AlertCircle } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SoldeEntry {
  id: string;
  product: Product;
  soldeQuantity: number;
}

export default function SalesManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [soldeEntries, setSoldeEntries] = useState<SoldeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [soldeQuantity, setSoldeQuantity] = useState<number>(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSoldeEntry = () => {
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    if (soldeQuantity < 0) {
      toast.error('Solde quantity cannot be negative');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) {
      toast.error('Selected product not found');
      return;
    }

    // Check if product already exists in entries
    const existingEntryIndex = soldeEntries.findIndex(entry => entry.product.id === selectedProductId);
    
    if (existingEntryIndex >= 0) {
      // Update existing entry
      const updatedEntries = [...soldeEntries];
      updatedEntries[existingEntryIndex].soldeQuantity = soldeQuantity;
      setSoldeEntries(updatedEntries);
      toast.success('Solde entry updated');
    } else {
      // Add new entry
      const newEntry: SoldeEntry = {
        id: Date.now().toString(),
        product: selectedProduct,
        soldeQuantity: soldeQuantity
      };
      setSoldeEntries([...soldeEntries, newEntry]);
      toast.success('Solde entry added');
    }

    // Reset form
    setSelectedProductId('');
    setSoldeQuantity(0);
  };

  const handleRemoveEntry = (entryId: string) => {
    setSoldeEntries(soldeEntries.filter(entry => entry.id !== entryId));
    toast.success('Entry removed');
  };

  const handleUpdateSolde = (entryId: string, newSolde: number) => {
    if (newSolde < 0) {
      toast.error('Solde quantity cannot be negative');
      return;
    }

    setSoldeEntries(soldeEntries.map(entry => 
      entry.id === entryId 
        ? { ...entry, soldeQuantity: newSolde }
        : entry
    ));
  };

  const handleSubmitAll = async () => {
    if (soldeEntries.length === 0) {
      toast.error('Please add at least one solde entry');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setSubmitting(true);
    try {
      // Process each solde entry
      for (const entry of soldeEntries) {
        const currentQuantity = entry.product.quantity;
        const newSoldeQuantity = entry.soldeQuantity;
        
        // Calculate the difference to determine adjustment type and quantity
        const difference = newSoldeQuantity - currentQuantity;
        
        if (difference !== 0) {
          const adjustmentType = difference > 0 ? 'increase' : 'decrease';
          const adjustmentQuantity = Math.abs(difference);

          // Update product quantity to match the solde
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              quantity: newSoldeQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.product.id);

          if (updateError) throw updateError;

          // Record the stock adjustment for daily reports
          const { error: adjustmentError } = await supabase
            .from('stock_adjustments')
            .insert([{
              product_id: entry.product.id,
              product_name: entry.product.name,
              adjustment_type: adjustmentType,
              quantity_adjusted: adjustmentQuantity,
              previous_quantity: currentQuantity,
              new_quantity: newSoldeQuantity,
              reason: 'Solde adjustment from Sales Management',
              adjusted_by: user.id,
              adjusted_by_name: user.full_name
            }]);

          if (adjustmentError) throw adjustmentError;
        }
      }

      toast.success(`Successfully updated solde for ${soldeEntries.length} products`);
      
      // Clear entries and refresh products
      setSoldeEntries([]);
      await fetchProducts();
      
    } catch (error) {
      console.error('Error submitting solde entries:', error);
      toast.error('Error updating solde entries');
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalEntries = () => soldeEntries.length;
  const getTotalSoldeValue = () => soldeEntries.reduce((sum, entry) => sum + (entry.soldeQuantity * entry.product.price), 0);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600">Manage product solde (stock balance) and update daily reports</p>
          <p className="text-sm text-blue-600 mt-1">
            📊 Solde changes will be reflected in Daily Reports
          </p>
        </div>
      </div>

      {/* Product Selection Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Package className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Add Solde Entry</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - Current: {product.quantity} - ${product.price}
                </option>
              ))}
            </select>
          </div>

          {/* Solde Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Solde Quantity
            </label>
            <input
              type="number"
              min="0"
              value={soldeQuantity}
              onChange={(e) => setSoldeQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter solde quantity"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current stock balance to set
            </p>
          </div>

          {/* Add Button */}
          <div className="flex items-end">
            <button
              onClick={handleAddSoldeEntry}
              disabled={!selectedProductId}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Current Product Info */}
        {selectedProductId && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            {(() => {
              const selectedProduct = products.find(p => p.id === selectedProductId);
              if (!selectedProduct) return null;
              
              const difference = soldeQuantity - selectedProduct.quantity;
              return (
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Selected: {selectedProduct.name}</p>
                  <div className="grid grid-cols-3 gap-4 text-blue-700">
                    <div>
                      <span className="text-blue-600">Current Stock:</span>
                      <span className="font-medium ml-1">{selectedProduct.quantity}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">New Solde:</span>
                      <span className="font-medium ml-1">{soldeQuantity}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Change:</span>
                      <span className={`font-medium ml-1 ${
                        difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {difference > 0 ? '+' : ''}{difference}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Solde Entries List */}
      {soldeEntries.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Solde Entries</h2>
                <p className="text-sm text-gray-600">
                  {getTotalEntries()} products • Total value: ${getTotalSoldeValue().toFixed(2)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-600">Changes pending submission</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Solde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {soldeEntries.map((entry) => {
                  const difference = entry.soldeQuantity - entry.product.quantity;
                  const value = entry.soldeQuantity * entry.product.price;
                  
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{entry.product.name}</div>
                          <div className="text-sm text-gray-500">{entry.product.category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.product.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={entry.soldeQuantity}
                          onChange={(e) => handleUpdateSolde(entry.id, Number(e.target.value))}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {difference > 0 ? '+' : ''}{difference}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${value.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleRemoveEntry(entry.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Remove entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit Section */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p>Ready to submit {soldeEntries.length} solde entries</p>
                <p className="text-xs text-blue-600">
                  ⚠️ This will update product quantities and create stock adjustment records for Daily Reports
                </p>
              </div>
              <button
                onClick={handleSubmitAll}
                disabled={submitting || soldeEntries.length === 0}
                className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {soldeEntries.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Solde Entries</h3>
            <p className="text-gray-600 mb-4">
              Select products and add their solde quantities to get started
            </p>
            <p className="text-sm text-blue-600">
              💡 Solde represents the current stock balance for each product
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
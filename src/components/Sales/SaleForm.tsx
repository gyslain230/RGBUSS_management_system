import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ShoppingCart, CreditCard } from 'lucide-react';
import { supabase, Product } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SaleFormProps {
  products: Product[];
  onSuccess: () => void;
}

interface SaleFormData {
  product_id: string;
  quantity: number;
  customer_name?: string;
  is_credit: boolean;
  due_date?: string;
}

export default function SaleForm({ products, onSuccess }: SaleFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<SaleFormData>();
  
  const watchIsCredit = watch('is_credit');
  const watchProductId = watch('product_id');
  const watchQuantity = watch('quantity') || 1;

  React.useEffect(() => {
    if (watchProductId) {
      const product = products.find(p => p.id === watchProductId);
      setSelectedProduct(product || null);
    }
  }, [watchProductId, products]);

  const onSubmit = async (data: SaleFormData) => {
    if (!user || !selectedProduct) return;

    if (data.quantity > selectedProduct.quantity) {
      toast.error('Insufficient stock available');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = selectedProduct.price * data.quantity;

      // Create sale record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          product_id: data.product_id,
          product_name: selectedProduct.name,
          quantity_sold: data.quantity,
          unit_price: selectedProduct.price,
          total_amount: totalAmount,
          sold_by: user.id,
          customer_name: data.customer_name || null,
          is_credit: data.is_credit
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Update product quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          quantity: selectedProduct.quantity - data.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.product_id);

      if (updateError) throw updateError;

      // If it's a credit sale, create credit record
      if (data.is_credit) {
        const { error: creditError } = await supabase
          .from('credits')
          .insert([{
            sale_id: saleData.id,
            customer_name: data.customer_name || 'Unknown',
            amount: totalAmount,
            product_name: selectedProduct.name,
            issued_by: user.id,
            due_date: data.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending'
          }]);

        if (creditError) throw creditError;
      }

      toast.success('Sale completed successfully!');
      reset();
      setSelectedProduct(null);
      onSuccess();
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Error processing sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <ShoppingCart className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Process New Sale</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Product
            </label>
            <select
              {...register('product_id', { required: 'Please select a product' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - ${product.price} (Stock: {product.quantity})
                </option>
              ))}
            </select>
            {errors.product_id && (
              <p className="text-red-500 text-sm mt-1">{errors.product_id.message}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max={selectedProduct?.quantity || 1}
              {...register('quantity', { 
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be at least 1' },
                max: { value: selectedProduct?.quantity || 1, message: 'Insufficient stock' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
            {errors.quantity && (
              <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>
            )}
            {selectedProduct && (
              <p className="text-sm text-gray-600 mt-1">
                Available stock: {selectedProduct.quantity}
              </p>
            )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name (Optional)
            </label>
            <input
              type="text"
              {...register('customer_name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter customer name"
            />
          </div>

          {/* Credit Sale Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              {...register('is_credit')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <CreditCard className="h-4 w-4 mr-1" />
              Sold on Credit?
            </label>
          </div>
        </div>

        {/* Due Date (only if credit sale) */}
        {watchIsCredit && (
          <div className="md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              {...register('due_date', { 
                required: watchIsCredit ? 'Due date is required for credit sales' : false 
              })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.due_date && (
              <p className="text-red-500 text-sm mt-1">{errors.due_date.message}</p>
            )}
          </div>
        )}

        {/* Sale Summary */}
        {selectedProduct && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Sale Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Product:</span>
                <span>{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Unit Price:</span>
                <span>${selectedProduct.price}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{watchQuantity}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total Amount:</span>
                <span>${(selectedProduct.price * watchQuantity).toFixed(2)}</span>
              </div>
              {watchIsCredit && (
                <div className="text-orange-600 text-xs">
                  * This will be recorded as a credit sale
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !selectedProduct}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </form>
    </div>
  );
}
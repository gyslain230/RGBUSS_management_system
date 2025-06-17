import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Check, X, Package, History, Settings, AlertTriangle, Eye } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import AddProductModal from '../components/Stock/AddProductModal';
import StockAdjustmentModal from '../components/Stock/StockAdjustmentModal';
import StockAdjustmentHistory from '../components/Stock/StockAdjustmentHistory';

export default function StockManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGlobalHistory, setShowGlobalHistory] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showProductHistory, setShowProductHistory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      let query = supabase.from('products').select('*');

      // Workers can only see approved products
      if (user?.role === 'worker') {
        query = query.eq('status', 'approved');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'approved' })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product approved successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('Error approving product');
    }
  };

  const handleRejectProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product rejected and removed');
      fetchProducts();
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error('Error rejecting product');
    }
  };

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product);
    setShowAdjustmentModal(true);
  };

  const handleShowHistory = (productId: string) => {
    setShowProductHistory(showProductHistory === productId ? null : productId);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(products.map(p => p.category)));

  // Check if user can adjust stock (workers, managers, and admins)
  const canAdjustStock = user?.role === 'worker' || user?.role === 'manager' || user?.role === 'admin';

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
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600">Manage your inventory and product listings</p>
          {(user?.role === 'worker' || user?.role === 'manager') && (
            <p className="text-sm text-blue-600 mt-1">
              ⚙️ You can adjust stock quantities for approved products
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Global History Button */}
          <button
            onClick={() => setShowGlobalHistory(!showGlobalHistory)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <History className="h-4 w-4 mr-2" />
            {showGlobalHistory ? 'Hide' : 'Show'} History
          </button>
          
          {/* Add Product Button */}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Global Stock Adjustment History */}
      {showGlobalHistory && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <StockAdjustmentHistory />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {user?.role === 'admin' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Products ({filteredProducts.length})</h2>
              <p className="text-sm text-gray-600">Manage your product inventory</p>
            </div>
            <Package className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first product'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isLowStock = product.quantity < 5;
                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${product.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${
                              isLowStock && product.status === 'approved' ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {product.quantity}
                            </span>
                            {isLowStock && product.status === 'approved' && (
                              <div className="flex items-center">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-xs text-red-500 ml-1">Low</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.status === 'approved' ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {/* Admin Actions for Pending Products */}
                            {user?.role === 'admin' && product.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveProduct(product.id)}
                                  className="text-green-600 hover:text-green-900 transition-colors"
                                  title="Approve product"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectProduct(product.id)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Reject product"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            {/* Stock Adjustment for Approved Products */}
                            {canAdjustStock && product.status === 'approved' && (
                              <button
                                onClick={() => handleAdjustStock(product)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Adjust stock"
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                            )}

                            {/* History Button */}
                            {product.status === 'approved' && (
                              <button
                                onClick={() => handleShowHistory(product.id)}
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                title="View adjustment history"
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Product History Row */}
                      {showProductHistory === product.id && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="max-w-full">
                              <StockAdjustmentHistory productId={product.id} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <StockAdjustmentModal
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSuccess={() => {
            setShowAdjustmentModal(false);
            setSelectedProduct(null);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { productApi } from '../../services/api';
import { 
  Package, Plus, AlertTriangle, Search, RefreshCw, X, PackagePlus 
} from 'lucide-react';

const VanInventory = ({ showNotification }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustBoxes, setAdjustBoxes] = useState('');
  const [adjustLoose, setAdjustLoose] = useState('');
  const [adjustOperation, setAdjustOperation] = useState('ADD');
  const [adjustReason, setAdjustReason] = useState('Van Stock Reload');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    dozensPerBox: 10,
    pricePerDozen: '',
    stockInDozens: 0,
    minStockAlert: 15,
    description: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productApi.getAll(),
        productApi.getCategories()
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load van inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalStockDozens = products.reduce((acc, p) => acc + (p.stockInDozens || 0), 0);
  const totalStockValue = products.reduce((acc, p) => acc + ((p.stockInDozens || 0) * parseFloat(p.pricePerDozen || 0)), 0);
  const lowStockCount = products.filter(p => p.stockInDozens <= p.minStockAlert).length;

  const handleStockAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setAdjustSubmitting(true);
    try {
      const payload = {
        productId: adjustingProduct.id,
        boxes: parseInt(adjustBoxes) || 0,
        looseDozens: parseInt(adjustLoose) || 0,
        operation: adjustOperation,
        reason: adjustReason,
      };

      await productApi.adjustStock(payload);
      showNotification(`Stock updated for ${adjustingProduct.name}`, 'success');
      setAdjustingProduct(null);
      setAdjustBoxes('');
      setAdjustLoose('');
      fetchInventory();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to update stock', 'error');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || !newProductForm.sku.trim() || !newProductForm.category.trim()) {
      showNotification('Please fill in product name, SKU, and category', 'warning');
      return;
    }
    if (!newProductForm.pricePerDozen || parseFloat(newProductForm.pricePerDozen) <= 0) {
      showNotification('Please enter a valid price per dozen', 'warning');
      return;
    }

    setAddLoading(true);
    try {
      const payload = {
        ...newProductForm,
        name: newProductForm.name.trim(),
        sku: newProductForm.sku.toUpperCase().trim(),
        category: newProductForm.category.trim(),
        dozensPerBox: parseInt(newProductForm.dozensPerBox) || 1,
        pricePerDozen: parseFloat(newProductForm.pricePerDozen),
        stockInDozens: parseInt(newProductForm.stockInDozens) || 0,
        minStockAlert: parseInt(newProductForm.minStockAlert) || 15,
        description: newProductForm.description.trim(),
      };

      await productApi.create(payload);
      showNotification(`Product "${newProductForm.name}" created and saved to database!`, 'success');
      setShowAddModal(false);
      setNewProductForm({
        name: '',
        sku: '',
        category: '',
        dozensPerBox: 10,
        pricePerDozen: '',
        stockInDozens: 0,
        minStockAlert: 15,
        description: '',
      });
      fetchInventory();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to create product', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Catalog Items</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{products.length} SKUs</span>
          </div>
          <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Stock in Van</span>
            <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">{totalStockDozens} Dozens</span>
            <span className="text-[11px] text-slate-500 font-medium">Worth ₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Low Stock Alerts</span>
            <span className={`text-2xl font-bold mt-1 block ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {lowStockCount} Items
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Needs warehouse reload</span>
          </div>
          <div className={`p-3 rounded-2xl ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search van products by SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add New SKU
            </button>
            <button
              onClick={fetchInventory}
              title="Refresh Inventory"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories ({categories.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <PackagePlus className="w-12 h-12 mx-auto text-slate-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900">No FMCG Products in Database</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Add your biscuits, cookies, rusks, chips, or confectionery items to build your product catalog and start managing van stock.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Your First Product / SKU
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">SKU / Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Packaging Unit</th>
                  <th className="py-3 px-4 text-right">Wholesale Rate</th>
                  <th className="py-3 px-4 text-center">Current Van Stock</th>
                  <th className="py-3 px-4 text-center">Stock Breakdown</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isLow = p.stockInDozens <= p.minStockAlert;
                  const fullBoxes = p.fullBoxesInStock !== undefined ? p.fullBoxesInStock : Math.floor(p.stockInDozens / p.dozensPerBox);
                  const looseDoz = p.remainingLooseDozens !== undefined ? p.remainingLooseDozens : (p.stockInDozens % p.dozensPerBox);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        1 Box = <strong className="text-slate-900">{p.dozensPerBox} Dozens</strong>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900">₹{parseFloat(p.pricePerDozen).toFixed(2)}/doz</div>
                        <div className="text-[10px] text-slate-500 font-mono">₹{parseFloat(p.boxPrice || (p.dozensPerBox * p.pricePerDozen)).toFixed(2)}/box</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold px-2.5 py-1 rounded-full text-xs ${
                          p.stockInDozens === 0
                            ? 'bg-red-100 text-red-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.stockInDozens} Dozens
                          {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        <span className="font-semibold text-brand-700">{fullBoxes} Boxes</span>
                        {looseDoz > 0 && <span className="text-slate-500 ml-1">+ {looseDoz} Doz</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustBoxes('');
                            setAdjustLoose('');
                            setAdjustOperation('ADD');
                            setAdjustReason('Van Stock Reload');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
                        >
                          Adjust / Load
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Adjust Van Stock</h3>
                <p className="text-xs text-brand-300 font-medium">{adjustingProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Current Stock in Van:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {adjustingProduct.stockInDozens} Dozens ({Math.floor(adjustingProduct.stockInDozens / adjustingProduct.dozensPerBox)} boxes + {adjustingProduct.stockInDozens % adjustingProduct.dozensPerBox} doz)
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Operation Type:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustOperation('ADD')}
                    className={`py-2 px-2 rounded-xl font-bold border text-center transition ${
                      adjustOperation === 'ADD'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    + Load / Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustOperation('SUBTRACT')}
                    className={`py-2 px-2 rounded-xl font-bold border text-center transition ${
                      adjustOperation === 'SUBTRACT'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    - Deduct/Damage
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustOperation('SET')}
                    className={`py-2 px-2 rounded-xl font-bold border text-center transition ${
                      adjustOperation === 'SET'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    = Set Exact
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">
                    Boxes ({adjustingProduct.dozensPerBox} doz/box):
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={adjustBoxes}
                    onChange={(e) => setAdjustBoxes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Loose Dozens:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={adjustLoose}
                    onChange={(e) => setAdjustLoose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">Reason / Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Van Reload from Warehouse, Stock Audit"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Saving...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Add New FMCG Product</h3>
                <p className="text-xs text-slate-400">Save product SKU & dual packaging to database</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parle-G Gold (100g) or Good Day Butter"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PARLE-G-100"
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    list="categories-datalist"
                    placeholder="e.g. Biscuits, Cookies, Snacks"
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <datalist id="categories-datalist">
                    {categories.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                    <option value="Glucose Biscuits" />
                    <option value="Butter Cookies" />
                    <option value="Cream Biscuits" />
                    <option value="Tea Biscuits" />
                    <option value="Crackers & Salted" />
                    <option value="Snacks & Namkeen" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dozens Per Box (B) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="10"
                    value={newProductForm.dozensPerBox}
                    onChange={(e) => setNewProductForm({ ...newProductForm, dozensPerBox: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-slate-500">1 box packaging count in dozens</span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wholesale Price Per Dozen (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="180.00"
                    value={newProductForm.pricePerDozen}
                    onChange={(e) => setNewProductForm({ ...newProductForm, pricePerDozen: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Box price: ₹{((parseInt(newProductForm.dozensPerBox) || 0) * (parseFloat(newProductForm.pricePerDozen) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Van Stock (Dozens)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="50"
                    value={newProductForm.stockInDozens}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stockInDozens: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Stock Alert (Dozens)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="15"
                    value={newProductForm.minStockAlert}
                    onChange={(e) => setNewProductForm({ ...newProductForm, minStockAlert: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Packaging details, flavor, or SKU specifications..."
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {addLoading ? 'Saving Product...' : 'Save Product to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VanInventory;

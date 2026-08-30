import React, { useState, useEffect } from 'react';
import { productApi } from '../../services/api';
import { 
  Plus, Search, Edit2, Trash2, Package, Tag, IndianRupee, 
  Percent, Layers, Info, X, Check, ArrowRight, Warehouse, Truck, Calculator
} from 'lucide-react';

const CATEGORY_PRESETS = ['Biscuits', 'Lays', 'Chocolates', 'Soaps', 'Others'];

const ItemCatalog = ({ showNotification, onNavigateToGodown, onNavigateToVan }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Biscuits',
    customCategory: '',
    dozensPerBox: '', // Optional: empty or 1 for direct boxes
    boxQuantity: 1,
    purchasePricePerBox: '',
    pricePerDozen: '',
    wholesaleBoxOfferPrice: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load items catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Biscuits',
      customCategory: '',
      dozensPerBox: '',
      boxQuantity: 1,
      purchasePricePerBox: '',
      pricePerDozen: '',
      wholesaleBoxOfferPrice: '',
      description: '',
    });
    setShowItemModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    const isPreset = CATEGORY_PRESETS.includes(product.category);
    setFormData({
      name: product.name,
      category: isPreset ? product.category : 'Others',
      customCategory: isPreset ? '' : product.category,
      dozensPerBox: product.dozensPerBox > 1 ? product.dozensPerBox : '',
      boxQuantity: product.godownFullBoxes || 0,
      purchasePricePerBox: product.purchasePricePerBox || '',
      pricePerDozen: product.pricePerDozen || '',
      wholesaleBoxOfferPrice: product.wholesaleBoxOfferPrice || product.boxPrice || '',
      description: product.description || '',
    });
    setShowItemModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('Please enter the product name', 'warning');
      return;
    }
    const finalCategory = formData.category === 'Others' && formData.customCategory.trim()
      ? formData.customCategory.trim()
      : formData.category;

    // Dozens per box: if empty or <= 1, default to 1 (direct item/box)
    const dozensPerBox = parseInt(formData.dozensPerBox) > 1 ? parseInt(formData.dozensPerBox) : 1;
    const boxQuantity = parseInt(formData.boxQuantity) || 0;

    let wholesaleBoxOffer = parseFloat(formData.wholesaleBoxOfferPrice) || 0;
    let pricePerDozen = parseFloat(formData.pricePerDozen) || 0;

    if (wholesaleBoxOffer <= 0 && pricePerDozen <= 0) {
      showNotification('Please enter either Wholesale Box Price or Wholesale Price per Dozen', 'warning');
      return;
    }

    if (wholesaleBoxOffer <= 0 && pricePerDozen > 0) {
      wholesaleBoxOffer = pricePerDozen * dozensPerBox;
    }
    if (pricePerDozen <= 0 && wholesaleBoxOffer > 0) {
      pricePerDozen = wholesaleBoxOffer / dozensPerBox;
    }

    const purchasePriceBox = parseFloat(formData.purchasePricePerBox) || 0;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: finalCategory,
        dozensPerBox: dozensPerBox,
        godownStockBoxes: boxQuantity,
        godownStockLooseDozens: 0,
        purchasePricePerBox: purchasePriceBox,
        pricePerDozen: pricePerDozen,
        wholesaleBoxOfferPrice: wholesaleBoxOffer,
        vanStockBoxes: 0,
        vanStockLooseDozens: 0,
        description: formData.description.trim() || undefined,
      };

      if (editingProduct) {
        await productApi.update(editingProduct.id, payload);
        showNotification(`Item "${formData.name}" updated successfully!`, 'success');
      } else {
        await productApi.create(payload);
        showNotification(`New item "${formData.name}" added with ${boxQuantity} boxes in Godown stock!`, 'success');
      }

      setShowItemModal(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from your catalog?`)) return;
    try {
      await productApi.delete(id);
      showNotification(`Item "${name}" deleted`, 'success');
      fetchProducts();
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete item', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const parsedBoxQty = parseInt(formData.boxQuantity) || 0;
  const parsedDozensPerBox = parseInt(formData.dozensPerBox) > 1 ? parseInt(formData.dozensPerBox) : 1;
  const totalUnitsAdding = parsedBoxQty * parsedDozensPerBox;
  const isDirectBoxMode = !formData.dozensPerBox || parseInt(formData.dozensPerBox) <= 1;

  const costPerBox = parseFloat(formData.purchasePricePerBox) || 0;
  const boxOfferSellingPrice = parseFloat(formData.wholesaleBoxOfferPrice) || (parseFloat(formData.pricePerDozen || 0) * parsedDozensPerBox);
  const profitPerBox = (boxOfferSellingPrice > 0 && costPerBox > 0) ? (boxOfferSellingPrice - costPerBox) : 0;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Product Items Catalog</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage all FMCG products: Biscuits, Lays, Chocolates, Soaps, and whole box packages.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> + Add New Item
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by product name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories ({products.length})
            </button>
            {CATEGORY_PRESETS.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading items catalog...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-12 h-12 mx-auto text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">No Items Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add products like Parle-G, Good Day, Lay's, Dairy Milk, and Lifebuoy to start managing stocks and billing.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              + Add First Product Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Packaging / Unit</th>
                  <th className="py-3 px-4 text-center">Godown Stock</th>
                  <th className="py-3 px-4 text-right">Agency Cost (Box)</th>
                  <th className="py-3 px-4 text-right">Wholesale Box Price</th>
                  <th className="py-3 px-4 text-right">Wholesale Dozen</th>
                  <th className="py-3 px-4 text-center">Van Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isSingleBox = (!p.dozensPerBox || p.dozensPerBox === 1);
                  const costPerBox = parseFloat(p.purchasePricePerBox || 0);
                  const offerBox = parseFloat(p.wholesaleBoxOfferPrice || p.boxPrice || 0);
                  const profitPerBox = offerBox > 0 && costPerBox > 0 ? (offerBox - costPerBox) : null;
                  const marginPct = profitPerBox !== null && costPerBox > 0 ? ((profitPerBox / costPerBox) * 100).toFixed(1) : null;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                        {p.description && (
                          <span className="block text-[11px] font-normal text-slate-400">{p.description}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-800">
                        {isSingleBox ? (
                          <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            Direct Box (No Dozens)
                          </span>
                        ) : (
                          <span className="font-bold">{p.dozensPerBox} doz/box</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-100 text-slate-900 font-bold px-2.5 py-1 rounded-lg text-xs font-mono">
                          {isSingleBox ? (
                            `${p.godownFullBoxes} Boxes`
                          ) : (
                            `${p.godownFullBoxes}b + ${p.godownRemainingLooseDozens}d`
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {costPerBox > 0 ? `₹${costPerBox.toFixed(2)}` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-brand-700">
                        ₹{offerBox.toFixed(2)}
                        {marginPct && (
                          <span className="block text-[10px] text-emerald-600 font-normal">
                            +{marginPct}% (₹{profitPerBox.toFixed(0)})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {isSingleBox ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          `₹${parseFloat(p.pricePerDozen).toFixed(2)}`
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-brand-50 text-brand-800 font-bold px-2 py-1 rounded-lg text-xs font-mono">
                          {isSingleBox ? (
                            `${p.vanFullBoxes} Boxes`
                          ) : (
                            `${p.vanFullBoxes}b + ${p.vanRemainingLooseDozens}d`
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    {editingProduct ? `Edit Item: ${editingProduct.name}` : 'Add New Product Item'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure packaging, box quantities, agency cost & wholesale rates</p>
                </div>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* 1. Product Name */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">1. Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parle-G 100g, Dairy Milk Box, Lay's Classic, Lifebuoy"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-900 text-sm"
                />
              </div>

              {/* 2. Category */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">2. Category *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CATEGORY_PRESETS.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition ${
                        formData.category === cat
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {formData.category === 'Others' && (
                  <input
                    type="text"
                    required
                    placeholder="Type custom category name (e.g. Detergent, Spices)..."
                    value={formData.customCategory}
                    onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 mt-1"
                  />
                )}
              </div>

              {/* 3. Dozens Per Box (OPTIONAL) & 4. Box Quantity Adding */}
              <div className="grid grid-cols-2 gap-3 bg-brand-50/40 p-3.5 rounded-xl border border-brand-100">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    3. Dozens Per Box <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank for direct box"
                    value={formData.dozensPerBox}
                    onChange={(e) => setFormData({ ...formData, dozensPerBox: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {isDirectBoxMode ? 'Direct box / no dozens' : `${parsedDozensPerBox} dozens per box`}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-brand-900 block mb-1">4. Box Quantity (Adding) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 5, 10, 20"
                    value={formData.boxQuantity}
                    onChange={(e) => setFormData({ ...formData, boxQuantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl font-mono font-bold text-sm text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-brand-700 font-medium mt-0.5 block">
                    = {parsedBoxQty} Boxes ({totalUnitsAdding} units) into Godown
                  </span>
                </div>
              </div>

              {/* 5. Pricing: Agency Cost, Wholesale Box Offer, Wholesale Dozen */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-800">
                  5. Wholesale Pricing & Agency Cost:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Agency Cost (Box) ₹</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Cost paid..."
                      value={formData.purchasePricePerBox}
                      onChange={(e) => setFormData({ ...formData, purchasePricePerBox: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">To track profit</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Wholesale Selling (Box) * ₹</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Box selling price..."
                      value={formData.wholesaleBoxOfferPrice}
                      onChange={(e) => setFormData({ ...formData, wholesaleBoxOfferPrice: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl font-mono font-bold text-brand-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Selling price of whole box</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Wholesale (Dozen) ₹ <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isDirectBoxMode}
                      placeholder={isDirectBoxMode ? 'N/A for direct box' : 'Loose dozen rate...'}
                      value={formData.pricePerDozen}
                      onChange={(e) => setFormData({ ...formData, pricePerDozen: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">For loose dozens sales</span>
                  </div>
                </div>

                {/* Live Margin Calculation */}
                {costPerBox > 0 && boxOfferSellingPrice > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Expected Profit per Box:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      +₹{profitPerBox.toFixed(2)} ({((profitPerBox / costPerBox) * 100).toFixed(1)}% margin)
                    </span>
                  </div>
                )}
              </div>

              {/* 6. Optional Description */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">6. Description / Notes (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. 24 packets x 100g each, Chocolate flavor"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Item' : `Add Item & ${parsedBoxQty} Boxes to Godown`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemCatalog;

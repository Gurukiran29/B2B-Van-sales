import React, { useState, useEffect } from 'react';
import { productApi, shopApi, billingApi } from '../../services/api';
import { 
  ShoppingCart, Search, Plus, Minus, Store, MapPin, IndianRupee, Trash2, 
  Layers, PackagePlus, AlertCircle, Navigation, CheckCircle2
} from 'lucide-react';
import ReceiptModal from '../common/ReceiptModal';
import AddShopModal from './AddShopModal';

const QuickPOS = ({ onInvoiceCreated, showNotification, externalRoute, onRouteSelect }) => {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Primary Filter: Delivery Route (From DB)
  const [selectedRoute, setSelectedRoute] = useState(externalRoute || 'ALL');
  // Secondary Cascaded Filter: Village (From DB scoped to Route)
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  // Selected Shop
  const [selectedShopId, setSelectedShopId] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [shopSearch, setShopSearch] = useState('');

  const [cart, setCart] = useState({});
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentPreset, setPaymentPreset] = useState('FULL');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showAddShopModal, setShowAddShopModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (externalRoute !== undefined && externalRoute !== selectedRoute) {
      setSelectedRoute(externalRoute);
      setSelectedVillage('ALL');
    }
  }, [externalRoute]);

  const loadInitialData = async () => {
    try {
      const [shopsRes, productsRes, catRes] = await Promise.all([
        shopApi.getAll(),
        productApi.getAll(),
        productApi.getCategories()
      ]);
      const loadedShops = shopsRes.data || [];
      const loadedProducts = productsRes.data || [];
      setShops(loadedShops);
      setProducts(loadedProducts);
      setCategories(catRes.data || []);

      if (loadedShops.length > 0 && !selectedShopId) {
        setSelectedShopId(loadedShops[0].id.toString());
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to load products or shops', 'error');
    }
  };

  // Distinct routes present in user's shops from database
  const distinctRoutes = Array.from(new Set(shops.map(s => s.route).filter(Boolean))).sort();

  // Handle Route change: resets village filter
  const handleRouteChange = (newRoute) => {
    setSelectedRoute(newRoute);
    setSelectedVillage('ALL');
    if (onRouteSelect) onRouteSelect(newRoute);
  };

  // Cascading Available Villages based on selectedRoute
  const availableVillages = Array.from(new Set(
    shops
      .filter(s => selectedRoute === 'ALL' || s.route === selectedRoute)
      .map(s => s.village)
      .filter(Boolean)
  )).sort();

  // Cascaded filtered shops list based on Route and Village
  const filteredShops = shops.filter(s => {
    const matchesRoute = selectedRoute === 'ALL' || s.route === selectedRoute;
    const matchesVillage = selectedVillage === 'ALL' || s.village === selectedVillage;
    const matchesSearch = shopSearch === '' || 
      s.shopName.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.phoneNumber.includes(shopSearch);
    return matchesRoute && matchesVillage && matchesSearch;
  });

  // Keep selectedShopId valid if filteredShops changes
  useEffect(() => {
    if (filteredShops.length > 0) {
      const exists = filteredShops.some(s => s.id.toString() === selectedShopId);
      if (!exists) {
        setSelectedShopId(filteredShops[0].id.toString());
      }
    }
  }, [selectedRoute, selectedVillage, shops]);

  const selectedShop = shops.find(s => s.id.toString() === selectedShopId);

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const updateQuantity = (productId, type, delta) => {
    setCart(prev => {
      const current = prev[productId] || { boxes: 0, looseDozens: 0 };
      const nextVal = Math.max(0, (current[type] || 0) + delta);
      
      const updated = { ...current, [type]: nextVal };
      if (updated.boxes === 0 && updated.looseDozens === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: updated };
    });
  };

  const setExactQuantity = (productId, type, value) => {
    const parsed = Math.max(0, parseInt(value) || 0);
    setCart(prev => {
      const current = prev[productId] || { boxes: 0, looseDozens: 0 };
      const updated = { ...current, [type]: parsed };
      if (updated.boxes === 0 && updated.looseDozens === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: updated };
    });
  };

  const clearCart = () => {
    setCart({});
    setAmountPaidInput('');
    setPaymentPreset('FULL');
    setNotes('');
  };

  const cartItems = Object.entries(cart).map(([productIdStr, qty]) => {
    const product = products.find(p => p.id.toString() === productIdStr);
    if (!product) return null;

    const boxes = qty.boxes || 0;
    const looseDozens = qty.looseDozens || 0;
    const totalDozens = (boxes * product.dozensPerBox) + looseDozens;
    const subtotal = totalDozens * parseFloat(product.pricePerDozen);

    return {
      product,
      boxes,
      looseDozens,
      totalDozens,
      subtotal,
    };
  }).filter(Boolean);

  const totalBillAmount = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const totalDozensCount = cartItems.reduce((acc, item) => acc + item.totalDozens, 0);

  let computedAmountPaid = 0;
  if (paymentPreset === 'FULL') {
    computedAmountPaid = totalBillAmount;
  } else if (paymentPreset === 'ZERO') {
    computedAmountPaid = 0;
  } else {
    computedAmountPaid = Math.min(totalBillAmount, Math.max(0, parseFloat(amountPaidInput) || 0));
  }

  const computedBalanceDue = Math.max(0, totalBillAmount - computedAmountPaid);

  const handleCheckout = async () => {
    if (!selectedShopId) {
      showNotification('Please select a village retail shop', 'warning');
      return;
    }
    if (cartItems.length === 0) {
      showNotification('Cart is empty. Please select products to bill.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shopId: parseInt(selectedShopId),
        items: cartItems.map(item => ({
          productId: item.product.id,
          boxesCount: item.boxes,
          looseDozens: item.looseDozens,
        })),
        amountPaid: computedAmountPaid,
        paymentMode: paymentMode,
        notes: notes.trim() || undefined,
      };

      const res = await billingApi.createInvoice(payload);
      setLastInvoice(res.data);
      showNotification('Invoice created and saved to database!', 'success');
      clearCart();
      loadInitialData();
      if (onInvoiceCreated) onInvoiceCreated();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* PRIMARY FILTER: DELIVERY ROUTE -> CASCADING VILLAGE -> DISPLAY SHOPS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Step 1: Filter 1 - Delivery Route (Dynamic from DB) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-brand-600" />
              1. Delivery Route Filter:
            </label>
            <span className="text-[11px] text-slate-500">
              Active: <strong className="text-brand-700">{selectedRoute === 'ALL' ? 'All Routes' : selectedRoute}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => handleRouteChange('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                selectedRoute === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Delivery Routes ({distinctRoutes.length})
            </button>
            {distinctRoutes.map((routeName) => {
              const isSelected = selectedRoute === routeName;
              return (
                <button
                  key={routeName}
                  onClick={() => handleRouteChange(routeName)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {routeName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Cascading Village Filter (Scoped to Route) & Shop Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 items-center">
          {/* Step 2: Cascading Village Selector */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              2. Village Filter in Route ({availableVillages.length}):
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Villages ({availableVillages.length})</option>
              {availableVillages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Step 3: Display Shops for Route & Village */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-brand-600" />
              3. Village Shop ({filteredShops.length} stores):
            </label>
            <div className="relative">
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                disabled={filteredShops.length === 0}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              >
                {filteredShops.length === 0 ? (
                  <option value="">No shops found for selected route & village</option>
                ) : (
                  filteredShops.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.shopName} • {s.village} ({s.ownerName}) - Due: ₹{parseFloat(s.outstandingBalance || 0).toFixed(0)}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Action button: Add Shop */}
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => setShowAddShopModal(true)}
              className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> + New Shop
            </button>
          </div>
        </div>

        {/* Selected Shop Details Badge */}
        {selectedShop && (
          <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-slate-900">{selectedShop.shopName}</span>
                <span className="text-[11px] text-slate-500 ml-1.5">
                  ({selectedShop.village} • Route: {selectedShop.route}) • Owner: {selectedShop.ownerName} ({selectedShop.phoneNumber})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-600 font-medium">Khata Credit Due:</span>
              <span className={`font-mono font-bold ${parseFloat(selectedShop.outstandingBalance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₹{parseFloat(selectedShop.outstandingBalance || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* POS MAIN AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Catalog */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by SKU or brand name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                      selectedCategory === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Items
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
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
              <PackagePlus className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="text-sm font-bold text-slate-800">Your FMCG Catalog is Empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add your biscuits, cookies, and snacks in the "Van Stock & Inventory" tab to start billing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(p => {
                const currentCartItem = cart[p.id] || { boxes: 0, looseDozens: 0 };
                const boxCount = currentCartItem.boxes || 0;
                const looseCount = currentCartItem.looseDozens || 0;
                const totalDoz = (boxCount * p.dozensPerBox) + looseCount;
                const itemTotal = totalDoz * parseFloat(p.pricePerDozen);
                const isSelected = totalDoz > 0;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">
                            {p.sku}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {p.name}
                          </h4>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                          {p.category}
                        </span>
                      </div>

                      <div className="mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Box Rate ({p.dozensPerBox} doz):</span>
                          <span className="font-bold text-slate-900 font-mono">
                            ₹{parseFloat(p.boxPrice).toFixed(0)} <span className="text-[10px] text-slate-500">/box</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Van Stock:</span>
                          <span className={`font-mono font-bold ${p.stockInDozens <= p.minStockAlert ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {p.stockInDozens} Doz
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Boxes ({p.dozensPerBox} doz/box):</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            disabled={boxCount === 0}
                            onClick={() => updateQuantity(p.id, 'boxes', -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={boxCount || ''}
                            placeholder="0"
                            onChange={(e) => setExactQuantity(p.id, 'boxes', e.target.value)}
                            className="w-10 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded py-0.5"
                          />
                          <button
                            onClick={() => updateQuantity(p.id, 'boxes', 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Loose Dozens:</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            disabled={looseCount === 0}
                            onClick={() => updateQuantity(p.id, 'looseDozens', -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={looseCount || ''}
                            placeholder="0"
                            onChange={(e) => setExactQuantity(p.id, 'looseDozens', e.target.value)}
                            className="w-10 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded py-0.5"
                          />
                          <button
                            onClick={() => updateQuantity(p.id, 'looseDozens', 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="bg-brand-500/10 rounded-lg px-2.5 py-1 flex items-center justify-between text-xs font-bold text-brand-900 mt-2">
                          <span>{totalDoz} Doz Total</span>
                          <span className="font-mono">₹{itemTotal.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Checkout Summary */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="text-sm font-bold">On-the-Spot Invoice</h3>
                  <p className="text-[11px] text-slate-400">{cartItems.length} items selected</p>
                </div>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            <div className="p-4 max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto opacity-40" />
                  <p>Cart is empty</p>
                  <p className="text-[11px] text-slate-400">Select box counts and loose dozens from catalog</p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-slate-800 truncate">{item.product.name}</h5>
                      <p className="text-[11px] text-slate-500">
                        {item.boxes} Box + {item.looseDozens} Doz = {item.totalDozens} doz
                      </p>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      ₹{item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Van Stock Units:</span>
                    <span className="font-semibold text-slate-800 font-mono">{totalDozensCount} Dozens</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1.5">
                    <span>Total Bill Amount:</span>
                    <span className="font-mono text-base text-brand-600">₹{totalBillAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Payment Settlement:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentPreset('FULL')}
                      className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border text-center transition ${
                        paymentPreset === 'FULL'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Full Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPreset('PARTIAL')}
                      className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border text-center transition ${
                        paymentPreset === 'PARTIAL'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Partial
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPreset('ZERO')}
                      className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border text-center transition ${
                        paymentPreset === 'ZERO'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      100% Credit
                    </button>
                  </div>

                  {paymentPreset === 'PARTIAL' && (
                    <div className="relative pt-1">
                      <span className="absolute left-3 top-3 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount collected now..."
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border text-center ${
                        paymentMode === 'CASH'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('UPI')}
                      className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border text-center ${
                        paymentMode === 'UPI'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      UPI / PhonePe
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-bold">
                  <div className="flex justify-between text-emerald-700 text-xs">
                    <span>Cash Collected Now:</span>
                    <span className="font-mono">₹{computedAmountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 text-xs">
                    <span>Balance Added to Khata:</span>
                    <span className="font-mono">₹{computedBalanceDue.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  disabled={submitting}
                  onClick={handleCheckout}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
                >
                  {submitting ? 'Generating Bill...' : `Confirm & Issue Bill (₹${totalBillAmount.toFixed(0)})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddShopModal
        isOpen={showAddShopModal}
        defaultRoute={selectedRoute !== 'ALL' ? selectedRoute : ''}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={(newShop) => {
          loadInitialData();
          if (newShop) {
            setSelectedShopId(newShop.id.toString());
          }
        }}
        showNotification={showNotification}
      />

      {lastInvoice && (
        <ReceiptModal
          invoice={lastInvoice}
          onClose={() => setLastInvoice(null)}
        />
      )}
    </div>
  );
};

export default QuickPOS;

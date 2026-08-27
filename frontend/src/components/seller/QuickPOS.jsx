import React, { useState, useEffect } from 'react';
import { productApi, shopApi, billingApi } from '../../services/api';
import { 
  ShoppingCart, Search, Plus, Minus, Store, MapPin, IndianRupee, Trash2, Layers, PackagePlus, AlertCircle
} from 'lucide-react';
import ReceiptModal from '../common/ReceiptModal';
import AddShopModal from './AddShopModal';

const QuickPOS = ({ onInvoiceCreated, showNotification }) => {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [villages, setVillages] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedVillage, setSelectedVillage] = useState('ALL');
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

  const loadInitialData = async () => {
    try {
      const [shopsRes, productsRes, villagesRes, catRes] = await Promise.all([
        shopApi.getAll(),
        productApi.getAll(),
        shopApi.getVillages(),
        productApi.getCategories()
      ]);
      const loadedShops = shopsRes.data || [];
      const loadedProducts = productsRes.data || [];
      setShops(loadedShops);
      setProducts(loadedProducts);
      setVillages(villagesRes.data || []);
      setCategories(catRes.data || []);

      if (loadedShops.length > 0 && !selectedShopId) {
        setSelectedShopId(loadedShops[0].id.toString());
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to load products or shops', 'error');
    }
  };

  const selectedShop = shops.find(s => s.id.toString() === selectedShopId);

  const filteredShops = shops.filter(s => {
    const matchesVillage = selectedVillage === 'ALL' || s.village === selectedVillage;
    const matchesSearch = shopSearch === '' || 
      s.shopName.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(shopSearch.toLowerCase());
    return matchesVillage && matchesSearch;
  });

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

  const balanceDue = Math.max(0, totalBillAmount - computedAmountPaid);
  const currentShopBalance = selectedShop ? parseFloat(selectedShop.outstandingBalance) : 0;
  const projectedShopBalance = currentShopBalance + balanceDue;

  const handleSubmitBill = async () => {
    if (!selectedShopId) {
      showNotification('Please select a retail shop first', 'warning');
      return;
    }
    if (cartItems.length === 0) {
      showNotification('Please add at least one product to the bill', 'warning');
      return;
    }

    for (const item of cartItems) {
      if (item.totalDozens > item.product.stockInDozens) {
        showNotification(
          `Cannot bill ${item.totalDozens} dozens of ${item.product.name}. Van has only ${item.product.stockInDozens} dozens available.`,
          'error'
        );
        return;
      }
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
        notes: notes,
      };

      const res = await billingApi.createInvoice(payload);
      const invoiceData = res.data;
      
      setLastInvoice(invoiceData);
      showNotification(`Invoice ${invoiceData.invoiceNumber} created and saved to database!`, 'success');
      
      clearCart();
      loadInitialData();
      if (onInvoiceCreated) onInvoiceCreated(invoiceData);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to create invoice';
      showNotification(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Select Retail Shop for Billing</h2>
              <p className="text-xs text-slate-500">Pick destination store to bill and update Khata ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddShopModal(true)}
              className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl border border-brand-200 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Shop
            </button>
            {villages.length > 0 && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ALL">All Villages ({villages.length})</option>
                  {villages.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {shops.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/70 rounded-xl border border-dashed border-slate-300 mt-4 p-6 space-y-3">
            <Store className="w-10 h-10 mx-auto text-slate-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Village Retail Shops Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Add your village retail stores along your van route to begin on-the-spot dual unit billing and track digital Khata credit.
              </p>
            </div>
            <button
              onClick={() => setShowAddShopModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Your First Village Shop
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search shop by name or owner..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                {filteredShops.map(shop => {
                  const isSelected = selectedShopId === shop.id.toString();
                  const bal = parseFloat(shop.outstandingBalance || 0);
                  return (
                    <button
                      key={shop.id}
                      onClick={() => setSelectedShopId(shop.id.toString())}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-brand-50/80 border-brand-500 ring-2 ring-brand-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 truncate">{shop.shopName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" /> {shop.village}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">{shop.ownerName}</span>
                        <span className={`text-[11px] font-mono font-bold ${
                          bal > 3000 ? 'text-red-600' : bal > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          ₹{bal.toFixed(0)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedShop && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-300">Active Shop</span>
                      <h3 className="font-bold text-sm text-white">{selectedShop.shopName}</h3>
                      <p className="text-xs text-slate-300">Owner: {selectedShop.ownerName}</p>
                    </div>
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                      {selectedShop.village}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 truncate">
                    {selectedShop.address || 'Standard Delivery Location'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Current Khata Credit:</span>
                  <span className={`text-base font-mono font-bold ${
                    currentShopBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    ₹{currentShopBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search FMCG biscuits, cookies, snacks..."
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
                        ? 'bg-brand-600 text-white shadow-sm'
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
                          ? 'bg-brand-600 text-white shadow-sm'
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
              <PackagePlus className="w-12 h-12 mx-auto text-slate-400" />
              <h3 className="text-sm font-bold text-slate-800">Van Inventory is Empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No products found in the database. Add your biscuits, cookies, or FMCG SKUs under the Van Stock tab to start billing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(product => {
                const currentCartItem = cart[product.id] || { boxes: 0, looseDozens: 0 };
                const boxCount = currentCartItem.boxes || 0;
                const looseCount = currentCartItem.looseDozens || 0;
                const totalDoz = (boxCount * product.dozensPerBox) + looseCount;
                const itemTotal = totalDoz * parseFloat(product.pricePerDozen);
                const isSelected = totalDoz > 0;
                const isLowStock = product.stockInDozens <= product.minStockAlert;
                const isOutOfStock = product.stockInDozens <= 0;

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20'
                        : isOutOfStock
                        ? 'border-slate-200 opacity-60 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">
                            {product.sku}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {product.name}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-700'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Van: {product.stockInDozens} doz
                        </span>
                      </div>

                      <div className="mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Box Rate ({product.dozensPerBox} doz/box):</span>
                          <span className="font-bold text-slate-900 font-mono">
                            ₹{parseFloat(product.boxPrice || (product.dozensPerBox * product.pricePerDozen)).toFixed(0)} <span className="text-[10px] text-slate-500">/box</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Loose Rate:</span>
                          <span className="font-bold text-brand-600 font-mono">
                            ₹{parseFloat(product.pricePerDozen).toFixed(0)} <span className="text-[10px] text-slate-500">/doz</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Full Boxes (B):</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            disabled={isOutOfStock || boxCount === 0}
                            onClick={() => updateQuantity(product.id, 'boxes', -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={boxCount}
                            onChange={(e) => setExactQuantity(product.id, 'boxes', e.target.value)}
                            className="w-12 text-center text-xs font-bold py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          <button
                            disabled={isOutOfStock}
                            onClick={() => updateQuantity(product.id, 'boxes', 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Loose Dozens (D):</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            disabled={isOutOfStock || looseCount === 0}
                            onClick={() => updateQuantity(product.id, 'looseDozens', -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={looseCount}
                            onChange={(e) => setExactQuantity(product.id, 'looseDozens', e.target.value)}
                            className="w-12 text-center text-xs font-bold py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          <button
                            disabled={isOutOfStock}
                            onClick={() => updateQuantity(product.id, 'looseDozens', 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="bg-brand-500/10 rounded-lg px-2.5 py-1 flex items-center justify-between text-xs font-bold text-brand-900 mt-2">
                          <span>{totalDoz} Doz Total ({boxCount}B + {looseCount}D)</span>
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

        <div className="lg:col-span-5 xl:col-span-4 sticky top-20 space-y-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="text-sm font-bold">Van Sales Bill Summary</h3>
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
                  <Layers className="w-8 h-8 mx-auto opacity-40" />
                  <p>Cart is empty</p>
                  <p className="text-[11px] text-slate-400">Add boxes or loose dozens from the catalog</p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-slate-800 truncate">{item.product.name}</h5>
                      <p className="text-[11px] text-slate-500">
                        {item.boxes} Box ({item.boxes * item.product.dozensPerBox} doz) + {item.looseDozens} Loose = <span className="font-semibold text-slate-700">{item.totalDozens} doz</span>
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
              <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-4">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Dozens Count:</span>
                    <span className="font-semibold text-slate-800 font-mono">{totalDozensCount} Dozens</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1.5">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base text-slate-900">₹{totalBillAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Payment Collection Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setPaymentPreset('FULL'); setPaymentMode('CASH'); }}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition ${
                        paymentPreset === 'FULL'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Full Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPaymentPreset('ZERO'); setPaymentMode('CREDIT'); }}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition ${
                        paymentPreset === 'ZERO'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      100% Khata
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPreset('CUSTOM')}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition ${
                        paymentPreset === 'CUSTOM'
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Partial Split
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium block mb-1">Mode:</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI / PhonePe</option>
                      <option value="CREDIT">Khata Credit</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-medium block mb-1">Amount Paid Now:</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={totalBillAmount}
                        disabled={paymentPreset !== 'CUSTOM'}
                        placeholder={computedAmountPaid.toFixed(2)}
                        value={paymentPreset === 'CUSTOM' ? amountPaidInput : computedAmountPaid}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium text-amber-900">
                    <span>Balance Due Added to Khata:</span>
                    <span className="font-mono font-bold text-red-600">₹{balanceDue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-700 pt-1 border-t border-amber-200/50">
                    <span>Updated Shop Total Credit:</span>
                    <span className="font-mono font-bold text-slate-900">₹{projectedShopBalance.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Optional order notes or remarks..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <button
                  disabled={submitting || cartItems.length === 0 || !selectedShopId}
                  onClick={handleSubmitBill}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Processing Instant Bill...</span>
                  ) : (
                    <>
                      <IndianRupee className="w-4 h-4" />
                      <span>Confirm & Generate Bill (₹{totalBillAmount.toFixed(0)})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddShopModal
        isOpen={showAddShopModal}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={() => {
          loadInitialData();
          showNotification('New shop added successfully!', 'success');
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

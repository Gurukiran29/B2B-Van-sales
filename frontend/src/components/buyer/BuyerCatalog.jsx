import React, { useState, useEffect } from 'react';
import { productApi, billingApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, Clock 
} from 'lucide-react';
import ReceiptModal from '../common/ReceiptModal';

const BuyerCatalog = ({ showNotification, onOrderPlaced }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState({});
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        productApi.getAll(),
        productApi.getCategories()
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load wholesale catalog', 'error');
    }
  };

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

  const clearCart = () => {
    setCart({});
    setOrderNotes('');
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

  const totalOrderAmount = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const totalDozensCount = cartItems.reduce((acc, item) => acc + item.totalDozens, 0);

  const handlePlacePreOrder = async () => {
    if (!user?.shopId) {
      showNotification('Your account is not linked to a shop. Please contact the distributor.', 'error');
      return;
    }
    if (cartItems.length === 0) {
      showNotification('Please select products for your pre-order', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shopId: user.shopId,
        items: cartItems.map(item => ({
          productId: item.product.id,
          boxesCount: item.boxes,
          looseDozens: item.looseDozens,
        })),
        amountPaid: 0,
        paymentMode: 'CREDIT',
        notes: orderNotes ? `Buyer Pre-Order: ${orderNotes}` : 'Buyer Pre-Order for next Van Visit',
      };

      const res = await billingApi.createInvoice(payload);
      setLastInvoice(res.data);
      showNotification('Pre-order submitted! Stock reserved for next van delivery.', 'success');
      clearCart();
      fetchCatalog();
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to submit pre-order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brand-700 to-indigo-800 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-200 block">
            Direct Wholesale FMCG Catalog
          </span>
          <h2 className="text-xl font-black mt-0.5">Order Biscuits & Snacks for Van Delivery</h2>
          <p className="text-xs text-brand-100 mt-1">
            Order in full boxes or loose dozens. Items will be delivered directly to your shop in {user?.village || 'your village'}.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/20 text-center">
          <span className="text-[11px] text-brand-200 block">Van Route Delivery</span>
          <span className="text-xs font-bold text-white flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-brand-300" /> Daily Morning Route
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Parle-G, Good Day, Dark Fantasy, Oreo..."
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
            </div>
          </div>

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
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20'
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
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                        {p.category}
                      </span>
                    </div>

                    <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Box Rate ({p.dozensPerBox} doz):</span>
                        <span className="font-bold text-slate-900 font-mono">
                          ₹{parseFloat(p.boxPrice).toFixed(0)} <span className="text-[10px] text-slate-500">/box</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Loose Rate:</span>
                        <span className="font-bold text-brand-600 font-mono">
                          ₹{parseFloat(p.pricePerDozen).toFixed(0)} <span className="text-[10px] text-slate-500">/doz</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Boxes:</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          disabled={boxCount === 0}
                          onClick={() => updateQuantity(p.id, 'boxes', -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs">{boxCount}</span>
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
                        <span className="w-8 text-center font-mono font-bold text-xs">{looseCount}</span>
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
        </div>

        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="text-sm font-bold">My Pre-Order Cart</h3>
                  <p className="text-[11px] text-slate-400">{cartItems.length} items in cart</p>
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

            <div className="p-4 max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
              {cartItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-40" />
                  <p>Your pre-order cart is empty</p>
                  <p className="text-[11px] text-slate-400">Select box counts and loose dozens above</p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-slate-800 truncate">{item.product.name}</h5>
                      <p className="text-[11px] text-slate-500">
                        {item.boxes} Box + {item.looseDozens} Doz ({item.totalDozens} doz total)
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
                    <span>Total Quantity:</span>
                    <span className="font-semibold text-slate-800 font-mono">{totalDozensCount} Dozens</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1.5">
                    <span>Total Order Value:</span>
                    <span className="font-mono text-base text-brand-600">₹{totalOrderAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 space-y-1">
                  <span className="font-bold text-[11px] block">Digital Khata Terms:</span>
                  <p className="text-[11px] leading-tight">
                    This pre-order will be verified and delivered directly to your shop on the van's next stop. Outstanding amount will be added to your shop's credit ledger.
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Notes for van driver (e.g. deliver before 10 AM)..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <button
                  disabled={submitting}
                  onClick={handlePlacePreOrder}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Placing Pre-Order...' : `Place Pre-Order (₹${totalOrderAmount.toFixed(0)})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {lastInvoice && (
        <ReceiptModal
          invoice={lastInvoice}
          onClose={() => setLastInvoice(null)}
        />
      )}
    </div>
  );
};

export default BuyerCatalog;

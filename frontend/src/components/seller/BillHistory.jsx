import React, { useState, useEffect } from 'react';
import { billingApi, shopApi, productApi } from '../../services/api';
import { 
  FileText, Search, Filter, Trash2, Eye, Edit3, ShieldCheck, ShieldAlert, 
  MapPin, Store, Calendar, IndianRupee, RefreshCw, X, AlertCircle, 
  CheckCircle2, Clock, Check, Layers, ChevronDown, Plus, Minus, Printer
} from 'lucide-react';
import ReceiptModal from '../common/ReceiptModal';

const formatIST = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const BillHistory = ({ showNotification }) => {
  const [invoices, setInvoices] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // 3-Tier Cascading Filter State
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedShopId, setSelectedShopId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, UNPAID_OR_PARTIAL, PAID
  const [billLimit, setBillLimit] = useState(5); // 5, 10, 20, 0 (All)
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Bill Details & Receipt Modal
  const [viewInvoice, setViewInvoice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Edit Bill State
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editForm, setEditForm] = useState({
    items: [],
    amountPaid: '',
    paymentMode: 'CASH',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [invRes, shopRes, prodRes] = await Promise.all([
        billingApi.getAllInvoices(),
        shopApi.getAll(),
        productApi.getAll(),
      ]);
      setInvoices(invRes.data || []);
      setShops(shopRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load bill history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await billingApi.getAllInvoices();
      setInvoices(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Derive unique routes & villages dynamically
  const availableRoutes = Array.from(new Set(shops.map(s => s.route).filter(Boolean))).sort();
  
  const availableVillages = Array.from(new Set(
    shops
      .filter(s => selectedRoute === 'ALL' || s.route === selectedRoute)
      .map(s => s.village)
      .filter(Boolean)
  )).sort();

  const availableShops = shops.filter(s => {
    const matchRoute = selectedRoute === 'ALL' || s.route === selectedRoute;
    const matchVillage = selectedVillage === 'ALL' || s.village === selectedVillage;
    return matchRoute && matchVillage;
  });

  // Open Edit Modal
  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    // Pre-populate items
    const populatedItems = (inv.items || []).map(item => {
      // Find matching product in catalog
      const prod = products.find(p => p.id === item.productId) || {};
      const dozensPerBox = item.boxesCount > 0 ? Math.round(item.totalDozens / item.boxesCount) : (prod.dozensPerBox || 1);
      return {
        productId: item.productId,
        productName: item.productName || prod.name || 'Item',
        boxesCount: item.boxesCount || 0,
        looseDozens: item.looseDozens || 0,
        dozensPerBox: dozensPerBox,
        pricePerDozen: parseFloat(item.pricePerDozen || prod.pricePerDozen || 0),
        effectiveBoxPrice: parseFloat(prod.wholesaleBoxOfferPrice || prod.boxPrice || (item.pricePerDozen * dozensPerBox) || 0),
      };
    });

    setEditForm({
      items: populatedItems,
      amountPaid: inv.amountPaid !== undefined ? inv.amountPaid : '',
      paymentMode: inv.paymentMode || 'CASH',
      notes: inv.notes || '',
    });
  };

  // Add Item to Edit Form
  const handleAddItemToEdit = (productId) => {
    if (!productId) return;
    const prod = products.find(p => p.id === parseInt(productId));
    if (!prod) return;

    const existingIndex = editForm.items.findIndex(i => i.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...editForm.items];
      updated[existingIndex].boxesCount += 1;
      setEditForm({ ...editForm, items: updated });
    } else {
      const dozensPerBox = prod.dozensPerBox || 1;
      const effectiveBox = parseFloat(prod.wholesaleBoxOfferPrice || prod.boxPrice || (prod.pricePerDozen * dozensPerBox) || 0);
      setEditForm({
        ...editForm,
        items: [
          ...editForm.items,
          {
            productId: prod.id,
            productName: prod.name,
            boxesCount: 1,
            looseDozens: 0,
            dozensPerBox: dozensPerBox,
            pricePerDozen: parseFloat(prod.pricePerDozen || 0),
            effectiveBoxPrice: effectiveBox,
          }
        ]
      });
    }
  };

  // Update item quantity in edit
  const handleUpdateItemQty = (index, field, value) => {
    const updated = [...editForm.items];
    const val = Math.max(0, parseInt(value) || 0);
    updated[index][field] = val;
    setEditForm({ ...editForm, items: updated });
  };

  // Remove item from edit
  const handleRemoveItem = (index) => {
    const updated = editForm.items.filter((_, idx) => idx !== index);
    setEditForm({ ...editForm, items: updated });
  };

  // Calculate live totals in edit
  const calculatedTotal = editForm.items.reduce((sum, item) => {
    const boxSub = item.effectiveBoxPrice * item.boxesCount;
    const looseSub = item.pricePerDozen * item.looseDozens;
    return sum + boxSub + looseSub;
  }, 0);

  const parsedAmountPaid = parseFloat(editForm.amountPaid) || 0;
  const calculatedBalance = Math.max(0, calculatedTotal - parsedAmountPaid);

  // Save Edited Bill
  const handleSaveEditedBill = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;

    if (editForm.items.length === 0) {
      showNotification('Bill must have at least one product item', 'warning');
      return;
    }

    const validItems = editForm.items.filter(i => (i.boxesCount > 0 || i.looseDozens > 0));
    if (validItems.length === 0) {
      showNotification('Please specify quantity (boxes or loose dozens) for at least one item', 'warning');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        shopId: editingInvoice.shopId,
        paymentMode: editForm.paymentMode,
        amountPaid: parsedAmountPaid,
        notes: editForm.notes || undefined,
        items: validItems.map(i => ({
          productId: i.productId,
          boxesCount: i.boxesCount,
          looseDozens: i.looseDozens,
        }))
      };

      const updated = await billingApi.updateInvoice(editingInvoice.id, payload);
      showNotification(`Bill #${editingInvoice.invoiceNumber} updated successfully! Van stock and Khata ledger reconciled.`, 'success');
      setEditingInvoice(null);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to update bill', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Safe Delete Bill
  const handleDeleteBill = async (invoice) => {
    if (invoice.balanceDue > 0) {
      alert(`⚠️ PROTECTED BILL: Invoice #${invoice.invoiceNumber} has an unpaid debt of ₹${invoice.balanceDue.toFixed(2)}. Unpaid bills cannot be deleted to protect your Khata balance!`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete fully paid bill #${invoice.invoiceNumber} (${invoice.shopName})? This will clean up your history without affecting balances.`)) {
      return;
    }

    setDeletingId(invoice.id);
    try {
      await billingApi.deleteInvoice(invoice.id);
      showNotification(`Paid bill #${invoice.invoiceNumber} deleted successfully!`, 'success');
      fetchInvoices();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to delete bill', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter logic
  let filteredInvoices = invoices.filter(inv => {
    // 1. Route Filter
    if (selectedRoute !== 'ALL' && inv.route !== selectedRoute) return false;
    // 2. Village Filter
    if (selectedVillage !== 'ALL' && inv.village !== selectedVillage) return false;
    // 3. Shop Filter
    if (selectedShopId !== 'ALL' && inv.shopId !== parseInt(selectedShopId)) return false;
    // 4. Status Filter
    if (statusFilter === 'UNPAID_OR_PARTIAL' && (inv.balanceDue === 0 || inv.paymentStatus === 'PAID')) return false;
    if (statusFilter === 'PAID' && inv.balanceDue > 0) return false;
    // 5. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q);
      const matchShop = inv.shopName && inv.shopName.toLowerCase().includes(q);
      const matchOwner = inv.ownerName && inv.ownerName.toLowerCase().includes(q);
      const matchVill = inv.village && inv.village.toLowerCase().includes(q);
      return matchNum || matchShop || matchOwner || matchVill;
    }
    return true;
  });

  // Apply Bill Limit per shop or overall
  const totalMatchingBills = filteredInvoices.length;
  if (billLimit > 0 && filteredInvoices.length > billLimit) {
    filteredInvoices = filteredInvoices.slice(0, billLimit);
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Bill History & Audit Log</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter by Route, Village & Shop • Inspect itemized receipts, edit mistakes, or print in 58mm thermal format.
          </p>
        </div>

        <button
          onClick={fetchInitialData}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Bills
        </button>
      </div>

      {/* 3-Tier Cascading Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
          <Filter className="w-3.5 h-3.5 text-brand-600" />
          <span>3-Tier Route & Village Filter:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Route Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">1. Delivery Route:</label>
            <select
              value={selectedRoute}
              onChange={(e) => {
                setSelectedRoute(e.target.value);
                setSelectedVillage('ALL');
                setSelectedShopId('ALL');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Delivery Routes ({availableRoutes.length})</option>
              {availableRoutes.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 2. Village Filter (Cascaded) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">2. Village (In Route):</label>
            <select
              value={selectedVillage}
              onChange={(e) => {
                setSelectedVillage(e.target.value);
                setSelectedShopId('ALL');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Villages ({availableVillages.length})</option>
              {availableVillages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* 3. Shop Filter (Cascaded) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">3. Retail Shop:</label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Shops in Village ({availableShops.length})</option>
              {availableShops.map(s => (
                <option key={s.id} value={s.id}>{s.shopName} ({s.village})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filters: Search, Status, Limit */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Bill #, Shop Name, Owner, or Village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNPAID_OR_PARTIAL">Pending / Debt Bills</option>
              <option value="PAID">Fully Paid Bills</option>
            </select>

            {/* Bill Limit Toggle (Last 5, Last 10, Last 20, All) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[5, 10, 20, 0].map(limit => (
                <button
                  key={limit}
                  onClick={() => setBillLimit(limit)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    billLimit === limit
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {limit === 0 ? 'All' : `Last ${limit}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bill History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-600">
          <span>Showing {filteredInvoices.length} of {totalMatchingBills} Bills</span>
          {billLimit > 0 && totalMatchingBills > billLimit && (
            <span className="text-amber-700 font-normal">
              Displaying latest {billLimit} bills per filter. Toggle [All] to see full history.
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading bills...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <h4 className="text-xs font-bold text-slate-700">No Bills Found</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              No bills match your current Route, Village, and Shop filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time (IST)</th>
                  <th className="py-3 px-4">Retail Shop</th>
                  <th className="py-3 px-4">Route & Village</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => {
                  const isPaid = inv.balanceDue === 0 || inv.paymentStatus === 'PAID';
                  const isDeleting = deletingId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {formatIST(inv.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {inv.shopName}
                        {inv.ownerName && (
                          <span className="block text-[11px] font-normal text-slate-400">
                            {inv.ownerName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{inv.village}</span>
                        <span className="block text-[10px] text-slate-400">{inv.route}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                          {inv.items?.length || 0} items
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{parseFloat(inv.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                        ₹{parseFloat(inv.amountPaid || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {inv.balanceDue > 0 ? (
                          <span className="text-red-600">₹{parseFloat(inv.balanceDue).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : inv.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. View / Print Receipt */}
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition"
                            title="View / Print Receipt (58mm Thermal or Full)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Edit Bill Button */}
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition"
                            title="Edit / Update Bill Mistakes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Safe Delete Button (Unpaid protected) */}
                          {isPaid ? (
                            <button
                              onClick={() => handleDeleteBill(inv)}
                              disabled={isDeleting}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                              title="Delete Fully Paid Bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span 
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title="Protected: Unpaid bill cannot be deleted to preserve Khata ledger"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
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

      {/* Edit Bill Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">Edit Bill #{editingInvoice.invoiceNumber}</h3>
                  <p className="text-xs text-slate-400">{editingInvoice.shopName} • Van Stock & Khata will automatically reconcile</p>
                </div>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedBill} className="p-6 space-y-4 text-xs">
              {/* Product Items in Bill */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-slate-800">1. Bill Items & Quantities:</label>
                  <select
                    onChange={(e) => {
                      handleAddItemToEdit(e.target.value);
                      e.target.value = '';
                    }}
                    className="px-2.5 py-1 bg-brand-50 text-brand-700 font-bold rounded-lg border border-brand-200 text-xs"
                  >
                    <option value="">+ Add Item to Bill...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Van: {p.stockInDozens} doz)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editForm.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{item.productName}</span>
                        <span className="text-[10px] text-slate-500">
                          ₹{item.effectiveBoxPrice.toFixed(2)}/box • ₹{item.pricePerDozen.toFixed(2)}/doz
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div>
                          <label className="text-[9px] text-slate-400 block text-center">Boxes</label>
                          <input
                            type="number"
                            min="0"
                            value={item.boxesCount}
                            onChange={(e) => handleUpdateItemQty(idx, 'boxesCount', e.target.value)}
                            className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 block text-center">Loose Doz</label>
                          <input
                            type="number"
                            min="0"
                            value={item.looseDozens}
                            onChange={(e) => handleUpdateItemQty(idx, 'looseDozens', e.target.value)}
                            className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-xs"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 mt-3"
                          title="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount Paid (Spot Cash/UPI) ₹</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.amountPaid}
                    onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={editForm.paymentMode}
                    onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CREDIT">CREDIT (Full Debt)</option>
                  </select>
                </div>
              </div>

              {/* Calculated Summary */}
              <div className="p-3 bg-brand-50/50 rounded-xl border border-brand-100 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block">Total Recalculated Bill:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">₹{calculatedTotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount Paid:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">₹{parsedAmountPaid.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">New Balance Due:</span>
                  <span className="font-mono font-bold text-red-600 text-sm">₹{calculatedBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Reason for Edit</label>
                <input
                  type="text"
                  placeholder="e.g. Corrected item quantity from 2 to 1 box"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {savingEdit ? 'Reconciling & Saving...' : 'Save & Update Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View / Print Receipt Modal */}
      {viewInvoice && (
        <ReceiptModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
        />
      )}
    </div>
  );
};

export default BillHistory;

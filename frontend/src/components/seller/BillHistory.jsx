import React, { useState, useEffect } from 'react';
import { billingApi, shopApi } from '../../services/api';
import { 
  FileText, Search, Filter, Trash2, Eye, ShieldCheck, ShieldAlert, 
  MapPin, Store, Calendar, IndianRupee, RefreshCw, X, AlertCircle, 
  CheckCircle2, Clock, Check, Layers, ChevronDown
} from 'lucide-react';

const BillHistory = ({ showNotification }) => {
  const [invoices, setInvoices] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);

  // 3-Tier Cascading Filter State
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedShopId, setSelectedShopId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, UNPAID_OR_PARTIAL, PAID
  const [billLimit, setBillLimit] = useState(5); // 5, 10, 20, 0 (All)
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Bill Details Modal
  const [viewInvoice, setViewInvoice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [invRes, shopRes] = await Promise.all([
        billingApi.getAllInvoices(),
        shopApi.getAll(),
      ]);
      setInvoices(invRes.data || []);
      setShops(shopRes.data || []);
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
    if (statusFilter === 'UNPAID_OR_PARTIAL' && (inv.paymentStatus === 'PAID' || inv.balanceDue === 0)) return false;
    if (statusFilter === 'PAID' && inv.paymentStatus !== 'PAID') return false;
    // 5. Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchInv = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchShop = inv.shopName?.toLowerCase().includes(q);
      const matchVil = inv.village?.toLowerCase().includes(q);
      if (!matchInv && !matchShop && !matchVil) return false;
    }
    return true;
  });

  // Apply per-shop or total limit
  let displayInvoices = filteredInvoices;
  if (billLimit > 0 && selectedShopId !== 'ALL') {
    displayInvoices = filteredInvoices.slice(0, billLimit);
  } else if (billLimit > 0 && selectedShopId === 'ALL') {
    // Group by shop and take last N bills of each shop, then flatten
    const shopMap = new Map();
    filteredInvoices.forEach(inv => {
      if (!shopMap.has(inv.shopId)) {
        shopMap.set(inv.shopId, []);
      }
      if (shopMap.get(inv.shopId).length < billLimit) {
        shopMap.get(inv.shopId).push(inv);
      }
    });
    displayInvoices = Array.from(shopMap.values()).flat();
  }

  const totalFilteredSales = displayInvoices.reduce((acc, i) => acc + (parseFloat(i.totalAmount) || 0), 0);
  const totalFilteredCredit = displayInvoices.reduce((acc, i) => acc + (parseFloat(i.balanceDue) || 0), 0);
  const totalFilteredPaid = displayInvoices.reduce((acc, i) => acc + (parseFloat(i.amountPaid) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900">Invoices & Bill History</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            View recent shop bills, inspect 15-item breakdowns, and safely clean up old paid bills without losing unpaid debts.
          </p>
        </div>

        <button
          onClick={fetchInitialData}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh History
        </button>
      </div>

      {/* 3-Tier Cascading Filter Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Filter className="w-4 h-4 text-brand-600" /> Filter Invoices by Route, Village & Shop:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tier 1: Delivery Route */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">1. Delivery Route</label>
            <select
              value={selectedRoute}
              onChange={(e) => {
                setSelectedRoute(e.target.value);
                setSelectedVillage('ALL');
                setSelectedShopId('ALL');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Delivery Routes ({availableRoutes.length})</option>
              {availableRoutes.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Tier 2: Village */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">2. Village</label>
            <select
              value={selectedVillage}
              onChange={(e) => {
                setSelectedVillage(e.target.value);
                setSelectedShopId('ALL');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Villages in Route ({availableVillages.length})</option>
              {availableVillages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Tier 3: Shop */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">3. Retail Shop</label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Shops ({availableShops.length})</option>
              {availableShops.map(s => (
                <option key={s.id} value={s.id}>{s.shopName} ({s.village})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-Filters: Status & Bill Count Limit */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] text-slate-500 font-semibold mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Bills ({filteredInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID_OR_PARTIAL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                statusFilter === 'UNPAID_OR_PARTIAL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Unpaid / Credit Debt
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Fully Paid
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-semibold">View Limit:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl font-bold text-xs">
              {[5, 10, 20, 0].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setBillLimit(cnt)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    billLimit === cnt ? 'bg-white text-brand-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cnt === 0 ? 'All' : `Last ${cnt}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mini Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[11px] text-slate-500 block">Bills Shown</span>
            <span className="text-xl font-bold font-mono text-slate-900">{displayInvoices.length} Invoices</span>
          </div>
          <FileText className="w-6 h-6 text-slate-400" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[11px] text-emerald-700 block">Total Paid Collections</span>
            <span className="text-xl font-bold font-mono text-emerald-700">₹{totalFilteredPaid.toFixed(2)}</span>
          </div>
          <IndianRupee className="w-6 h-6 text-emerald-500" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
          <div>
            <span className="text-[11px] text-red-700 block">Pending Credit Due</span>
            <span className="text-xl font-bold font-mono text-red-700">₹{totalFilteredCredit.toFixed(2)}</span>
          </div>
          <ShieldAlert className="w-6 h-6 text-red-500" />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading invoice history...</div>
        ) : displayInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <h4 className="text-sm font-bold text-slate-800">No Invoices Found</h4>
            <p className="text-xs text-slate-500">No bills match the selected route, village, and shop filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice # & Date</th>
                  <th className="py-3 px-4">Shop & Village</th>
                  <th className="py-3 px-4">Delivery Route</th>
                  <th className="py-3 px-4 text-center">Items Count</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Balance (Credit)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayInvoices.map(inv => {
                  const isUnpaid = inv.balanceDue > 0;
                  const formattedDate = new Date(inv.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{inv.invoiceNumber}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {formattedDate}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{inv.shopName}</span>
                        <span className="text-[11px] text-slate-500">{inv.village}</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {inv.route || 'General Route'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                          {inv.items?.length || 0} Items
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{parseFloat(inv.totalAmount).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        ₹{parseFloat(inv.amountPaid).toFixed(2)}
                        <span className="text-[10px] text-slate-400 block font-normal">({inv.paymentMode})</span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isUnpaid ? (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            ₹{parseFloat(inv.balanceDue).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {inv.paymentStatus === 'PAID' ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Fully Paid
                          </span>
                        ) : inv.paymentStatus === 'PARTIAL' ? (
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Partial
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Unpaid
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Bill Details */}
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-1.5 text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
                            title="View Itemized Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Bill (Only allowed if Fully Paid) */}
                          {isUnpaid ? (
                            <span 
                              className="p-1.5 text-slate-300 cursor-not-allowed" 
                              title="Unpaid bill: Protected from deletion to keep ledger accurate"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          ) : (
                            <button
                              disabled={deletingId === inv.id}
                              onClick={() => handleDeleteBill(inv)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Paid Bill (Clean up history)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Itemized Receipt Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Invoice Details: {viewInvoice.invoiceNumber}</h3>
                <p className="text-xs text-slate-400">
                  {viewInvoice.shopName} • {viewInvoice.village} ({viewInvoice.route})
                </p>
              </div>
              <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Bill Meta */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Date & Time</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(viewInvoice.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Payment Mode</span>
                  <span className="font-semibold text-slate-800">{viewInvoice.paymentMode}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 flex justify-between items-center">
                  <span>Product Items ({viewInvoice.items?.length || 0}):</span>
                  <span className="text-[11px] text-slate-400">Rate & Qty</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {viewInvoice.items?.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.productName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.boxesCount > 0 && `${item.boxesCount} Boxes `}
                          {item.looseDozens > 0 && `+ ${item.looseDozens} Doz `}
                          (${item.totalDozens} total units)
                        </span>
                      </div>
                      <div className="text-right font-mono font-bold text-slate-900">
                        ₹{parseFloat(item.subtotal).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Amount:</span>
                  <span className="font-bold text-slate-900">₹{parseFloat(viewInvoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Amount Paid:</span>
                  <span className="font-bold">₹{parseFloat(viewInvoice.amountPaid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600 pt-2 border-t border-slate-200 text-sm font-black">
                  <span>Balance Due:</span>
                  <span>₹{parseFloat(viewInvoice.balanceDue).toFixed(2)}</span>
                </div>
              </div>

              {viewInvoice.notes && (
                <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <strong>Notes:</strong> {viewInvoice.notes}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setViewInvoice(null)}
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillHistory;

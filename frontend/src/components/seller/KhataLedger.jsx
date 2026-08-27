import React, { useState, useEffect } from 'react';
import { shopApi, paymentApi } from '../../services/api';
import { 
  BookOpen, Search, MapPin, IndianRupee, Phone, Plus,
  FileText, X, AlertCircle, Store
} from 'lucide-react';
import ReceiptModal from '../common/ReceiptModal';
import AddShopModal from './AddShopModal';

const KhataLedger = ({ showNotification }) => {
  const [shops, setShops] = useState([]);
  const [villages, setVillages] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [settlingShop, setSettlingShop] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMode, setSettleMode] = useState('CASH');
  const [settleNotes, setSettleNotes] = useState('Weekly Khata Payment');
  const [settleLoading, setSettleLoading] = useState(false);

  const [statementShop, setStatementShop] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showAddShopModal, setShowAddShopModal] = useState(false);

  useEffect(() => {
    fetchLedgerData();
  }, []);

  const fetchLedgerData = async () => {
    try {
      const [shopsRes, villRes, routeRes] = await Promise.all([
        shopApi.getAll(),
        shopApi.getVillages(),
        shopApi.getRoutes()
      ]);
      setShops(shopsRes.data || []);
      setVillages(villRes.data || []);
      setRoutes(routeRes.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load Khata ledger data', 'error');
    }
  };

  const filteredShops = shops.filter(shop => {
    const matchesVillage = selectedVillage === 'ALL' || shop.village === selectedVillage;
    const matchesRoute = selectedRoute === 'ALL' || shop.route === selectedRoute;
    const matchesSearch = searchQuery === '' ||
      shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.phoneNumber.includes(searchQuery);
    return matchesVillage && matchesRoute && matchesSearch;
  });

  const totalMarketCredit = shops.reduce((acc, s) => acc + parseFloat(s.outstandingBalance || 0), 0);
  const shopsWithCreditCount = shops.filter(s => parseFloat(s.outstandingBalance || 0) > 0).length;

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settlingShop) return;

    const amount = parseFloat(settleAmount);
    if (!amount || amount <= 0) {
      showNotification('Please enter a valid payment amount', 'warning');
      return;
    }

    setSettleLoading(true);
    try {
      const payload = {
        shopId: settlingShop.id,
        amount: amount,
        paymentMode: settleMode,
        notes: settleNotes,
      };

      await paymentApi.settle(payload);
      showNotification(`Payment of ₹${amount} recorded and saved to database for ${settlingShop.shopName}!`, 'success');
      
      setSettlingShop(null);
      setSettleAmount('');
      fetchLedgerData();

      if (statementShop && statementShop.id === settlingShop.id) {
        openStatement(settlingShop);
      }
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setSettleLoading(false);
    }
  };

  const openStatement = async (shop) => {
    setStatementShop(shop);
    setStatementLoading(true);
    try {
      const res = await shopApi.getStatement(shop.id);
      setStatementData(res.data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load shop statement', 'error');
    } finally {
      setStatementLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Market Khata Credit</span>
            <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
              ₹{totalMarketCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400">Total outstanding balance in villages</span>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Shops with Credit Dues</span>
            <span className="text-2xl font-bold text-red-600 mt-1 block">
              {shopsWithCreditCount} <span className="text-sm font-normal text-slate-500">/ {shops.length} shops</span>
            </span>
            <span className="text-[11px] text-slate-500">Require repayment follow-up</span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Covered Rural Villages</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {villages.length} Villages
            </span>
            <span className="text-[11px] text-slate-500">Across {routes.length} delivery routes</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search shop by name, owner, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {villages.length > 0 && (
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Villages ({villages.length})</option>
                {villages.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            )}

            {routes.length > 0 && (
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Routes ({routes.length})</option>
                {routes.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowAddShopModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Village Shop
            </button>
          </div>
        </div>
      </div>

      {shops.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <Store className="w-12 h-12 mx-auto text-slate-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900">No Digital Khata Ledgers Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Add retail stores in villages along your van route to track wholesale purchases, outstanding credit balances, and cash/UPI repayments.
            </p>
          </div>
          <button
            onClick={() => setShowAddShopModal(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Your First Village Shop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map(shop => {
            const balance = parseFloat(shop.outstandingBalance || 0);
            const hasBalance = balance > 0;

            return (
              <div
                key={shop.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all ${
                  balance > 3000
                    ? 'border-red-200 hover:border-red-300'
                    : hasBalance
                    ? 'border-amber-200 hover:border-amber-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{shop.shopName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Owner: {shop.ownerName}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {shop.village}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{shop.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{shop.route}</span>
                    </div>
                  </div>

                  <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between ${
                    balance > 3000
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : hasBalance
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                        Khata Balance Due
                      </span>
                      <span className="text-base font-bold font-mono">
                        ₹{balance.toFixed(2)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      hasBalance ? 'bg-white/80 shadow-xs' : 'bg-emerald-200 text-emerald-900'
                    }`}>
                      {hasBalance ? 'Unpaid Credit' : 'Zero Due'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setSettlingShop(shop);
                      setSettleAmount(hasBalance ? balance.toString() : '');
                      setSettleMode('CASH');
                      setSettleNotes('Weekly Khata Payment');
                    }}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition text-center flex items-center justify-center gap-1"
                  >
                    <IndianRupee className="w-3.5 h-3.5" /> Settle Cash
                  </button>
                  <button
                    onClick={() => openStatement(shop)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-center flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Ledger
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {settlingShop && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Collect Weekly Khata Payment</h3>
                <p className="text-xs text-emerald-200 font-medium">{settlingShop.shopName} ({settlingShop.village})</p>
              </div>
              <button
                onClick={() => setSettlingShop(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Current Outstanding Due:</span>
                <span className="font-mono font-bold text-red-600 text-sm">
                  ₹{parseFloat(settlingShop.outstandingBalance || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Quick Amount:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleAmount(parseFloat(settlingShop.outstandingBalance || 0).toString())}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold border border-slate-200 text-center"
                  >
                    Full Due
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleAmount((Math.min(1000, parseFloat(settlingShop.outstandingBalance || 0))).toString())}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold border border-slate-200 text-center"
                  >
                    ₹1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleAmount((Math.min(2000, parseFloat(settlingShop.outstandingBalance || 0))).toString())}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold border border-slate-200 text-center"
                  >
                    ₹2,000
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount Collected (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Enter amount collected..."
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleMode('CASH')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition ${
                      settleMode === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Cash Collection
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleMode('UPI')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition ${
                      settleMode === 'UPI'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    UPI / PhonePe / GPay
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Remarks:</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly settlement, Diwali advance..."
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {parseFloat(settleAmount) > 0 && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-bold flex justify-between items-center text-emerald-950">
                  <span>Projected Remaining Balance:</span>
                  <span className="font-mono text-sm">
                    ₹{Math.max(0, parseFloat(settlingShop.outstandingBalance || 0) - parseFloat(settleAmount)).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSettlingShop(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {settleLoading ? 'Saving...' : 'Confirm Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statementShop && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Khata Ledger Statement</h3>
                <p className="text-xs text-brand-300 font-medium">{statementShop.shopName} • {statementShop.village}</p>
              </div>
              <button
                onClick={() => { setStatementShop(null); setStatementData(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {statementLoading || !statementData ? (
                <div className="text-center py-12 text-slate-400">Loading ledger records...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block">Total Billed Purchases</span>
                      <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                        ₹{parseFloat(statementData.totalBilledAmount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 font-medium block">Total Amount Paid</span>
                      <span className="text-base font-bold font-mono text-emerald-900 mt-0.5 block">
                        ₹{parseFloat(statementData.totalPaidAmount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <span className="text-amber-700 font-medium block">Current Outstanding Due</span>
                      <span className="text-base font-bold font-mono text-red-600 mt-0.5 block">
                        ₹{parseFloat(statementData.currentOutstandingBalance || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm">Past Orders & Invoices</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Total Bill</th>
                            <th className="py-2.5 px-3 text-right">Paid</th>
                            <th className="py-2.5 px-3 text-right">Balance Added</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {statementData.invoices?.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-4 text-center text-slate-400">No invoices recorded yet.</td>
                            </tr>
                          ) : (
                            statementData.invoices?.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                                <td className="py-2 px-3 text-slate-500 text-[11px]">
                                  {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  ₹{parseFloat(inv.totalAmount).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700">
                                  ₹{parseFloat(inv.amountPaid).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-red-600 font-semibold">
                                  ₹{parseFloat(inv.balanceDue).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    inv.paymentStatus === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : inv.paymentStatus === 'PARTIAL'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {inv.paymentStatus}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() => setSelectedReceipt(inv)}
                                    className="p-1 text-brand-600 hover:text-brand-800 rounded hover:bg-brand-50"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm">Khata Repayments & Settlement Logs</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Collector</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Amount Settled</th>
                            <th className="py-2.5 px-3 text-right">Previous Balance</th>
                            <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                            <th className="py-2.5 px-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {statementData.payments?.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-4 text-center text-slate-400">No payment settlements logged yet.</td>
                            </tr>
                          ) : (
                            statementData.payments?.map(pay => (
                              <tr key={pay.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 text-slate-500 text-[11px]">
                                  {new Date(pay.createdAt).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-800">{pay.recordedByName}</td>
                                <td className="py-2 px-3">
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {pay.paymentMode}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                  ₹{parseFloat(pay.amount).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-500">
                                  ₹{parseFloat(pay.previousBalance).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  ₹{parseFloat(pay.remainingBalance).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                                  {pay.notes}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => { setStatementShop(null); setStatementData(null); }}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300 transition text-xs"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      <AddShopModal
        isOpen={showAddShopModal}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={() => {
          fetchLedgerData();
          showNotification('New shop added to ledger!', 'success');
        }}
        showNotification={showNotification}
      />

      {selectedReceipt && (
        <ReceiptModal
          invoice={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default KhataLedger;

import React, { useState, useEffect } from 'react';
import { shopApi, paymentApi } from '../../services/api';
import { 
  BookOpen, Search, MapPin, IndianRupee, Phone, Plus,
  FileText, X, AlertCircle, Store, Navigation
} from 'lucide-react';
import ReceiptModal from '../common/ReceiptModal';
import AddShopModal from './AddShopModal';

const KhataLedger = ({ showNotification }) => {
  const [shops, setShops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
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
      const res = await shopApi.getAll();
      setShops(res.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load Khata ledger data', 'error');
    }
  };

  // Distinct routes present in user's shops from database
  const distinctRoutes = Array.from(new Set(shops.map(s => s.route).filter(Boolean))).sort();

  const handleRouteChange = (newRoute) => {
    setSelectedRoute(newRoute);
    setSelectedVillage('ALL');
  };

  // Cascading Available Villages based on selectedRoute
  const availableVillages = Array.from(new Set(
    shops
      .filter(s => selectedRoute === 'ALL' || s.route === selectedRoute)
      .map(s => s.village)
      .filter(Boolean)
  )).sort();

  // Filtered shops based on Cascading Route -> Village -> Search
  const filteredShops = shops.filter(shop => {
    const matchesRoute = selectedRoute === 'ALL' || shop.route === selectedRoute;
    const matchesVillage = selectedVillage === 'ALL' || shop.village === selectedVillage;
    const matchesSearch = searchQuery === '' ||
      shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.phoneNumber.includes(searchQuery);
    return matchesRoute && matchesVillage && matchesSearch;
  });

  const totalMarketCredit = filteredShops.reduce((acc, s) => acc + parseFloat(s.outstandingBalance || 0), 0);
  const shopsWithCreditCount = filteredShops.filter(s => parseFloat(s.outstandingBalance || 0) > 0).length;

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
      {/* Overview Cards for Selected Route */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              {selectedRoute === 'ALL' ? 'Total Market Credit' : `Credit Due: ${selectedRoute}`}
            </span>
            <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
              ₹{totalMarketCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400">
              Across {filteredShops.length} shops in view
            </span>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Shops with Credit Dues</span>
            <span className="text-2xl font-bold text-red-600 mt-1 block">
              {shopsWithCreditCount} <span className="text-sm font-normal text-slate-500">/ {filteredShops.length} in route</span>
            </span>
            <span className="text-[11px] text-slate-500">Require repayment follow-up</span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Covered Villages</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {availableVillages.length} Villages
            </span>
            <span className="text-[11px] text-slate-500">
              {selectedRoute === 'ALL' ? 'Across all routes' : `On ${selectedRoute}`}
            </span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* PRIMARY FILTER: DELIVERY ROUTE -> CASCADING VILLAGE FILTER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Route filter */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-2 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-brand-600" />
            1. Filter by Delivery Route:
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => handleRouteChange('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                selectedRoute === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Routes ({distinctRoutes.length})
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

        {/* Cascading Village & Search Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 items-center">
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              2. Filter Village in Route:
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Villages ({availableVillages.length})</option>
              {availableVillages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              Search Shop / Owner / Phone:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by shop name, owner, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => setShowAddShopModal(true)}
              className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Shop
            </button>
          </div>
        </div>
      </div>

      {/* FILTERED SHOPS CARDS DISPLAY */}
      {filteredShops.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <Store className="w-12 h-12 mx-auto text-slate-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900">No Shops Found for Selected Filters</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No retail stores match route "{selectedRoute}" and village "{selectedVillage}".
            </p>
          </div>
          <button
            onClick={() => setShowAddShopModal(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Shop to {selectedRoute !== 'ALL' ? selectedRoute : 'Route'}
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
                      <Navigation className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-brand-700">{shop.route}</span>
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
                  placeholder="e.g. Weekly settlement, advance payment..."
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

      <AddShopModal
        isOpen={showAddShopModal}
        defaultRoute={selectedRoute !== 'ALL' ? selectedRoute : ''}
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

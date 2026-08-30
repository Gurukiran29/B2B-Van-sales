import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import QuickPOS from '../components/seller/QuickPOS';
import VanStock from '../components/seller/VanStock';
import GodownStock from '../components/seller/GodownStock';
import ItemCatalog from '../components/seller/ItemCatalog';
import BillHistory from '../components/seller/BillHistory';
import KhataLedger from '../components/seller/KhataLedger';
import AddShopModal from '../components/seller/AddShopModal';
import { 
  Zap, Truck, Warehouse, Tag, BookOpen, BarChart3, Plus, 
  IndianRupee, TrendingUp, AlertTriangle, Store, RefreshCw, FileText
} from 'lucide-react';

const SellerDashboard = ({ showNotification }) => {
  const [activeTab, setActiveTab] = useState('pos');
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState('ALL');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await dashboardApi.getStats();
      setDashboardStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleInvoiceCreated = () => {
    fetchStats();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-brand-100 text-brand-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
              Van Sales Terminal
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Route Sales, Khata & Stocks</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">
            FMCG Wholesale & Van Distribution
          </h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddShopModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Village Shop
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-200/90 p-1.5 rounded-2xl overflow-x-auto text-xs font-bold shadow-inner">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'pos'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Zap className="w-4 h-4" /> Quick POS / Van Bill
        </button>

        <button
          onClick={() => setActiveTab('bill-history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'bill-history'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <FileText className="w-4 h-4" /> Bill History
        </button>

        <button
          onClick={() => setActiveTab('van-stock')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'van-stock'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Truck className="w-4 h-4" /> Van Stock
        </button>

        <button
          onClick={() => setActiveTab('godown-stock')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'godown-stock'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Warehouse className="w-4 h-4" /> Godown Stocks
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'items'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Tag className="w-4 h-4" /> Items Catalog
        </button>

        <button
          onClick={() => setActiveTab('khata')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'khata'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Digital Khata Ledger
        </button>

        <button
          onClick={() => { setActiveTab('metrics'); fetchStats(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'metrics'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Today's Sales Metrics
        </button>
      </div>

      {activeTab === 'pos' && (
        <QuickPOS
          externalRoute={activeRoute}
          onRouteSelect={(r) => setActiveRoute(r)}
          onInvoiceCreated={handleInvoiceCreated}
          showNotification={showNotification}
        />
      )}

      {activeTab === 'bill-history' && (
        <BillHistory
          showNotification={showNotification}
        />
      )}

      {activeTab === 'van-stock' && (
        <VanStock
          showNotification={showNotification}
          onNavigateToPOS={() => setActiveTab('pos')}
          onNavigateToGodown={() => setActiveTab('godown-stock')}
        />
      )}

      {activeTab === 'godown-stock' && (
        <GodownStock
          showNotification={showNotification}
          onNavigateToVan={() => setActiveTab('van-stock')}
          onNavigateToItems={() => setActiveTab('items')}
        />
      )}

      {activeTab === 'items' && (
        <ItemCatalog
          showNotification={showNotification}
          onNavigateToGodown={() => setActiveTab('godown-stock')}
          onNavigateToVan={() => setActiveTab('van-stock')}
        />
      )}

      {activeTab === 'khata' && (
        <KhataLedger
          showNotification={showNotification}
        />
      )}

      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Today's Total Sales</span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                ₹{parseFloat(dashboardStats?.todaySales || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-400">{dashboardStats?.todayBillsCount || 0} bills generated today</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-emerald-700 block">Today's Collections (Cash+UPI)</span>
              <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
                ₹{parseFloat(dashboardStats?.todayCollections || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">In hand / bank</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-red-600 block">Today's Credit Given</span>
              <span className="text-2xl font-bold font-mono text-red-600 mt-1 block">
                ₹{parseFloat(dashboardStats?.todayCreditGiven || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-red-500 font-medium">Added to shop ledgers</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-amber-700 block">Total Market Credit Due</span>
              <span className="text-2xl font-bold font-mono text-amber-800 mt-1 block">
                ₹{parseFloat(dashboardStats?.totalMarketCreditOutstanding || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-400">{dashboardStats?.shopsWithCreditCount || 0} shops with credit</span>
            </div>
          </div>
        </div>
      )}

      <AddShopModal
        isOpen={showAddShopModal}
        defaultRoute={activeRoute !== 'ALL' ? activeRoute : ''}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={() => {
          showNotification('New shop added to the van route!', 'success');
          fetchStats();
        }}
        showNotification={showNotification}
      />
    </div>
  );
};

export default SellerDashboard;

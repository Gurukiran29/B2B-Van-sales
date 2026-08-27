import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BuyerCatalog from '../components/buyer/BuyerCatalog';
import BuyerKhata from '../components/buyer/BuyerKhata';
import { ShoppingBag, BookOpen, Store, MapPin } from 'lucide-react';

const BuyerPortal = ({ showNotification }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('catalog');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Village Retail Shop Portal
            </span>
            <h1 className="text-xl font-bold text-slate-900">{user?.shopName || 'My Retail Shop'}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400" /> {user?.village || 'Village'} • {user?.route || 'Route'}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-brand-600" /> Wholesale Catalog & Cart
          </button>
          <button
            onClick={() => setActiveTab('khata')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'khata'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600" /> My Khata Ledger
          </button>
        </div>
      </div>

      {activeTab === 'catalog' && (
        <BuyerCatalog
          showNotification={showNotification}
          onOrderPlaced={() => setActiveTab('khata')}
        />
      )}

      {activeTab === 'khata' && (
        <BuyerKhata showNotification={showNotification} />
      )}
    </div>
  );
};

export default BuyerPortal;

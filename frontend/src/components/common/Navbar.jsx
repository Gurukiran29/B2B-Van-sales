import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, Store, LogOut, MapPin, ShieldCheck, ShieldAlert } from 'lucide-react';

const Navbar = () => {
  const { user, isSeller, isBuyer, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl text-white shadow-md flex items-center justify-center ${
              isAdmin ? 'bg-red-600 shadow-red-500/20' : 'bg-brand-500 shadow-brand-500/20'
            }`}>
              {isAdmin ? <ShieldAlert className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">VanSales</span>
                <span className={`text-white font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  isAdmin ? 'bg-red-600' : 'bg-brand-600'
                }`}>
                  {isAdmin ? 'Admin' : 'Khata'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {isAdmin ? 'System Audit & Fraud Management' : 'FMCG Van Distribution & Digital Ledger'}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50">
            {isAdmin ? (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold text-red-300">Fraud Control & System Administration</span>
              </>
            ) : isSeller ? (
              <>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-slate-300">Van Active Route:</span>
                <span className="text-xs font-bold text-brand-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Live Delivery Routes
                </span>
              </>
            ) : (
              <>
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-slate-200">{user?.shopName || 'Retail Shop'}</span>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                  {user?.village || 'Village'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                {user?.fullName}
                {isAdmin && <ShieldAlert className="w-3.5 h-3.5 text-red-400 inline" />}
                {isSeller && <ShieldCheck className="w-3.5 h-3.5 text-brand-400 inline" />}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {user?.phoneNumber} • <span className={
                  isAdmin ? "text-red-400 font-semibold uppercase" :
                  isSeller ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"
                }>
                  {isAdmin ? "Super Admin" : isSeller ? "Van Lead" : "Shopkeeper"}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

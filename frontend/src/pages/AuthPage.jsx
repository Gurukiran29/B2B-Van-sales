import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Store, Lock, Phone, User, MapPin, Navigation, ShieldAlert } from 'lucide-react';

const AuthPage = ({ showNotification }) => {
  const { login, register } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [roleSelection, setRoleSelection] = useState('ROLE_SELLER');
  const [loading, setLoading] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [village, setVillage] = useState('');
  const [route, setRoute] = useState('');
  const [address, setAddress] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length !== 10) {
      showNotification('Please enter a valid 10-digit phone number', 'warning');
      return;
    }
    if (!password) {
      showNotification('Please enter your password / PIN', 'warning');
      return;
    }

    setLoading(true);
    try {
      await login(phoneNumber, password);
      showNotification('Signed in successfully!', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Login failed. Please check your phone number and PIN.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length !== 10) {
      showNotification('Please enter a valid 10-digit phone number', 'warning');
      return;
    }
    if (!password) {
      showNotification('Please create a password or 6-digit PIN', 'warning');
      return;
    }
    if (!fullName.trim()) {
      showNotification('Please enter your full name', 'warning');
      return;
    }
    if (roleSelection === 'ROLE_BUYER' && !shopName.trim()) {
      showNotification('Please enter your retail shop name', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        phoneNumber: phoneNumber.trim(),
        password: password,
        fullName: fullName.trim(),
        role: roleSelection,
        shopName: roleSelection === 'ROLE_BUYER' ? shopName.trim() : null,
        ownerName: fullName.trim(),
        village: roleSelection === 'ROLE_BUYER' ? (village.trim() || 'General Area') : null,
        route: roleSelection === 'ROLE_BUYER' ? (route.trim() || 'Route 1') : null,
        address: roleSelection === 'ROLE_BUYER' ? address.trim() : null,
      };

      await register(payload);
      showNotification('Account created successfully in database!', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20 items-center justify-center">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            VanSales <span className="text-brand-400">Khata</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            B2B Wholesale FMCG Van Distribution & Digital Credit Ledger
          </p>
        </div>

        <div className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              onClick={() => setIsLoginTab(true)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                isLoginTab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLoginTab(false)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                !isLoginTab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {isLoginTab ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number (10 Digits)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength="10"
                    placeholder="e.g. 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password / 6-Digit PIN</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50 text-xs mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to VanSales'}
              </button>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-500">
                  New to VanSales?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLoginTab(false)}
                    className="text-brand-600 font-bold hover:underline"
                  >
                    Register your distributor, shop, or admin account
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Select Role *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRoleSelection('ROLE_SELLER')}
                    className={`py-2 px-1 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center gap-1 ${
                      roleSelection === 'ROLE_SELLER'
                        ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span className="text-[11px]">Distributor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleSelection('ROLE_BUYER')}
                    className={`py-2 px-1 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center gap-1 ${
                      roleSelection === 'ROLE_BUYER'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span className="text-[11px]">Village Shop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleSelection('ROLE_ADMIN')}
                    className={`py-2 px-1 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center gap-1 ${
                      roleSelection === 'ROLE_ADMIN'
                        ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[11px]">Admin</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Your Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number (10 Digits) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength="10"
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Create Password / 6-Digit PIN *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {roleSelection === 'ROLE_BUYER' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Shop / Retail Store Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Laxmi Kirana & General Store"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> Village / Town *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rampur"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-slate-400" /> Delivery Route
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. North Route"
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Shop Location / Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Chowk, Near Panchayat Bhawan"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50 text-xs mt-2"
              >
                {loading ? 'Creating Account...' : 'Complete Registration & Save to DB'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

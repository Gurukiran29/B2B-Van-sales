import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { 
  ShieldAlert, Users, Truck, Store, IndianRupee, Search, 
  Trash2, RefreshCw, AlertTriangle, X, ShieldCheck 
} from 'lucide-react';

const AdminDashboard = ({ showNotification }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [deletingUser, setDeletingUser] = useState(null);
  const [fraudReason, setFraudReason] = useState('Fraudulent Billing / False Credit Claims');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [roleFilter]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminApi.getUsers({ role: roleFilter }),
        adminApi.getStats()
      ]);
      setUsers(usersRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === '' ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneNumber.includes(searchQuery) ||
      (u.shopName && u.shopName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.village && u.village.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleDeleteUserSubmit = async (e) => {
    e.preventDefault();
    if (!deletingUser) return;

    setDeleteLoading(true);
    try {
      await adminApi.deleteUser(deletingUser.id);
      showNotification(`User ${deletingUser.fullName} (${deletingUser.phoneNumber}) permanently removed from database for fraud.`, 'success');
      setDeletingUser(null);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to delete user account', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-red-950 text-white p-5 rounded-2xl shadow-md border border-red-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-600/20 text-red-400 rounded-2xl border border-red-500/30">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">
              System Administration & Security Control
            </span>
            <h1 className="text-xl font-black">User Audit & Fraud Investigation Dashboard</h1>
            <p className="text-xs text-slate-300">
              Monitor all registered distributors and retail shops. Remove fraudulent user accounts and review audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Total Registered Users</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {stats?.totalUsers || 0} Accounts
          </span>
          <span className="text-[11px] text-slate-400">
            {stats?.totalSellers || 0} Van Leads • {stats?.totalBuyers || 0} Shops • {stats?.totalAdmins || 0} Admins
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Total Rural Retail Stores</span>
          <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block">
            {stats?.totalShops || 0} Shops
          </span>
          <span className="text-[11px] text-slate-400">Connected to distribution routes</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">System Total Sales Volume</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            ₹{parseFloat(stats?.totalSalesVolume || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-slate-400">{stats?.totalInvoices || 0} wholesale bills generated</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Total Market Khata Credit</span>
          <span className="text-2xl font-bold font-mono text-red-600 mt-1 block">
            ₹{parseFloat(stats?.totalMarketCreditOutstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-slate-400">Active credit outstanding</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user name, phone number, shop, or village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                roleFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('ROLE_SELLER')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                roleFilter === 'ROLE_SELLER'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Van Distributors
            </button>
            <button
              onClick={() => setRoleFilter('ROLE_BUYER')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                roleFilter === 'ROLE_BUYER'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Village Shops
            </button>
            <button
              onClick={() => setRoleFilter('ROLE_ADMIN')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                roleFilter === 'ROLE_ADMIN'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Admins
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Associated Shop / Village</th>
                <th className="py-3 px-4 text-right">Khata Due</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-center">Fraud Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{user.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">User ID: #{user.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        user.role === 'ROLE_ADMIN'
                          ? 'bg-red-100 text-red-800'
                          : user.role === 'ROLE_SELLER'
                          ? 'bg-brand-100 text-brand-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {user.role.replace('ROLE_', '')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {user.phoneNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {user.shopName ? (
                        <div>
                          <span className="font-bold text-slate-900 block">{user.shopName}</span>
                          <span className="text-[11px] text-slate-500">{user.village} ({user.route})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No shop profile</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {user.shopOutstandingBalance !== null && user.shopOutstandingBalance !== undefined ? (
                        <span className={parseFloat(user.shopOutstandingBalance) > 0 ? "text-red-600" : "text-emerald-600"}>
                          ₹{parseFloat(user.shopOutstandingBalance).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {user.role === 'ROLE_ADMIN' ? (
                        <span className="text-[10px] text-slate-400 italic">Protected Admin</span>
                      ) : (
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold rounded-xl border border-red-200 hover:border-red-600 transition flex items-center gap-1 mx-auto text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Fraud
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deletingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-red-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Confirm Fraud User Removal</h3>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="text-red-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteUserSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-800 text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>You are deleting a user found guilty of fraud</span>
                </div>
                <div className="text-xs space-y-1 pt-1 border-t border-red-200">
                  <p><span className="font-semibold">User Name:</span> {deletingUser.fullName}</p>
                  <p><span className="font-semibold">Phone Number:</span> {deletingUser.phoneNumber}</p>
                  <p><span className="font-semibold">Role:</span> {deletingUser.role}</p>
                  {deletingUser.shopName && <p><span className="font-semibold">Shop:</span> {deletingUser.shopName} ({deletingUser.village})</p>}
                </div>
                <p className="text-[11px] text-red-700 pt-1 font-medium">
                  * This will permanently delete the user's account credentials and session access from the database. Financial bills will be decoupled for safety.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Fraud Removal *</label>
                <select
                  value={fraudReason}
                  onChange={(e) => setFraudReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                >
                  <option value="Fraudulent Billing / False Credit Claims">Fraudulent Billing / False Credit Claims</option>
                  <option value="Unrecorded Cash Collection / Theft">Unrecorded Cash Collection / Theft</option>
                  <option value="Counterfeit / Misrepresented Goods">Counterfeit / Misrepresented Goods</option>
                  <option value="Identity Theft / Fake Shop Registration">Identity Theft / Fake Shop Registration</option>
                  <option value="Repeated Non-Payment / Khata Default">Repeated Non-Payment / Khata Default</option>
                  <option value="Other Policy Violation">Other Policy Violation</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleteLoading ? 'Removing User...' : 'Permanently Delete User from DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

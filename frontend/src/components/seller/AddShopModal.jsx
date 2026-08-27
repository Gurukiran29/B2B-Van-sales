import React, { useState, useEffect } from 'react';
import { shopApi } from '../../services/api';
import { Store, X, MapPin, Navigation } from 'lucide-react';

const AddShopModal = ({ isOpen, onClose, onShopAdded, showNotification }) => {
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    phoneNumber: '',
    village: '',
    route: '',
    initialOutstandingBalance: 0,
    address: '',
    gstNumber: '',
  });
  const [existingVillages, setExistingVillages] = useState([]);
  const [existingRoutes, setExistingRoutes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    try {
      const [vRes, rRes] = await Promise.all([
        shopApi.getVillages(),
        shopApi.getRoutes(),
      ]);
      setExistingVillages(vRes.data || []);
      setExistingRoutes(rRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phoneNumber || formData.phoneNumber.length !== 10) {
      showNotification('Please enter a valid 10-digit phone number', 'warning');
      return;
    }
    if (!formData.village.trim()) {
      showNotification('Please enter the village / town name', 'warning');
      return;
    }
    if (!formData.route.trim()) {
      showNotification('Please enter the delivery route / zone name', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        shopName: formData.shopName.trim(),
        ownerName: formData.ownerName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        village: formData.village.trim(),
        route: formData.route.trim(),
        initialOutstandingBalance: parseFloat(formData.initialOutstandingBalance) || 0,
      };
      const res = await shopApi.create(payload);
      showNotification(`Shop "${formData.shopName}" registered successfully!`, 'success');
      if (onShopAdded) onShopAdded(res.data);
      setFormData({
        shopName: '',
        ownerName: '',
        phoneNumber: '',
        village: '',
        route: '',
        initialOutstandingBalance: 0,
        address: '',
        gstNumber: '',
      });
      onClose();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to add shop', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-brand-400" />
            <div>
              <h3 className="text-sm font-bold">Register New Village Retail Shop</h3>
              <p className="text-xs text-slate-400">Add any rural store to your van delivery route</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Shop / Store Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Balaji Kirana & General Store"
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Owner Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramprasad Yadav"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number (10 Digits) *</label>
              <input
                type="tel"
                required
                maxLength="10"
                placeholder="9876543210"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Village / Town *
              </label>
              <input
                type="text"
                required
                list="villages-datalist"
                placeholder="Type village name..."
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <datalist id="villages-datalist">
                {existingVillages.map((v, i) => (
                  <option key={i} value={v} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-slate-400" /> Delivery Route / Zone *
              </label>
              <input
                type="text"
                required
                list="routes-datalist"
                placeholder="e.g. Route 1 - Main Highway"
                value={formData.route}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <datalist id="routes-datalist">
                {existingRoutes.map((r, i) => (
                  <option key={i} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Previous Outstanding Credit / Khata Opening Balance (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.initialOutstandingBalance}
              onChange={(e) => setFormData({ ...formData, initialOutstandingBalance: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-[10px] text-slate-500">Leave 0 if this shop has no previous credit balance.</span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Address / Landmark / Location Details</label>
            <textarea
              rows="2"
              placeholder="e.g. Near Bus Stand, Main Market Chowk"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Saving Shop...' : 'Register Shop to Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShopModal;

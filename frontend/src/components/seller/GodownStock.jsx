import React, { useState, useEffect } from 'react';
import { productApi } from '../../services/api';
import { 
  Warehouse, Plus, Search, ArrowRight, Package, IndianRupee, 
  TrendingUp, RefreshCw, X, AlertCircle, Check, Truck, Tag
} from 'lucide-react';

const GodownStock = ({ showNotification, onNavigateToVan, onNavigateToItems }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Inward Purchase Modal
  const [inwardProduct, setInwardProduct] = useState(null);
  const [inwardBoxes, setInwardBoxes] = useState('');
  const [inwardLoose, setInwardLoose] = useState('');
  const [inwardLoading, setInwardLoading] = useState(false);

  // Transfer to Van Modal
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferBoxes, setTransferBoxes] = useState('');
  const [transferLoose, setTransferLoose] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    fetchGodownStock();
  }, []);

  const fetchGodownStock = async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load godown stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    if (!inwardProduct) return;

    const boxes = parseInt(inwardBoxes) || 0;
    const loose = parseInt(inwardLoose) || 0;
    if (boxes === 0 && loose === 0) {
      showNotification('Please enter boxes received from agency', 'warning');
      return;
    }

    setInwardLoading(true);
    try {
      await productApi.transferStock({
        productId: inwardProduct.id,
        boxes: boxes,
        looseDozens: loose,
        operation: 'GODOWN_INWARD',
      });

      showNotification(`Added ${boxes} boxes to Godown Stock for ${inwardProduct.name}!`, 'success');
      setInwardProduct(null);
      setInwardBoxes('');
      setInwardLoose('');
      fetchGodownStock();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to inward stock', 'error');
    } finally {
      setInwardLoading(false);
    }
  };

  const handleTransferToVanSubmit = async (e) => {
    e.preventDefault();
    if (!transferProduct) return;

    const dozensPerBox = transferProduct.dozensPerBox || 1;
    const boxes = parseInt(transferBoxes) || 0;
    const loose = parseInt(transferLoose) || 0;
    const totalTransferUnits = (boxes * dozensPerBox) + loose;

    if (totalTransferUnits <= 0) {
      showNotification('Please enter quantity to load into the delivery van', 'warning');
      return;
    }

    if (totalTransferUnits > transferProduct.godownStockInDozens) {
      showNotification(`Cannot transfer: Requested ${boxes} boxes exceeds available Godown stock (${transferProduct.godownFullBoxes} boxes)!`, 'warning');
      return;
    }

    setTransferLoading(true);
    try {
      await productApi.transferStock({
        productId: transferProduct.id,
        boxes: boxes,
        looseDozens: loose,
        operation: 'TRANSFER_TO_VAN',
      });

      showNotification(`Transferred ${boxes} boxes from Godown to Van Stock!`, 'success');
      setTransferProduct(null);
      setTransferBoxes('');
      setTransferLoose('');
      fetchGodownStock();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to transfer stock to van', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  const totalGodownBoxes = products.reduce((acc, p) => acc + (p.godownFullBoxes || 0), 0);
  const totalGodownValuation = products.reduce((acc, p) => {
    const costBox = parseFloat(p.purchasePricePerBox || 0);
    return acc + ((p.godownFullBoxes || 0) * costBox);
  }, 0);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
              <Warehouse className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black tracking-tight">Main Godown / Warehouse Inventory</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            This is your central warehouse stock. Inward stock purchases from agencies here, and load them into your delivery vans when starting your route.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchGodownStock}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Godown Stock</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
              {totalGodownBoxes} <span className="text-sm font-normal text-slate-500">Boxes</span>
            </span>
            <span className="text-[11px] text-slate-400">Stored in main warehouse</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Warehouse Stock Value</span>
            <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">
              ₹{totalGodownValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400">Based on agency purchase cost</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Active FMCG SKUs</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {products.length} <span className="text-sm font-normal text-slate-500">Products</span>
            </span>
            <span className="text-[11px] text-slate-400">Across {categories.length} categories</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search products in Godown..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Godown Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(p => {
          const isSingleBox = (!p.dozensPerBox || p.dozensPerBox === 1);
          return (
            <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-300 transition">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      {p.category} {isSingleBox ? '• Direct Box' : `• ${p.dozensPerBox} doz/box`}
                    </span>
                  </div>
                  <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    Godown
                  </span>
                </div>

                {/* Stock Count Badge */}
                <div className="mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                      Warehouse Stock
                    </span>
                    <span className="text-xl font-black font-mono text-slate-900">
                      {isSingleBox ? (
                        `${p.godownFullBoxes} Boxes`
                      ) : (
                        <>
                          {p.godownFullBoxes} <span className="text-xs font-normal text-slate-500">Boxes</span> + {p.godownRemainingLooseDozens} <span className="text-xs font-normal text-slate-500">Doz</span>
                        </>
                      )}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono bg-brand-100 text-brand-800 px-2.5 py-1 rounded-lg">
                    {p.godownFullBoxes} Box In Godown
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setInwardProduct(p);
                    setInwardBoxes('');
                    setInwardLoose('');
                  }}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Inward Stock
                </button>

                <button
                  disabled={p.godownStockInDozens <= 0}
                  onClick={() => {
                    setTransferProduct(p);
                    setTransferBoxes('');
                    setTransferLoose('');
                  }}
                  className="py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Truck className="w-3.5 h-3.5" /> Load Van
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inward Agency Purchase Modal */}
      {inwardProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Inward Agency Stock to Godown</h3>
                <p className="text-xs text-emerald-200">{inwardProduct.name}</p>
              </div>
              <button onClick={() => setInwardProduct(null)} className="text-emerald-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Current Godown Stock:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {inwardProduct.godownFullBoxes} Boxes
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">New Boxes Received *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5, 10, 20"
                  value={inwardBoxes}
                  onChange={(e) => setInwardBoxes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {inwardProduct.dozensPerBox > 1 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loose Dozens (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={inwardLoose}
                    onChange={(e) => setInwardLoose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setInwardProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inwardLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {inwardLoading ? 'Saving...' : 'Add to Godown Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer from Godown to Van Modal */}
      {transferProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Load Van from Godown Stock</h3>
                <p className="text-xs text-brand-300">{transferProduct.name}</p>
              </div>
              <button onClick={() => setTransferProduct(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferToVanSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-brand-50 p-3 rounded-xl border border-brand-100 flex justify-between items-center">
                <span className="text-slate-700 font-medium">Available in Godown:</span>
                <span className="font-mono font-bold text-brand-900 text-sm">
                  {transferProduct.godownFullBoxes} Boxes
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Boxes to Load into Van *</label>
                <input
                  type="number"
                  min="1"
                  max={transferProduct.godownFullBoxes}
                  required
                  placeholder="e.g. 2, 5"
                  value={transferBoxes}
                  onChange={(e) => setTransferBoxes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {transferProduct.dozensPerBox > 1 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loose Dozens (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={transferLoose}
                    onChange={(e) => setTransferLoose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <span>Quantity is deducted from Godown and added to your Van stock immediately.</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setTransferProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {transferLoading ? 'Transferring...' : 'Transfer to Van'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GodownStock;

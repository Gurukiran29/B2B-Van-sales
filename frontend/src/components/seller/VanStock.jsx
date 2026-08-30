import React, { useState, useEffect } from 'react';
import { productApi } from '../../services/api';
import { 
  Truck, Plus, Minus, Search, Package, ArrowLeft, ArrowRight,
  RefreshCw, Warehouse, X, AlertCircle, Zap
} from 'lucide-react';

const VanStock = ({ showNotification, onNavigateToPOS, onNavigateToGodown }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Load from Godown Modal
  const [loadingProduct, setLoadingProduct] = useState(null);
  const [loadBoxes, setLoadBoxes] = useState('');
  const [loadLoose, setLoadLoose] = useState('');
  const [loadSaving, setLoadSaving] = useState(false);

  // Unload to Godown Modal
  const [unloadingProduct, setUnloadingProduct] = useState(null);
  const [unloadBoxes, setUnloadBoxes] = useState('');
  const [unloadLoose, setUnloadLoose] = useState('');
  const [unloadSaving, setUnloadSaving] = useState(false);

  useEffect(() => {
    fetchVanStock();
  }, []);

  const fetchVanStock = async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load van stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadVanSubmit = async (e) => {
    e.preventDefault();
    if (!loadingProduct) return;

    const boxes = parseInt(loadBoxes) || 0;
    const loose = parseInt(loadLoose) || 0;
    const totalDoz = (boxes * loadingProduct.dozensPerBox) + loose;

    if (totalDoz <= 0) {
      showNotification('Please enter quantity to load into van', 'warning');
      return;
    }

    if (totalDoz > loadingProduct.godownStockInDozens) {
      showNotification(`Cannot load: Requested ${totalDoz} doz exceeds available Godown stock (${loadingProduct.godownStockInDozens} doz)!`, 'warning');
      return;
    }

    setLoadSaving(true);
    try {
      await productApi.transferStock({
        productId: loadingProduct.id,
        boxes: boxes,
        looseDozens: loose,
        operation: 'TRANSFER_TO_VAN',
      });

      showNotification(`Loaded ${boxes} boxes & ${loose} dozens into the Van!`, 'success');
      setLoadingProduct(null);
      setLoadBoxes('');
      setLoadLoose('');
      fetchVanStock();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to load van stock', 'error');
    } finally {
      setLoadSaving(false);
    }
  };

  const handleUnloadVanSubmit = async (e) => {
    e.preventDefault();
    if (!unloadingProduct) return;

    const boxes = parseInt(unloadBoxes) || 0;
    const loose = parseInt(unloadLoose) || 0;
    const totalDoz = (boxes * unloadingProduct.dozensPerBox) + loose;

    if (totalDoz <= 0) {
      showNotification('Please enter quantity to return to godown', 'warning');
      return;
    }

    if (totalDoz > unloadingProduct.stockInDozens) {
      showNotification(`Cannot unload: Requested ${totalDoz} doz exceeds current Van stock (${unloadingProduct.stockInDozens} doz)!`, 'warning');
      return;
    }

    setUnloadSaving(true);
    try {
      await productApi.transferStock({
        productId: unloadingProduct.id,
        boxes: boxes,
        looseDozens: loose,
        operation: 'UNLOAD_TO_GODOWN',
      });

      showNotification(`Returned ${boxes} boxes & ${loose} dozens back to Godown!`, 'success');
      setUnloadingProduct(null);
      setUnloadBoxes('');
      setUnloadLoose('');
      fetchVanStock();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to return van stock', 'error');
    } finally {
      setUnloadSaving(false);
    }
  };

  const totalVanDozens = products.reduce((acc, p) => acc + (p.stockInDozens || 0), 0);
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Total Van Stock Loaded</span>
            <span className="text-2xl font-bold font-mono text-brand-400 mt-1 block">
              {totalVanDozens} Dozens
            </span>
            <span className="text-[11px] text-slate-400">Ready for route billing & delivery</span>
          </div>
          <div className="p-3 bg-brand-500/20 text-brand-400 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Van Loaded SKUs</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {products.filter(p => (p.stockInDozens || 0) > 0).length} <span className="text-sm font-normal text-slate-500">/ {products.length} Items</span>
            </span>
            <span className="text-[11px] text-slate-400">Products currently inside van</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Quick Action</span>
            <button
              onClick={onNavigateToPOS}
              className="mt-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              <Zap className="w-4 h-4" /> Start Quick POS Bill
            </button>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search products in van..."
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

      {/* Van Stock Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(p => (
          <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                  <span className="text-[11px] text-slate-500">{p.category} • {p.dozensPerBox} doz/box</span>
                </div>
                <span className="bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  Van Stock
                </span>
              </div>

              {/* Van Stock Count */}
              <div className="mt-4 bg-brand-50/50 p-3 rounded-xl border border-brand-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                    Inside Van
                  </span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {p.vanFullBoxes} <span className="text-xs font-normal text-slate-500">Boxes</span> + {p.vanRemainingLooseDozens} <span className="text-xs font-normal text-slate-500">Doz</span>
                  </span>
                </div>
                <span className="text-xs font-bold font-mono bg-brand-600 text-white px-2.5 py-1 rounded-lg">
                  {p.stockInDozens} Doz
                </span>
              </div>

              <div className="mt-2 text-[11px] text-slate-500 flex justify-between px-1">
                <span>Available in Godown:</span>
                <span className="font-mono font-bold text-slate-700">{p.godownFullBoxes}b + {p.godownRemainingLooseDozens}d ({p.godownStockInDozens} doz)</span>
              </div>
            </div>

            {/* Actions: Load from Godown / Unload */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <button
                disabled={p.godownStockInDozens <= 0}
                onClick={() => {
                  setLoadingProduct(p);
                  setLoadBoxes('');
                  setLoadLoose('');
                }}
                className="py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Load from Godown
              </button>

              <button
                disabled={p.stockInDozens <= 0}
                onClick={() => {
                  setUnloadingProduct(p);
                  setUnloadBoxes('');
                  setUnloadLoose('');
                }}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Godown
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load from Godown Modal */}
      {loadingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Load Stock into Delivery Van</h3>
                <p className="text-xs text-brand-300">{loadingProduct.name} ({loadingProduct.dozensPerBox} doz/box)</p>
              </div>
              <button onClick={() => setLoadingProduct(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLoadVanSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-brand-50 p-3 rounded-xl border border-brand-100 flex justify-between items-center">
                <span className="text-slate-700 font-medium">Available in Godown:</span>
                <span className="font-mono font-bold text-brand-900 text-sm">
                  {loadingProduct.godownFullBoxes} Boxes + {loadingProduct.godownRemainingLooseDozens} Doz ({loadingProduct.godownStockInDozens} doz)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Boxes to Load *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={loadBoxes}
                    onChange={(e) => setLoadBoxes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loose Dozens</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={loadLoose}
                    onChange={(e) => setLoadLoose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <span className="text-[10px] text-slate-500 block">
                Stock is subtracted from Godown and added to your Van. Cannot load more than available in Godown.
              </span>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setLoadingProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadSaving}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {loadSaving ? 'Transferring...' : 'Load into Van'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return to Godown Modal */}
      {unloadingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Return Van Stock to Godown</h3>
                <p className="text-xs text-brand-300">{unloadingProduct.name}</p>
              </div>
              <button onClick={() => setUnloadingProduct(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUnloadVanSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-700 font-medium">Currently in Van:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {unloadingProduct.vanFullBoxes} Boxes + {unloadingProduct.vanRemainingLooseDozens} Doz ({unloadingProduct.stockInDozens} doz)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Boxes to Unload *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={unloadBoxes}
                    onChange={(e) => setUnloadBoxes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loose Dozens</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={unloadLoose}
                    onChange={(e) => setUnloadLoose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setUnloadingProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unloadSaving}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {unloadSaving ? 'Unloading...' : 'Return to Godown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VanStock;

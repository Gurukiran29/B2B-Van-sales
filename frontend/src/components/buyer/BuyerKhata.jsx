import React, { useState, useEffect } from 'react';
import { shopApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, FileText, QrCode, X 
} from 'lucide-react';
import ReceiptModal from '../common/ReceiptModal';

const BuyerKhata = ({ showNotification }) => {
  const { user } = useAuth();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showUpiModal, setShowUpiModal] = useState(false);

  useEffect(() => {
    if (user?.shopId) {
      fetchStatement();
    }
  }, [user]);

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const res = await shopApi.getStatement(user.shopId);
      setStatement(res.data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load your Khata statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.shopId) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
        <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2" />
        <p className="font-bold text-slate-800">No Shop Linked</p>
        <p className="text-xs">Your account is not associated with a registered shop profile.</p>
      </div>
    );
  }

  const balance = statement ? parseFloat(statement.currentOutstandingBalance || 0) : 0;
  const hasDue = balance > 0;

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-6 shadow-md border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        hasDue
          ? 'bg-gradient-to-r from-slate-900 to-red-950 text-white border-red-900/50'
          : 'bg-gradient-to-r from-slate-900 to-emerald-950 text-white border-emerald-900/50'
      }`}>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Digital Ledger (Khata) Account
          </span>
          <h2 className="text-xl font-bold mt-0.5">{user.shopName}</h2>
          <p className="text-xs text-slate-300">Owner: {user.fullName} • {user.village} ({user.route})</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-left sm:text-right">
            <span className="text-[11px] text-slate-300 block font-medium">Your Outstanding Balance</span>
            <span className={`text-2xl font-bold font-mono block ${hasDue ? 'text-amber-400' : 'text-emerald-400'}`}>
              ₹{balance.toFixed(2)}
            </span>
          </div>

          {hasDue && (
            <button
              onClick={() => setShowUpiModal(true)}
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" /> Pay via UPI / QR
            </button>
          )}
        </div>
      </div>

      {statement && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 block">Total Lifetime Purchases</span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
              ₹{parseFloat(statement.totalBilledAmount || 0).toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400">{statement.invoices?.length || 0} total invoices</span>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 block">Total Repayments Made</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
              ₹{parseFloat(statement.totalPaidAmount || 0).toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400">Cash & UPI settlements combined</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5">
        <h3 className="text-sm font-bold text-slate-900">Your Invoices & Bill Receipts</h3>
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Bill Amount</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Added to Khata</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">View Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading invoices...</td>
                </tr>
              ) : statement?.invoices?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">No invoices generated yet.</td>
                </tr>
              ) : (
                statement?.invoices?.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(inv.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{parseFloat(inv.totalAmount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700">
                      ₹{parseFloat(inv.amountPaid).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-600 font-bold">
                      ₹{parseFloat(inv.balanceDue).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
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
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedReceipt(inv)}
                        className="px-2.5 py-1 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition"
                      >
                        View Bill
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5">
        <h3 className="text-sm font-bold text-slate-900">Weekly Payment Settlements</h3>
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Collected By</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Previous Balance</th>
                <th className="py-3 px-4 text-right">Remaining Balance</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400">Loading payment history...</td>
                </tr>
              ) : statement?.payments?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400">No payment settlements recorded yet.</td>
                </tr>
              ) : (
                statement?.payments?.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(pay.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{pay.recordedByName}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {pay.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ₹{parseFloat(pay.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      ₹{parseFloat(pay.previousBalance).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{parseFloat(pay.remainingBalance).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{pay.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUpiModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 text-center p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Direct Distributor UPI Pay</h3>
              <button onClick={() => setShowUpiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block mx-auto">
              <div className="w-44 h-44 bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col items-center justify-center space-y-2">
                <QrCode className="w-28 h-28 text-slate-900" />
                <span className="text-[10px] font-mono text-slate-500 font-bold">UPI ID: vansales@okhdfcbank</span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-800">Scan using PhonePe, GPay, or Paytm</p>
              <p className="text-slate-500 text-[11px]">
                Paying amount: <strong className="text-slate-900 font-mono text-sm">₹{balance.toFixed(2)}</strong>
              </p>
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-2">
                * When paying via UPI, please inform the van driver so they can log the transaction in your ledger.
              </p>
            </div>

            <button
              onClick={() => setShowUpiModal(false)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <ReceiptModal
          invoice={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default BuyerKhata;

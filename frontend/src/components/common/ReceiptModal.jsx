import React from 'react';
import { Printer, Share2, X, CheckCircle, Truck, MapPin, Phone, Calendar } from 'lucide-react';

const ReceiptModal = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const itemsText = invoice.items
      ?.map((item, idx) => `${idx + 1}. ${item.productName} - ${item.boxesCount} Box + ${item.looseDozens} Doz (${item.totalDozens} doz total) @ ₹${item.pricePerDozen}/doz = ₹${item.subtotal}`)
      .join('\n');

    const message = `*VAN SALES WHOLESALE INVOICE*\n` +
      `--------------------------------\n` +
      `*Invoice No:* ${invoice.invoiceNumber}\n` +
      `*Date:* ${new Date(invoice.createdAt).toLocaleString('en-IN')}\n` +
      `*Shop:* ${invoice.shopName} (${invoice.village})\n` +
      `*Owner:* ${invoice.ownerName} (${invoice.shopPhoneNumber || ''})\n` +
      `--------------------------------\n` +
      `*Items:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `*Total Bill:* ₹${invoice.totalAmount}\n` +
      `*Amount Paid:* ₹${invoice.amountPaid} (${invoice.paymentMode})\n` +
      `*Balance Due (Added to Khata):* ₹${invoice.balanceDue}\n` +
      `*Current Total Khata Balance:* ₹${invoice.shopNewBalance || invoice.balanceDue}\n` +
      `--------------------------------\n` +
      `Thank you for your business!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Invoice Generated Successfully</h3>
              <p className="text-xs text-slate-400 font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div id="printable-receipt" className="p-6 sm:p-8 bg-white text-slate-800">
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-6 h-6 text-brand-600" />
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  FMCG Van Distribution
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Daily Direct Wholesale & Van Sales</p>
              <p className="text-xs text-slate-500">Distributor: {invoice.sellerName || 'Van Sales Lead'}</p>
            </div>
            <div className="text-right">
              <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                invoice.paymentStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : invoice.paymentStatus === 'PARTIAL'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {invoice.paymentStatus}
              </span>
              <p className="text-xs font-mono font-bold text-slate-900 mt-1">{invoice.invoiceNumber}</p>
              <p className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Billed To (Retail Shop):</span>
                <span className="text-sm font-bold text-slate-900 block">{invoice.shopName}</span>
                <span className="text-slate-600 block">Owner: {invoice.ownerName}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-500 font-medium block">Route & Village:</span>
                <span className="text-slate-800 font-semibold flex items-center sm:justify-end gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {invoice.village} ({invoice.route})
                </span>
                {invoice.shopPhoneNumber && (
                  <span className="text-slate-600 flex items-center sm:justify-end gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" /> {invoice.shopPhoneNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Packaging (Boxes + Loose)</th>
                  <th className="py-2.5 px-3 text-center">Total Dozens</th>
                  <th className="py-2.5 px-3 text-right">Rate / Doz</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      <span className="font-medium text-brand-700">{item.boxesCount} Box</span>
                      {item.looseDozens > 0 && (
                        <span className="text-slate-500 ml-1">+ {item.looseDozens} Doz</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                      {item.totalDozens} doz
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ₹{parseFloat(item.pricePerDozen).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{parseFloat(item.subtotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
            <div className="text-xs text-slate-600 space-y-1">
              <p><span className="font-medium">Payment Mode:</span> <strong className="text-slate-900 uppercase">{invoice.paymentMode}</strong></p>
              {invoice.notes && <p><span className="font-medium">Notes:</span> {invoice.notes}</p>}
              <p className="text-[11px] text-slate-500 pt-2 italic">
                * Stock deducted from van inventory in real-time.
              </p>
            </div>
            <div className="min-w-[240px] space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Total Bill Amount:</span>
                <span className="font-bold text-sm text-slate-900 font-mono">₹{parseFloat(invoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Amount Paid Now:</span>
                <span className="font-bold font-mono">- ₹{parseFloat(invoice.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-700 font-bold border-t border-slate-300 pt-1.5">
                <span>Balance Due (Khata Credit):</span>
                <span className="font-mono text-sm">₹{parseFloat(invoice.balanceDue).toFixed(2)}</span>
              </div>
              {invoice.shopNewBalance !== undefined && (
                <div className="flex justify-between bg-amber-50 p-2 rounded-lg border border-amber-200 font-bold text-amber-900 text-xs mt-2">
                  <span>Updated Total Shop Khata:</span>
                  <span className="font-mono">₹{parseFloat(invoice.shopNewBalance).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-200/60 rounded-xl border border-slate-300 transition"
          >
            Close Receipt
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" /> Share on WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;

import React, { useState, useRef } from 'react';
import { 
  Printer, Share2, X, CheckCircle, Truck, MapPin, Phone, Calendar, 
  Download, Image as ImageIcon, FileText, Check
} from 'lucide-react';

const formatIST = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const ReceiptModal = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const [printFormat, setPrintFormat] = useState('58mm'); // '58mm' or 'standard'
  const [sharingImage, setSharingImage] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const canvasRef = useRef(null);

  // 1. Generate High-Res Image of the Invoice on Canvas
  const generateReceiptCanvas = async () => {
    const canvas = document.createElement('canvas');
    const width = 600;
    const items = invoice.items || [];
    
    // Dynamic height calculation
    const baseHeight = 520;
    const itemHeight = 36;
    const height = baseHeight + (items.length * itemHeight);
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Header Band
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, 90);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('FMCG VAN SALES & WHOLESALE', 25, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Daily Direct Distribution • Cash & Digital Khata Invoice', 25, 65);

    // Invoice Number Badge
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 14px monospace';
    const statusText = (invoice.paymentStatus || 'PAID').toUpperCase();
    ctx.fillText(`[ ${statusText} ]  ${invoice.invoiceNumber}`, width - 260, 45);

    // Date & Time (IST)
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(formatIST(invoice.createdAt || Date.now()), width - 260, 68);

    // Shop Info Box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(20, 105, width - 40, 75);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(20, 105, width - 40, 75);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(invoice.shopName || 'Retail Shop', 35, 130);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Owner: ${invoice.ownerName || 'N/A'} • Phone: ${invoice.shopPhoneNumber || 'N/A'}`, 35, 150);
    ctx.fillText(`Route: ${invoice.route || 'Route 1'} • Village: ${invoice.village || 'N/A'}`, 35, 168);

    // Items Table Header
    let currentY = 205;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(20, currentY, width - 40, 28);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(20, currentY, width - 40, 28);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('#  ITEM NAME', 30, currentY + 19);
    ctx.fillText('PACKAGING', 280, currentY + 19);
    ctx.fillText('RATE/DOZ', 420, currentY + 19);
    ctx.fillText('SUBTOTAL', 500, currentY + 19);

    // Items Rows
    currentY += 32;
    ctx.font = '12px system-ui, -apple-system, sans-serif';

    items.forEach((item, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(20, currentY - 14, width - 40, itemHeight);
      ctx.strokeStyle = '#f1f5f9';
      ctx.strokeRect(20, currentY - 14, width - 40, itemHeight);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      const name = item.productName && item.productName.length > 25 ? item.productName.substring(0, 23) + '..' : (item.productName || 'Item');
      ctx.fillText(`${idx + 1}. ${name}`, 30, currentY + 10);

      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#475569';
      const pkg = `${item.boxesCount || 0} Box` + (item.looseDozens > 0 ? ` + ${item.looseDozens}d` : '');
      ctx.fillText(pkg, 280, currentY + 10);

      ctx.fillText(`₹${parseFloat(item.pricePerDozen || 0).toFixed(2)}`, 420, currentY + 10);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`₹${parseFloat(item.subtotal || 0).toFixed(2)}`, 500, currentY + 10);

      currentY += itemHeight;
    });

    // Summary Box
    currentY += 15;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(20, currentY, width - 40, 115);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(20, currentY, width - 40, 115);

    ctx.fillStyle = '#334155';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Total Bill Amount:', 40, currentY + 30);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`₹${parseFloat(invoice.totalAmount || 0).toFixed(2)}`, 220, currentY + 30);

    ctx.fillStyle = '#16a34a';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Amount Paid (${invoice.paymentMode || 'CASH'}):`, 40, currentY + 60);
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`₹${parseFloat(invoice.amountPaid || 0).toFixed(2)}`, 220, currentY + 60);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText('Khata Balance Due:', 40, currentY + 95);
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`₹${parseFloat(invoice.balanceDue || 0).toFixed(2)}`, 220, currentY + 95);

    // Right Side: Total Updated Khata
    if (invoice.shopNewBalance !== undefined) {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(width - 240, currentY + 15, 200, 85);
      ctx.strokeStyle = '#fde68a';
      ctx.strokeRect(width - 240, currentY + 15, 200, 85);

      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('TOTAL SHOP KHATA DUE:', width - 225, currentY + 45);
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`₹${parseFloat(invoice.shopNewBalance || 0).toFixed(2)}`, width - 225, currentY + 75);
    }

    // Footer
    currentY += 135;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Generated via Van Sales Khata App • Thank You for Your Business!', width / 2 - 170, currentY);

    return canvas;
  };

  // 2. Share Image directly to WhatsApp via Web Share API
  const handleShareImageWhatsApp = async () => {
    setSharingImage(true);
    try {
      const canvas = await generateReceiptCanvas();
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          fallbackTextWhatsApp();
          setSharingImage(false);
          return;
        }

        const fileName = `Bill-${invoice.invoiceNumber}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        // Web Share API Level 2 (Supported on Android Chrome, iOS Safari)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Invoice ${invoice.invoiceNumber}`,
              text: `Wholesale Bill for ${invoice.shopName} - Total: ₹${invoice.totalAmount}`,
              files: [file]
            });
            setSharingImage(false);
            return;
          } catch (shareErr) {
            if (shareErr.name !== 'AbortError') {
              console.warn('Share error, falling back:', shareErr);
            } else {
              setSharingImage(false);
              return;
            }
          }
        }

        // Desktop Fallback: Download Image + Open WhatsApp Web
        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);

        fallbackTextWhatsApp();
        setSharingImage(false);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      fallbackTextWhatsApp();
      setSharingImage(false);
    }
  };

  // 3. Download Image Only
  const handleDownloadImage = async () => {
    setDownloadingImage(true);
    try {
      const canvas = await generateReceiptCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `Invoice-${invoice.invoiceNumber}.png`;
          const link = document.createElement('a');
          link.download = fileName;
          link.href = URL.createObjectURL(blob);
          link.click();
          URL.revokeObjectURL(link.href);
        }
        setDownloadingImage(false);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setDownloadingImage(false);
    }
  };

  // Text WhatsApp fallback
  const fallbackTextWhatsApp = () => {
    const itemsText = invoice.items
      ?.map((item, idx) => `${idx + 1}. ${item.productName} - ${item.boxesCount}b ${item.looseDozens > 0 ? '+ ' + item.looseDozens + 'd' : ''} = ₹${item.subtotal}`)
      .join('\n');

    const message = `*VAN SALES WHOLESALE INVOICE*\n` +
      `--------------------------------\n` +
      `*Invoice No:* ${invoice.invoiceNumber}\n` +
      `*Date:* ${formatIST(invoice.createdAt || Date.now())}\n` +
      `*Shop:* ${invoice.shopName} (${invoice.village})\n` +
      `*Owner:* ${invoice.ownerName} (${invoice.shopPhoneNumber || ''})\n` +
      `--------------------------------\n` +
      `*Items:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `*Total Bill:* ₹${invoice.totalAmount}\n` +
      `*Amount Paid:* ₹${invoice.amountPaid} (${invoice.paymentMode})\n` +
      `*Balance Due:* ₹${invoice.balanceDue}\n` +
      `*Total Khata Balance:* ₹${invoice.shopNewBalance || invoice.balanceDue}\n` +
      `--------------------------------\n` +
      `Thank you for your business!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // 4. Print Execution (58mm Thermal vs Standard)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* 58mm Thermal CSS Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${printFormat === '58mm' ? '58mm auto' : 'auto'};
            margin: ${printFormat === '58mm' ? '0' : '10mm'};
          }
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          ${printFormat === '58mm' ? `
            #thermal-print-area, #thermal-print-area * {
              visibility: visible !important;
            }
            #thermal-print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 58mm !important;
              max-width: 58mm !important;
              padding: 2mm !important;
              margin: 0 !important;
              background: #fff !important;
              color: #000 !important;
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 11px !important;
              line-height: 1.2 !important;
            }
            #standard-print-area {
              display: none !important;
            }
          ` : `
            #standard-print-area, #standard-print-area * {
              visibility: visible !important;
            }
            #standard-print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
            }
            #thermal-print-area {
              display: none !important;
            }
          `}
        }
      `}} />

      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Invoice #{invoice.invoiceNumber}</h3>
              <p className="text-xs text-slate-400 font-mono">IST Date: {formatIST(invoice.createdAt || Date.now())}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Print Format Selector Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>Printer Size:</span>
            <button
              onClick={() => setPrintFormat('58mm')}
              className={`px-3 py-1 rounded-lg border font-mono text-xs transition ${
                printFormat === '58mm'
                  ? 'bg-slate-900 text-white border-slate-900 font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              🖨️ 58mm Thermal (Mini Bus Printer)
            </button>
            <button
              onClick={() => setPrintFormat('standard')}
              className={`px-3 py-1 rounded-lg border font-mono text-xs transition ${
                printFormat === 'standard'
                  ? 'bg-slate-900 text-white border-slate-900 font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              📄 Standard Full Page
            </button>
          </div>

          <button
            onClick={handleDownloadImage}
            disabled={downloadingImage}
            className="text-xs text-brand-700 hover:text-brand-900 font-bold flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingImage ? 'Generating...' : 'Save Bill as Image'}
          </button>
        </div>

        {/* Visual Preview Area (Standard View) */}
        <div id="standard-print-area" className="p-6 sm:p-8 bg-white text-slate-800">
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
                {formatIST(invoice.createdAt || Date.now())}
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
                      <span className="font-medium text-brand-700">{item.boxesCount || 0} Box</span>
                      {item.looseDozens > 0 && (
                        <span className="text-slate-500 ml-1">+ {item.looseDozens} Doz</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                      {item.totalDozens || 0} doz
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ₹{parseFloat(item.pricePerDozen || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{parseFloat(item.subtotal || 0).toFixed(2)}
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
                <span className="font-bold text-sm text-slate-900 font-mono">₹{parseFloat(invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Amount Paid Now:</span>
                <span className="font-bold font-mono">- ₹{parseFloat(invoice.amountPaid || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-700 font-bold border-t border-slate-300 pt-1.5">
                <span>Balance Due (Khata Credit):</span>
                <span className="font-mono text-sm">₹{parseFloat(invoice.balanceDue || 0).toFixed(2)}</span>
              </div>
              {invoice.shopNewBalance !== undefined && (
                <div className="flex justify-between bg-amber-50 p-2 rounded-lg border border-amber-200 font-bold text-amber-900 text-xs mt-2">
                  <span>Updated Total Shop Khata:</span>
                  <span className="font-mono">₹{parseFloat(invoice.shopNewBalance || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 58mm Thermal Printable Layout (Hidden on Screen, Visible on Print) */}
        <div id="thermal-print-area" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>FMCG VAN SALES</div>
            <div style={{ fontSize: '10px' }}>Daily Wholesale Distribution</div>
            <div>================================</div>
          </div>

          <div style={{ fontSize: '10px', marginBottom: '4px' }}>
            <div><strong>Inv:</strong> {invoice.invoiceNumber}</div>
            <div><strong>Date:</strong> {formatIST(invoice.createdAt || Date.now())}</div>
            <div><strong>Shop:</strong> {invoice.shopName}</div>
            <div><strong>Vill:</strong> {invoice.village} ({invoice.route})</div>
            <div><strong>Owner:</strong> {invoice.ownerName} ({invoice.shopPhoneNumber || ''})</div>
          </div>

          <div>--------------------------------</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px' }}>
            <span>ITEM</span>
            <span>QTY</span>
            <span>AMT</span>
          </div>
          <div>--------------------------------</div>

          {invoice.items?.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '3px', fontSize: '10px' }}>
              <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.boxesCount || 0}b {item.looseDozens > 0 ? `+${item.looseDozens}d` : ''}</span>
                <span>@{parseFloat(item.pricePerDozen || 0).toFixed(0)}/d</span>
                <span style={{ fontWeight: 'bold' }}>Rs.{parseFloat(item.subtotal || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}

          <div>--------------------------------</div>
          <div style={{ fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>TOTAL BILL:</span>
              <span>Rs.{parseFloat(invoice.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000' }}>
              <span>PAID ({invoice.paymentMode || 'CASH'}):</span>
              <span>Rs.{parseFloat(invoice.amountPaid || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>BILL CREDIT DUE:</span>
              <span>Rs.{parseFloat(invoice.balanceDue || 0).toFixed(2)}</span>
            </div>
            {invoice.shopNewBalance !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '3px', borderTop: '1px dashed #000', paddingTop: '2px' }}>
                <span>TOTAL SHOP KHATA:</span>
                <span>Rs.{parseFloat(invoice.shopNewBalance || 0).toFixed(2)}</span>
              </div>
            )}
          </div>
          <div>================================</div>
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
            <div>* THANK YOU! VISIT AGAIN *</div>
            <div>Van Sales Distribution</div>
          </div>
        </div>

        {/* Footer Actions Bar */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-200/60 rounded-xl border border-slate-300 transition"
          >
            Close Receipt
          </button>

          <div className="flex items-center gap-2">
            {/* WhatsApp Share Button (Shares actual Image on phone, with download/text fallback) */}
            <button
              onClick={handleShareImageWhatsApp}
              disabled={sharingImage}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              title="Share Bill Image to WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              {sharingImage ? 'Preparing Image...' : 'Share Bill on WhatsApp (Image)'}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              {printFormat === '58mm' ? 'Print 58mm Thermal' : 'Print Full Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;

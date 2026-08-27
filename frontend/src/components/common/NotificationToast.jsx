import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const NotificationToast = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-slate-800 text-white',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 flex-shrink-0" />,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-md">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border border-white/20 ${bgColors[type] || bgColors.info}`}>
        {icons[type] || icons.info}
        <p className="text-xs font-semibold flex-1 leading-snug">{message}</p>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;

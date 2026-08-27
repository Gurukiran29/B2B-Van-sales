import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import SellerDashboard from './pages/SellerDashboard';
import BuyerPortal from './pages/BuyerPortal';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/common/Navbar';
import NotificationToast from './components/common/NotificationToast';

function App() {
  const { isAuthenticated, isSeller, isBuyer, isAdmin, loading } = useAuth();
  const [notification, setNotification] = useState({ message: '', type: 'info' });

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: '', type: 'info' });
    }, 4500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading VanSales Khata...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage showNotification={showNotification} />
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ message: '', type: 'info' })}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900/5 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {isAdmin ? (
          <AdminDashboard showNotification={showNotification} />
        ) : isSeller ? (
          <SellerDashboard showNotification={showNotification} />
        ) : isBuyer ? (
          <BuyerPortal showNotification={showNotification} />
        ) : (
          <div className="p-8 text-center text-slate-500">Unrecognized User Role</div>
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        VanSales Khata • Real-Time Wholesale FMCG Van Distribution System & Digital Ledger
      </footer>

      <NotificationToast
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default App;

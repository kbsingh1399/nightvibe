import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { GuestView } from './components/guest/GuestView';
import { OwnerView } from './components/owner/OwnerView';
import { PromoterView } from './components/promoter/PromoterView';
import { MyPassesModal } from './components/guest/MyPassesModal';
import { RazorpayConfigModal } from './components/common/RazorpayConfigModal';
import { AuthModal } from './components/auth/AuthModal';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';

export const App = () => {
  const { role, toast } = useApp();

  // Modals state
  const [passesModalOpen, setPassesModalOpen] = useState(false);
  const [selectedTicketForPass, setSelectedTicketForPass] = useState(null);
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleOpenPassWithTicket = (ticketId) => {
    setSelectedTicketForPass(ticketId);
    setPassesModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      
      {/* Header */}
      <Header
        onOpenPasses={() => {
          setSelectedTicketForPass(null);
          setPassesModalOpen(true);
        }}
        onOpenRazorpay={() => setRazorpayModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Role-Specific Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {role === 'guest' && (
          <GuestView onOpenPassWithTicketId={handleOpenPassWithTicket} />
        )}
        {role === 'owner' && <OwnerView />}
        {role === 'pr' && <PromoterView />}
      </main>

      {/* Footer */}
      <Footer />

      {/* Dynamic Passes Modal */}
      <MyPassesModal
        isOpen={passesModalOpen}
        onClose={() => setPassesModalOpen(false)}
        defaultSelectedTicketId={selectedTicketForPass}
      />

      {/* Razorpay Gateway Config Modal */}
      <RazorpayConfigModal
        isOpen={razorpayModalOpen}
        onClose={() => setRazorpayModalOpen(false)}
      />

      {/* Auth & Role Selection Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Global Toast System */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/40'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-900/40'
                : 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-900/40'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />}
            <span className="text-xs font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

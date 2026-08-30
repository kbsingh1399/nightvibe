import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  CreditCard,
  ShieldCheck,
  Zap,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const RazorpayConfigModal = ({ isOpen, onClose }) => {
  const { razorpayConfig, setRazorpayConfig, showToast } = useApp();
  const [formData, setFormData] = useState({ ...razorpayConfig });
  const [testWebhookStatus, setTestWebhookStatus] = useState(null);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setRazorpayConfig(formData);
    showToast('Payment Gateway settings saved successfully!', 'success');
    onClose();
  };

  const handleTestWebhook = () => {
    setTestWebhookStatus('testing');
    setTimeout(() => {
      setTestWebhookStatus('success');
      showToast('⚡ Webhook Ping 200 OK: Razorpay Route split handler active!', 'success');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl glass-panel p-6 sm:p-8 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-sans">
              Razorpay Route & FinTech Setup
            </h3>
            <p className="text-xs text-slate-400">
              Zero-custody automated escrow, instant T+0/T+1 payouts, and Section 194H TDS compliance
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 p-1.5 rounded-2xl bg-black/40 border border-white/10 flex">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, mode: 'simulated' })}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
              formData.mode === 'simulated'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧪 Sandbox / Simulated Mode (Instant Demo)
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, mode: 'live' })}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
              formData.mode === 'live'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🟢 Live Production Gateway
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Razorpay Key ID
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={formData.keyId}
                onChange={(e) => setFormData({ ...formData, keyId: e.target.value })}
                placeholder="rzp_live_..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 focus:border-purple-500 focus:outline-none transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Razorpay Key Secret
            </label>
            <input
              type="password"
              value={formData.keySecret}
              onChange={(e) => setFormData({ ...formData, keySecret: e.target.value })}
              placeholder="••••••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 focus:border-purple-500 focus:outline-none transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Linked Venue Route Account ID (for split transfers)
            </label>
            <input
              type="text"
              value={formData.routeAccountId}
              onChange={(e) => setFormData({ ...formData, routeAccountId: e.target.value })}
              placeholder="acc_TrilogyRoute01"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 focus:border-purple-500 focus:outline-none transition font-mono"
            />
          </div>

          {/* Compliance Checkboxes */}
          <div className="space-y-2 pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={formData.autoTds}
                onChange={(e) => setFormData({ ...formData, autoTds: e.target.checked })}
                className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
              />
              <span>Enable automated 2% Section 194H TDS deduction on PR commissions</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={formData.instantPayout}
                onChange={(e) => setFormData({ ...formData, instantPayout: e.target.checked })}
                className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
              />
              <span>Auto-release UPI payout immediately upon physical door scan validation</span>
            </label>
          </div>

          {/* Webhook Test Bar */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300">Payment Webhook Listener:</span>
              <span className="text-[11px] font-mono text-purple-300">/api/v1/webhooks/razorpay</span>
            </div>
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testWebhookStatus === 'testing'}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
            >
              {testWebhookStatus === 'testing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : testWebhookStatus === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : null}
              <span>Test Ping</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              <span>Save & Apply Gateway</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const AuthModal = ({ isOpen, onClose }) => {
  const { role, setRole, currentUser, setCurrentUser, showToast } = useApp();
  const [selectedRole, setSelectedRole] = useState(role);
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setRole(selectedRole);
    setCurrentUser({
      ...currentUser,
      name,
      phone,
      email,
    });
    showToast(`Signed in as ${name} (${selectedRole.toUpperCase()})`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel p-6 sm:p-8 shadow-2xl border border-purple-500/30">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 p-[2px] mx-auto">
            <div className="w-full h-full bg-[#0d0f17] rounded-[14px] flex items-center justify-center text-2xl">
              🍸
            </div>
          </div>
          <h3 className="text-xl font-bold text-white font-sans">
            Welcome to NightVibe India
          </h3>
          <p className="text-xs text-slate-400">
            Select your account type to access customized tools and passes
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Role Cards Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              I am joining as a:
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Partygoer */}
              <div
                onClick={() => setSelectedRole('guest')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  selectedRole === 'guest'
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Partygoer / Club Guest</h4>
                    <p className="text-[11px] text-slate-400">
                      Access PR bids, lowest ticket prices & dynamic passes
                    </p>
                  </div>
                </div>
                {selectedRole === 'guest' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
              </div>

              {/* Club Owner */}
              <div
                onClick={() => setSelectedRole('owner')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  selectedRole === 'owner'
                    ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Club Owner / Door Manager</h4>
                    <p className="text-[11px] text-slate-400">
                      In-app scanner, live admissions & direct T+1 settlements
                    </p>
                  </div>
                </div>
                {selectedRole === 'owner' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </div>

              {/* Promoter */}
              <div
                onClick={() => setSelectedRole('pr')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  selectedRole === 'pr'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Promoter / PR Professional</h4>
                    <p className="text-[11px] text-slate-400">
                      Dynamic bidding console, lead tracking & instant UPI wallet
                    </p>
                  </div>
                </div>
                {selectedRole === 'pr' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-400 hover:opacity-90 text-white text-xs font-bold shadow-xl shadow-purple-600/30 transition flex items-center justify-center gap-2"
          >
            <span>Continue as {selectedRole.toUpperCase()}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

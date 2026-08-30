import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CITIES } from '../../data/initialData';
import {
  Sparkles,
  MapPin,
  Ticket,
  Building2,
  Users,
  CreditCard,
  UserCheck,
  ChevronDown,
  Search,
  Zap,
} from 'lucide-react';

export const Header = ({ onOpenPasses, onOpenRazorpay, onOpenAuth }) => {
  const {
    role,
    setRole,
    activeCity,
    setActiveCity,
    searchQuery,
    setSearchQuery,
    bookings,
    currentUser,
  } = useApp();

  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const activeBookingsCount = bookings.filter((b) => b.status === 'ACTIVE').length;

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & City Selector */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setRole('guest')}>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-400 p-[2px] shadow-lg shadow-purple-600/30">
                <div className="w-full h-full bg-[#0d0f17] rounded-[14px] flex items-center justify-center">
                  <span className="text-2xl">🍸</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black tracking-tight font-sans">
                    NIGHT<span className="gradient-text-purple">VIBE</span>
                  </span>
                  <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    INDIA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 tracking-wide font-medium">
                  Dynamic PR Bidding & Nightclub Pass
                </p>
              </div>
            </div>

            {/* City Dropdown */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition"
              >
                <MapPin className="w-4 h-4 text-pink-400" />
                <span>{CITIES.find((c) => c.id === activeCity)?.name || 'Mumbai'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {cityDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 rounded-2xl glass-panel p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <p className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                    Select Party Metro
                  </p>
                  {CITIES.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => {
                        setActiveCity(city.id);
                        setCityDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeCity === city.id
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{city.name}</span>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                        {city.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar (Guest view) */}
          {role === 'guest' && (
            <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clubs, DJs, techno sundowners, Bollywood nights..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-slate-200 placeholder:text-slate-500 transition"
                />
              </div>
            </div>
          )}

          {/* Multi-Role Switcher & Action Controls */}
          <div className="flex items-center gap-3">
            
            {/* Unified 3-Sided Role Selector */}
            <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
              <button
                onClick={() => setRole('guest')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  role === 'guest'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guest</span>
              </button>

              <button
                onClick={() => setRole('owner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  role === 'owner'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-600/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Club Owner & Gate</span>
              </button>

              <button
                onClick={() => setRole('pr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  role === 'pr'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-600/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Promoter (PR)</span>
              </button>
            </div>

            {/* Guest Action: View My Passes */}
            {role === 'guest' && (
              <button
                onClick={onOpenPasses}
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition"
              >
                <Ticket className="w-4 h-4 text-purple-400" />
                <span>My Passes</span>
                {activeBookingsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                    {activeBookingsCount}
                  </span>
                )}
              </button>
            )}

            {/* Razorpay Gateway Config */}
            <button
              onClick={onOpenRazorpay}
              title="Razorpay / FinTech Integration Settings"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-amber-400 transition"
            >
              <CreditCard className="w-4 h-4" />
            </button>

            {/* User Profile / Login */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              <img
                src={currentUser.avatar}
                alt="User"
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-purple-500/50"
              />
              <span className="hidden md:inline text-xs font-medium text-slate-300 pr-1">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Sparkles,
  Zap,
  Gift,
  DollarSign,
  TrendingUp,
  Award,
  ShieldCheck,
  Share2,
  Sliders,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Copy,
  Clock,
  Wine,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PromoterView = () => {
  const {
    promoters,
    activePrId,
    setActivePrId,
    events,
    venues,
    bookings,
    submitPRBid,
    showToast,
  } = useApp();

  const pr = promoters.find((p) => p.id === activePrId) || promoters[0];
  
  // Authorized Events for this PR
  const authorizedEvents = events.filter((e) =>
    pr.authorizedVenues.includes(e.venueId)
  );

  // Selected Event for Dynamic Bidding
  const [selectedEventId, setSelectedEventId] = useState(
    authorizedEvents[0]?.id || events[0]?.id
  );
  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const selectedVenue = venues.find((v) => v.id === selectedEvent?.venueId);
  const isAuthorized = selectedVenue ? pr.authorizedVenues.includes(selectedVenue.id) : true;

  // Current Bid for this PR on the selected event
  const currentBid = selectedEvent?.bids?.find((b) => b.prId === pr.id);

  // Form State for Dynamic Bid
  const [bidPrice, setBidPrice] = useState(
    currentBid?.price || selectedEvent?.floorPrice || 1600
  );
  const [selectedPerks, setSelectedPerks] = useState(
    currentBid?.perks || ['perk_shooter', 'perk_fasttrack']
  );
  const [bidNotes, setBidNotes] = useState(
    currentBid?.notes || 'Exclusive fast-track entry + free shooter on arrival.'
  );

  // Sub-promoter split link state
  const [subPromoterName, setSubPromoterName] = useState('');
  const [subPromoterSplit, setSubPromoterSplit] = useState(70);
  const [generatedLink, setGeneratedLink] = useState('');

  // PR Metrics calculation
  const prBookings = bookings.filter((b) => b.prId === pr.id);
  const scannedBookings = prBookings.filter((b) => b.status === 'CHECKED_IN');
  const unlockedEarnings = scannedBookings.reduce((acc, b) => acc + (b.prCommission - Math.round(b.prCommission * 0.02)), 0);
  const pendingEscrow = prBookings.filter((b) => b.status === 'ACTIVE').reduce((acc, b) => acc + b.prCommission, 0);

  // Financial Estimation for Dynamic Bidding (Opus 5 formula)
  const cap = selectedEvent?.commissionCap || 350;
  const basePrice = selectedEvent?.basePrice || 2000;
  const discountPenalty = Math.max(0, basePrice - bidPrice) * 0.25;
  const basePart = cap * 0.55;
  const isOffPeak = selectedEvent?.date?.toLowerCase().includes('sunday') || selectedEvent?.date?.toLowerCase().includes('thursday');
  const offPeakBonus = isOffPeak ? cap * 0.35 : 0;
  const trustMultiplier = 0.7 + 0.6 * ((pr.showUpRate || 90) / 100);

  const estimatedGrossCommission = Math.min(
    cap,
    Math.max(120, Math.round((basePart + offPeakBonus - discountPenalty) * trustMultiplier))
  );
  const estimatedTds = Math.round(estimatedGrossCommission * 0.02);
  const estimatedNetPayout = estimatedGrossCommission - estimatedTds;

  const handleTogglePerk = (perkId) => {
    if (selectedPerks.includes(perkId)) {
      setSelectedPerks(selectedPerks.filter((id) => id !== perkId));
    } else {
      setSelectedPerks([...selectedPerks, perkId]);
    }
  };

  const handleSaveBid = (e) => {
    e.preventDefault();
    if (!isAuthorized) {
      showToast(`⚠️ You are not authorized for ${selectedVenue?.name}. Request authorization in PR Directory.`, 'error');
      return;
    }
    submitPRBid(selectedEvent.id, pr.id, bidPrice, selectedPerks, bidNotes);
  };

  const handleWithdrawWallet = () => {
    if (unlockedEarnings <= 0) {
      showToast('No unlocked funds available to withdraw yet.', 'warning');
      return;
    }

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });

    showToast(
      `⚡ ₹${unlockedEarnings} routed instantly to ${pr.upiId} via UPI Payout!`,
      'success'
    );
  };

  const handleGenerateSubLink = (e) => {
    e.preventDefault();
    if (!subPromoterName) {
      showToast('Please enter a sub-promoter name', 'warning');
      return;
    }
    const cleanHandle = subPromoterName.toLowerCase().replace(/\s+/g, '-');
    const link = `https://nightvibe.in/e/${selectedEvent.id}?pr=${pr.id}&sub=${cleanHandle}&split=${subPromoterSplit}`;
    setGeneratedLink(link);
    showToast(`Generated trackable sub-promoter link for ${subPromoterName}`, 'success');
  };

  return (
    <div className="space-y-8">
      
      {/* Top PR Profile & Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={pr.avatar}
            alt={pr.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-500/40 shadow-lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {pr.tier} PR • Verified Host
              </span>
              <span className="text-xs text-slate-400">{pr.handle}</span>
            </div>
            <h2 className="text-2xl font-black text-white font-sans mt-0.5">
              {pr.name}
            </h2>
            <p className="text-xs text-slate-400">
              Specialization: <span className="text-cyan-300 font-semibold">{pr.niche}</span> • {pr.college} • Payout: <span className="text-emerald-400 font-mono">{pr.upiId}</span>
            </p>
          </div>
        </div>

        {/* PR Switcher for Pair Programming / Review */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Switch PR Persona:</label>
          <select
            value={activePrId}
            onChange={(e) => setActivePrId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            {promoters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.niche})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PR Financial & Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Unlocked Wallet Balance */}
        <div className="p-5 rounded-3xl glass-panel border border-cyan-500/30 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Unlocked Earnings</span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-sans">
            ₹{unlockedEarnings}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">2% TDS Auto-Deducted</span>
            <button
              onClick={handleWithdrawWallet}
              disabled={unlockedEarnings <= 0}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-40 text-black text-xs font-bold transition shadow-md"
            >
              Instant UPI Payout →
            </button>
          </div>
        </div>

        {/* Pending Escrow */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Escrow Pending Check-In</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-sans">
            ₹{pendingEscrow}
          </div>
          <p className="text-[11px] text-slate-400">
            Releases automatically when bouncer admits guest
          </p>
        </div>

        {/* Admitted Pax */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Verified Admissions</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-sans">
            {scannedBookings.reduce((acc, b) => acc + b.pax, 0)} <span className="text-xs text-slate-400 font-normal">pax</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {scannedBookings.length} bookings converted at door
          </p>
        </div>

        {/* Show-Up Trust Score */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Show-Up Trust Rate</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-300 font-sans">
            {pr.showUpRate}%
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">
            ⭐ {pr.rating} Rating (Higher bids unlocked)
          </p>
        </div>
      </div>

      {/* Main Grid: Bidding Console & Campaign Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Dynamic Bidding Engine */}
        <div className="lg:col-span-7 p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Dynamic Bidding Engine
              </h3>
              <p className="text-xs text-slate-400">
                Set competitive prices & bundle VIP perks to attract clubbers
              </p>
            </div>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
              isAuthorized
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}>
              {isAuthorized ? '✅ Venue Authorized' : '🔒 Not Authorized'}
            </span>
          </div>

          <form onSubmit={handleSaveBid} className="space-y-5">
            {/* Event Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Target Venue Campaign:
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  const ev = events.find((x) => x.id === e.target.value);
                  const existBid = ev?.bids?.find((b) => b.prId === pr.id);
                  if (existBid) {
                    setBidPrice(existBid.price);
                    setSelectedPerks(existBid.perks || []);
                    setBidNotes(existBid.notes || '');
                  } else {
                    setBidPrice(ev?.floorPrice || 1600);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                {events.map((evt) => {
                  const evVenue = venues.find((v) => v.id === evt.venueId);
                  const isAuth = pr.authorizedVenues.includes(evt.venueId);
                  return (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} @ {evVenue?.name} ({evt.date}) {isAuth ? '✓' : '🔒'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Price Slider */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Your Offer Price per Pass:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-cyan-300 font-mono">₹{bidPrice}</span>
                  <span className="text-[10px] text-slate-500 block">Box Office: ₹{selectedEvent?.basePrice}</span>
                </div>
              </div>

              <input
                type="range"
                min={selectedEvent?.floorPrice || 1400}
                max={selectedEvent?.basePrice || 2200}
                step={50}
                value={bidPrice}
                onChange={(e) => setBidPrice(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Floor Limit: ₹{selectedEvent?.floorPrice}</span>
                <span>Max Box Office: ₹{selectedEvent?.basePrice}</span>
              </div>
            </div>

            {/* Approved Perks Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Bundle Approved VIP Perks:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(selectedEvent?.approvedPerks || []).map((perk) => {
                  const isChecked = selectedPerks.includes(perk.id);
                  return (
                    <div
                      key={perk.id}
                      onClick={() => handleTogglePerk(perk.id)}
                      className={`p-3 rounded-xl cursor-pointer border text-xs flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-purple-950/40 border-purple-500 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-purple-400" />
                        <span>{perk.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300">₹{perk.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bid Pitch Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                PR Pitch & Guestlist Note:
              </label>
              <input
                type="text"
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
                placeholder="e.g. VIP line bypass + 1 shooter token included"
                className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!isAuthorized}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-40 text-black font-black text-xs shadow-lg transition"
            >
              {isAuthorized ? 'Publish Dynamic Bid to Live Event →' : '🔒 Venue Authorization Required'}
            </button>
          </form>
        </div>

        {/* Right Column: Financial Breakdown & Sub-Promoter Tracking */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Yield Breakdown */}
          <div className="p-6 rounded-3xl glass-panel border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Live Commission Yield Breakdown
              </h3>
              <span className="text-[10px] font-mono text-cyan-300">Sec 194H Compliant</span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Box Office Price:</span>
                <span className="text-slate-300">₹{selectedEvent?.basePrice || 2000}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Guest Discount:</span>
                <span className="text-white font-semibold">₹{discountPenalty * 4}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Gross Commission (Formula):</span>
                <span className="text-cyan-300 font-bold font-mono">₹{estimatedGrossCommission}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>2% Section 194H TDS:</span>
                <span className="text-rose-400 font-mono">-₹{estimatedTds}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-white">
                <span>Net Take-Home / Pax:</span>
                <span className="text-emerald-400 font-black font-mono text-base">₹{estimatedNetPayout}</span>
              </div>
            </div>
          </div>

          {/* Shareable VIP Guestlist & WhatsApp Referral Link */}
          <div className="p-6 rounded-3xl glass-panel border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                Your VIP Tracking Link
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                Auto-Attributed
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-purple-300 truncate">
              {`https://nightvibe.in/e/${selectedEvent?.id || 'evt_kshmr'}?pr=${pr.id}`}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`https://nightvibe.in/e/${selectedEvent?.id || 'evt_kshmr'}?pr=${pr.id}`);
                  showToast('📋 Copied VIP Tracking Link to clipboard!', 'success');
                }}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = `Hey! Book VIP passes for ${selectedEvent?.title} at ${selectedVenue?.name} via my official NightVibe link: https://nightvibe.in/e/${selectedEvent?.id || 'evt_kshmr'}?pr=${pr.id} (Special offer ₹${bidPrice} + ${selectedPerks.join(', ')})`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-lg"
              >
                <span>📲</span>
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* POS Bottle Spend Bonus Webhook Tracker */}
          <div className="p-6 rounded-3xl glass-panel border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wine className="w-4 h-4 text-amber-400" />
                Table & Bottle Spend Bonus
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                5% Kickback
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Earn 5% bonus kickback when your guestlist orders bottle service or VIP tables at {selectedVenue?.name || 'the venue'}.
            </p>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center text-xs">
              <span className="text-slate-400">Tracked POS Table Spend:</span>
              <span className="font-bold text-amber-400 font-mono text-sm">₹48,000</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center text-xs">
              <span className="text-amber-200">Earned Bottle Commission:</span>
              <span className="font-black text-amber-300 text-base font-mono">+₹2,400</span>
            </div>
          </div>

          {/* Sub-Promoter Split Generator */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Sub-Promoter & Team Split Link
            </h3>
            
            <form onSubmit={handleGenerateSubLink} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Sub-Promoter / Campus Rep Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Karan (NMIMS Lead)"
                  value={subPromoterName}
                  onChange={(e) => setSubPromoterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Commission Split to Rep:</span>
                  <span className="text-cyan-300 font-bold">{subPromoterSplit}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={subPromoterSplit}
                  onChange={(e) => setSubPromoterSplit(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
              >
                Generate Trackable Rep Link
              </button>

              {generatedLink && (
                <div className="p-2.5 rounded-xl bg-black/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 break-all">
                  {generatedLink}
                </div>
              )}
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};

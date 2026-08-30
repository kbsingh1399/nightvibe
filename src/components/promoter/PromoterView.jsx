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

  // Financial Estimation for Dynamic Bidding
  const discountGiven = selectedEvent ? Math.max(0, selectedEvent.basePrice - bidPrice) : 0;
  const estimatedGrossCommission = Math.max(150, discountGiven + 120);
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

    showToast(`⚡ ₹${unlockedEarnings} routed instantly to ${pr.upiId} via UPI Payout!`, 'success');
  };

  const handleGenerateSubLink = (e) => {
    e.preventDefault();
    if (!subPromoterName) {
      showToast('Enter campus ambassador or sub-PR name', 'warning');
      return;
    }
    const slug = subPromoterName.toLowerCase().replace(/\s+/g, '-');
    const link = `https://nightvibe.in/e/${selectedEvent.id}?pr=${pr.id}&sub=${slug}&split=${subPromoterSplit}`;
    setGeneratedLink(link);
    showToast('Unique attribution link generated with auto split!', 'success');
  };

  return (
    <div className="space-y-8">
      
      {/* Top PR Profile Header & Persona Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={pr.avatar}
            alt={pr.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-500/50 shadow-lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {pr.tier} PR
              </span>
              {pr.verified && <ShieldCheck className="w-4 h-4 text-cyan-400" />}
              <span className="text-xs text-amber-400 font-bold">⭐ {pr.rating}</span>
            </div>
            <h2 className="text-2xl font-black text-white font-sans mt-0.5">
              {pr.name} <span className="text-sm font-normal text-slate-400">({pr.handle})</span>
            </h2>
            <p className="text-xs text-slate-400">
              UPI Payout: <span className="font-mono text-cyan-300">{pr.upiId}</span> • {pr.phone}
            </p>
          </div>
        </div>

        {/* Switch PR Persona */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Switch PR:</label>
          <select
            value={activePrId}
            onChange={(e) => setActivePrId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            {promoters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.tier})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PR Wallet & Performance Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* Unlocked Wallet Balance */}
        <div className="p-5 rounded-3xl glass-panel border border-cyan-500/30 space-y-2 bg-cyan-950/20">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
            <span>Unlocked PR Wallet</span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-sans">
            ₹{unlockedEarnings.toLocaleString()}
          </div>
          <button
            onClick={handleWithdrawWallet}
            disabled={unlockedEarnings <= 0}
            className="w-full py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-xs font-bold transition shadow-md"
          >
            Instant UPI Withdrawal
          </button>
        </div>

        {/* Pending Escrow */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
          <span className="text-xs text-slate-400 block">Pending Escrow (Pre-Scan)</span>
          <div className="text-2xl font-black text-amber-400 font-sans">
            ₹{pendingEscrow.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            Unlocks automatically at door scan
          </p>
        </div>

        {/* Total Admitted Pax */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
          <span className="text-xs text-slate-400 block">Verified Admissions</span>
          <div className="text-2xl font-black text-emerald-400 font-sans">
            {scannedBookings.reduce((acc, b) => acc + b.pax, 0)} Pax
          </div>
          <p className="text-[11px] text-slate-400">
            Across {scannedBookings.length} bookings tonight
          </p>
        </div>

        {/* PR Trust Score */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
          <span className="text-xs text-slate-400 block">PR Trust Score</span>
          <div className="text-2xl font-black text-purple-300 font-sans">
            {pr.showUpRate}% <span className="text-xs text-slate-400">Show-Up</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold">
            ⭐ {pr.rating} (Zero Disputes)
          </p>
        </div>
      </div>

      {/* DYNAMIC BIDDING CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Bid Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <span>Dynamic Bidding Engine</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compete with other PRs on price and bundled perks for authorized club nights
                </p>
              </div>
            </div>

            {/* Select Event */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Authorized Campaign
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                {authorizedEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({venues.find((v) => v.id === evt.venueId)?.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Price Slider bounded by Venue Floor */}
            {selectedEvent && (
              <div className="space-y-4 p-4 rounded-2xl bg-black/30 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Your Offer Price per Pax</span>
                    <span className="text-[11px] text-slate-400">
                      Floor Limit: ₹{selectedEvent.floorPrice} • Box Office: ₹{selectedEvent.basePrice}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-cyan-300 font-sans">
                    ₹{bidPrice}
                  </div>
                </div>

                <input
                  type="range"
                  min={selectedEvent.floorPrice}
                  max={selectedEvent.basePrice}
                  step={50}
                  value={bidPrice}
                  onChange={(e) => setBidPrice(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Minimum Floor ₹{selectedEvent.floorPrice}</span>
                  <span>Maximum Official ₹{selectedEvent.basePrice}</span>
                </div>
              </div>
            )}

            {/* Perks Selector */}
            {selectedEvent && (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bundle Venue-Approved Perks
                </label>
                <div className="space-y-2">
                  {selectedEvent.approvedPerks?.map((perk) => {
                    const isChecked = selectedPerks.includes(perk.id);
                    return (
                      <div
                        key={perk.id}
                        onClick={() => handleTogglePerk(perk.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          isChecked
                            ? 'bg-cyan-950/30 border-cyan-500 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-pink-400" />
                          <span className="font-semibold">{perk.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Valued at ₹{perk.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pitch Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Custom PR Pitch Line
              </label>
              <input
                type="text"
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
                placeholder="e.g. Meet me at Gate 2 for express stamp..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Submit Bid Button */}
            <button
              onClick={handleSaveBid}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black shadow-xl shadow-cyan-500/20 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Publish / Update Dynamic Bid</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Yield Calculator & Sub-PR Link Generator */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Yield Calculator */}
          <div className="p-6 rounded-3xl glass-panel border border-cyan-500/30 space-y-4">
            <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Per-Ticket Commission Breakdown</span>
            </h3>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Guest Discount Funded</span>
                <span className="text-white font-medium">₹{discountGiven}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Gross Commission</span>
                <span className="text-cyan-300 font-bold">₹{estimatedGrossCommission}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Section 194H 2% TDS Withheld</span>
                <span className="text-rose-400">-₹{estimatedTds}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-black text-white">
                <span>Net Instant UPI Payout</span>
                <span className="text-emerald-400">₹{estimatedNetPayout} / Pax</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 <span className="font-semibold text-slate-300">Smart Pricing Strategy:</span> Setting your price ₹100 below official box office increases conversion rate by ~38% on Friday/Saturday nights.
            </p>
          </div>

          {/* Sub-Promoter / Campus Ambassador Split Generator */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <Share2 className="w-4 h-4 text-pink-400" />
              <span>Sub-Promoter Split Links (Campus Network)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Generate tracked booking links for college reps with automated revenue share
            </p>

            <form onSubmit={handleGenerateSubLink} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rep / Ambassador Name</label>
                <input
                  type="text"
                  placeholder="e.g. NMIMS Kabir or Mithibai Rhea"
                  value={subPromoterName}
                  onChange={(e) => setSubPromoterName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Your Cut: {subPromoterSplit}%</span>
                  <span className="text-pink-400">Rep Cut: {100 - subPromoterSplit}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={90}
                  step={5}
                  value={subPromoterSplit}
                  onChange={(e) => setSubPromoterSplit(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
              >
                Generate Tracked Link
              </button>
            </form>

            {generatedLink && (
              <div className="p-3 rounded-xl bg-black/40 border border-pink-500/30 space-y-1.5">
                <span className="text-[10px] text-pink-300 font-bold block">Active Split Link:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full bg-transparent text-[11px] text-slate-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      showToast('Link copied to clipboard!', 'success');
                    }}
                    className="p-1.5 rounded-lg bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

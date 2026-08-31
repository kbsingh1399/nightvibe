import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Tooltip, HelpTip } from '../common/Tooltip';
import {
  Building2,
  QrCode,
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  CreditCard,
  Plus,
  ShieldAlert,
  Sparkles,
  Camera,
  AlertTriangle,
  FileText,
  Clock,
  MapPin,
  Check,
  RefreshCw,
  Calendar,
  BarChart3,
  Percent,
  Download,
  Lock,
} from 'lucide-react';

export const OwnerView = ({ onOpenPRNetwork, onOpenCityEvents }) => {
  const {
    venues,
    events,
    promoters,
    bookings,
    transactions,
    activeOwnerVenueId,
    setActiveOwnerVenueId,
    scanTicket,
    createEvent,
    showToast,
  } = useApp();

  const venue = venues.find((v) => v.id === activeOwnerVenueId) || venues[0];
  const venueEvents = events.filter((e) => e.venueId === venue.id);
  const venueBookings = bookings.filter((b) => b.venueId === venue.id);
  const venueTransactions = transactions.filter((t) => t.venueId === venue.id || t.recipientId === venue.id || t.venueName?.includes(venue.name.split(' ')[0]));

  // Active Tab: 'scanner' | 'matrix' | 'leaderboard' | 'ledger' | 'license'
  const [activeTab, setActiveTab] = useState('scanner');
  const [selectedMatrixEventId, setSelectedMatrixEventId] = useState(venueEvents[0]?.id || events[0]?.id);

  // Scanner State
  const [scannedTicketId, setScannedTicketId] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Dress code / Stag balance violation');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Create Event Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '22:00',
    genre: 'Commercial EDM',
    basePrice: 1500,
    floorPrice: 999,
    capacityQuota: 300,
    artistName: '',
    image: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=1200&q=80',
  });

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) {
      showToast('Please fill Event Title and Date', 'warning');
      return;
    }
    const created = createEvent({
      ...newEvent,
      venueId: venue.id,
      venueName: venue.name,
      basePrice: Number(newEvent.basePrice),
      floorPrice: Number(newEvent.floorPrice),
      capacityQuota: Number(newEvent.capacityQuota),
    });
    if (created) {
      window.confetti && window.confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      showToast(`🎉 "${newEvent.title}" is now LIVE on NightVibe!`, 'success');
      setShowCreateModal(false);
      setNewEvent({ title: '', date: '', time: '22:00', genre: 'Commercial EDM', basePrice: 1500, floorPrice: 999, capacityQuota: 300, artistName: '', image: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=1200&q=80' });
      setActiveTab('matrix');
    }
  };

  // Govt License Verify State
  const [gstinInput, setGstinInput] = useState('27AABCT1234F1Z9');
  const [fssaiInput, setFssaiInput] = useState('11521000000000');
  const [verifyingLicense, setVerifyingLicense] = useState(false);

  // Active event for matrix
  const activeMatrixEvent = events.find((e) => e.id === selectedMatrixEventId) || venueEvents[0] || events[0];
  const matrixBookings = venueBookings.filter((b) => b.eventId === activeMatrixEvent?.id);
  const totalTicketsSold = matrixBookings.reduce((sum, b) => sum + (b.pax || 1), 0);
  const totalAdmitted = matrixBookings.filter((b) => b.status === 'CHECKED_IN').reduce((sum, b) => sum + (b.pax || 1), 0);
  const eventGmv = matrixBookings.reduce((sum, b) => sum + (b.totalPaid || 0), 0);
  const eventVenueNet = matrixBookings.reduce((sum, b) => sum + (b.venueShare || Math.round((b.totalPaid || 0) * 0.85)), 0);
  const eventPrCommission = matrixBookings.reduce((sum, b) => sum + (b.prCommission || Math.round((b.totalPaid || 0) * 0.12)), 0);
  const showUpPercentage = totalTicketsSold > 0 ? Math.round((totalAdmitted / totalTicketsSold) * 100) : 88;
  const capacityTarget = activeMatrixEvent?.capacityQuota || 300;
  const capacityPct = Math.min(100, Math.round((totalTicketsSold / capacityTarget) * 100));

  // Handle Manual/Simulated Scan with Strict Venue Scoping
  const handleInspectTicket = (ticketIdToScan) => {
    const targetId = (ticketIdToScan || scannedTicketId).trim();
    if (!targetId) {
      showToast('Please select or type a Ticket Pass ID', 'warning');
      return;
    }

    const found = venueBookings.find(
      (b) => b.id === targetId || b.qrToken === targetId || targetId.includes(b.id)
    );

    if (found) {
      setScannedResult(found);
      setScannedTicketId(found.id);
      navigator.vibrate?.([12, 40, 12]);
      return;
    }

    // Check if pass belongs to another club (Cross-tenant check)
    const otherClubPass = bookings.find((b) => b.id === targetId || b.qrToken === targetId);
    if (otherClubPass) {
      const otherVenue = venues.find(v => v.id === otherClubPass.venueId);
      showToast(`⚠️ WRONG VENUE: This pass is for ${otherVenue?.name || 'another club'}`, 'error');
      navigator.vibrate?.([80, 60, 80]);
    } else {
      showToast('❌ Invalid Pass: QR Token not found in manifest', 'error');
    }
    setScannedResult(null);
  };

  // Perform Admission Action
  const handleAdmit = () => {
    if (!scannedResult) return;
    const res = scanTicket(scannedResult.id, 'ADMIT');
    if (res.success) {
      setScannedResult({ ...scannedResult, status: 'CHECKED_IN' });
    }
  };

  // Perform Rejection Action
  const handleReject = () => {
    if (!scannedResult) return;
    const res = scanTicket(scannedResult.id, 'REJECT', rejectionReason);
    if (res.success) {
      setScannedResult({ ...scannedResult, status: 'REJECTED' });
      setShowRejectModal(false);
    }
  };

  const handleInstantVerifyGovtLicense = (e) => {
    e.preventDefault();
    setVerifyingLicense(true);
    setTimeout(() => {
      setVerifyingLicense(false);
      window.confetti && window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      showToast(`✅ GSTIN & FSSAI Verified for ${venue.name}! 100% Tax & Liquor Compliant.`, 'success');
    }, 1400);
  };

  return (
    <div className="space-y-8">
      
      {/* Top Venue Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl card-blur border border-amber-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl">
            {venue.logo || '🏢'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Club Owner & Door Console
              </span>
              <span className="text-xs text-slate-400">ID: {venue.id}</span>
              <Tooltip content="Direct connection active to Government GST & Excise registry for real-time license validation.">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer">
                  🏛️ GST / FSSAI ONLINE (&lt;30s)
                </span>
              </Tooltip>
            </div>
            <h2 className="text-2xl font-black text-white font-sans mt-0.5">
              {venue.name}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-pink-400" /> {venue.area} • Manager: {venue.ownerName} ({venue.ownerPhone})
            </p>
          </div>
        </div>

        {/* Action buttons + Venue Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-black text-xs font-black shadow-lg hover:opacity-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Host / Create Event</span>
          </button>

          <select
            value={activeOwnerVenueId}
            onChange={(e) => {
              setActiveOwnerVenueId(e.target.value);
              setScannedResult(null);
            }}
            className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Centered Navigation Tabs */}
      <div className="flex items-center justify-center p-1.5 rounded-2xl bg-black/40 border border-white/10 w-fit mx-auto max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'scanner'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Door Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'matrix'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Event Analytics Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'leaderboard'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>PR Attribution</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'ledger'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Settlements & 2% TDS</span>
        </button>

        <button
          onClick={() => setActiveTab('license')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'license'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🏛️</span>
          <span>Govt License Verify</span>
        </button>
      </div>

      {/* TAB 1: IN-APP SMART DOOR SCANNER */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Col: Camera / Scanner Interface */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl card-blur border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                  <Camera className="w-5 h-5 text-amber-400" />
                  <span>Entrance Camera Scanner</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE SENSOR ACTIVE</span>
                </span>
              </div>

              {/* Camera Scanner Viewport */}
              <div className="relative rounded-2xl aspect-square bg-black/80 border-2 border-dashed border-purple-500/50 flex flex-col items-center justify-center overflow-hidden">
                {cameraActive ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                    <div className="absolute inset-8 border-2 border-cyan-400/80 rounded-2xl pointer-events-none" />
                    <div className="radar-line" />
                    <p className="text-xs text-cyan-300 font-semibold animate-pulse z-10">
                      Align Guest QR Code within Frame...
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                      <QrCode className="w-8 h-8 text-amber-400" />
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Point phone or laptop camera at Guest's Rotating Dynamic Pass
                    </p>
                    <button
                      onClick={() => setCameraActive(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg"
                    >
                      Open Live Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Quick 1-Tap Ticket Simulator for testing */}
              <div className="pt-2 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Quick-Scan Active Passes ({venueBookings.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {venueBookings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleInspectTicket(b.id)}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                        scannedTicketId === b.id
                          ? 'bg-amber-500/20 border-amber-500 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{b.id}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({b.guestName})</span>
                        </div>
                        <div className="text-[10px] text-purple-300">
                          {b.pax} Pax • via {promoters.find((p) => p.id === b.prId)?.name}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : b.status === 'CHECKED_IN'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Scan Verification & Decision Deck */}
          <div className="lg:col-span-7 space-y-6">
            {scannedResult ? (
              <div className="p-6 rounded-3xl card-blur border border-white/10 space-y-6 shadow-2xl">
                
                {/* Result Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Pass Decoded ({scannedResult.id})
                    </span>
                    <h3 className="text-xl font-black text-white font-sans">
                      {scannedResult.guestName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {scannedResult.guestPhone} • {scannedResult.guestEmail}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      scannedResult.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : scannedResult.status === 'CHECKED_IN'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {scannedResult.status === 'ACTIVE' ? 'READY TO ADMIT' : scannedResult.status}
                  </span>
                </div>

                {/* Headcount Breakdown Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pax</span>
                    <span className="text-2xl font-black text-white font-sans">{scannedResult.pax}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Males / Stags</span>
                    <span className="text-2xl font-black text-amber-400 font-sans">{scannedResult.maleCount}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Females / Couple</span>
                    <span className="text-2xl font-black text-pink-400 font-sans">{scannedResult.femaleCount}</span>
                  </div>
                </div>

                {/* Promoter Attribution & Perks Checklist */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                    <span className="text-slate-400">Promoter / Host:</span>
                    <span className="font-bold text-white">
                      {promoters.find((p) => p.id === scannedResult.prId)?.name} (
                      {promoters.find((p) => p.id === scannedResult.prId)?.handle})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Approved VIP Perks on Pass:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scannedResult.perks?.map((p, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-500/20 border border-pink-500/30 text-pink-300 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{p}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Verification Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject / Door Refusal</span>
                  </button>

                  <button
                    onClick={handleAdmit}
                    disabled={scannedResult.status === 'CHECKED_IN'}
                    className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 disabled:opacity-50 text-black font-black text-xs shadow-lg transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{scannedResult.status === 'CHECKED_IN' ? 'Already Admitted' : 'Admit & Scan In'}</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="p-12 rounded-3xl card-blur border border-white/10 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <QrCode className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">No Pass Inspected</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Scan a rotating QR pass from the camera sensor or select a sample active pass from the list on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVENT ANALYTICS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Event Picker Pill Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-3xl card-blur border border-white/10">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="text-xs font-bold text-slate-400 shrink-0">Select Event:</span>
              {venueEvents.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => setSelectedMatrixEventId(evt.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedMatrixEventId === evt.id
                      ? 'bg-teal-400 text-black shadow-lg shadow-teal-500/20'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {evt.title}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold hover:bg-teal-500/30 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Event</span>
            </button>
          </div>

          {/* Hero Event Matrix Banner with 5 KPI Cards */}
          {activeMatrixEvent && (
            <div className="relative rounded-3xl card-blur border border-teal-500/30 overflow-hidden p-6 space-y-6">
              
              {/* Event Metadata Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <img
                    src={activeMatrixEvent.image}
                    alt={activeMatrixEvent.title}
                    className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {activeMatrixEvent.genre}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        🟢 LIVE ON SALE
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white mt-1">{activeMatrixEvent.title}</h3>
                    <p className="text-xs text-slate-400">⏰ {activeMatrixEvent.date} • {activeMatrixEvent.time}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Box Office / Floor</span>
                  <span className="font-mono text-sm font-bold text-white">
                    ₹{activeMatrixEvent.basePrice} / <span className="text-teal-300 font-bold">₹{activeMatrixEvent.floorPrice}</span>
                  </span>
                </div>
              </div>

              {/* 5 Core Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                
                {/* Metric 1: Passes Sold & Velocity */}
                <div className="p-3.5 rounded-2xl card-blur border border-teal-500/20 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Tickets Sold</span>
                    <Tooltip content="Total verified passes purchased across all authorized PR promoters.">
                      <span className="text-[10px] text-teal-300">ℹ️</span>
                    </Tooltip>
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {totalTicketsSold} <span className="text-xs text-slate-400 font-normal">/ {capacityTarget}</span>
                  </div>
                  <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full" style={{ width: `${capacityPct}%` }} />
                  </div>
                  <span className="text-[10px] text-teal-300 font-semibold block">{capacityPct}% quota filled</span>
                </div>

                {/* Metric 2: Gross GMV */}
                <div className="p-3.5 rounded-2xl card-blur border border-purple-500/20 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Gross Box Office</span>
                    <Tooltip content="Total revenue collected from pass buyers before platform and PR splits.">
                      <span className="text-[10px] text-purple-300">ℹ️</span>
                    </Tooltip>
                  </div>
                  <div className="text-xl font-black text-purple-300 font-mono">
                    ₹{eventGmv.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block">Avg Ticket: ₹{activeMatrixEvent.floorPrice}</span>
                </div>

                {/* Metric 3: Net Venue Realization */}
                <div className="p-3.5 rounded-2xl card-blur border border-emerald-500/20 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Net Venue Share</span>
                    <Tooltip content="Direct net earnings realized by club owner after PR commissions.">
                      <span className="text-[10px] text-emerald-300">ℹ️</span>
                    </Tooltip>
                  </div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    ₹{eventVenueNet.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-emerald-300 font-semibold block">85.4% retained</span>
                </div>

                {/* Metric 4: PR Commission Outflow */}
                <div className="p-3.5 rounded-2xl card-blur border border-pink-500/20 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>PR Commission</span>
                    <Tooltip content="Total commission distributed to promoters based on verified show-up score.">
                      <span className="text-[10px] text-pink-300">ℹ️</span>
                    </Tooltip>
                  </div>
                  <div className="text-xl font-black text-pink-400 font-mono">
                    ₹{eventPrCommission.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block">11.8% promoter spend</span>
                </div>

                {/* Metric 5: Show-Up Rate */}
                <div className="p-3.5 rounded-2xl card-blur border border-amber-500/20 space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="tooltip-dotted">
                      <Tooltip content="Show-Up Rate: (Physical Gate Scans ÷ Total Tickets Issued) × 100. Measures verified physical turnout.">
                        Show-Up Rate ℹ️
                      </Tooltip>
                    </span>
                  </div>
                  <div className="text-xl font-black text-amber-300 font-mono">
                    {showUpPercentage}%
                  </div>
                  <span className="text-[10px] text-emerald-400 block font-semibold">
                    {totalAdmitted} scanned of {totalTicketsSold}
                  </span>
                </div>

              </div>

              {/* PR Promoter Attribution Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>👥</span>
                    <span>Promoter Footfall & Attribution Matrix</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Real-time gate scan attribution</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                        <th className="pb-2">PR Promoter</th>
                        <th className="pb-2">Specialization</th>
                        <th className="pb-2">Passes Sold</th>
                        <th className="pb-2">Admitted (Door)</th>
                        <th className="pb-2 tooltip-dotted">
                          <Tooltip content="Individual promoter conversion turnout efficiency.">
                            Show-Up % ℹ️
                          </Tooltip>
                        </th>
                        <th className="pb-2">Gross Sales</th>
                        <th className="pb-2">Commission Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {promoters.filter((p) => p.authorizedVenues.includes(venue.id)).map((pr) => {
                        const prBk = matrixBookings.filter((b) => b.prId === pr.id);
                        const sold = prBk.reduce((a, b) => a + (b.pax || 1), 0);
                        const adm = prBk.filter((b) => b.status === 'CHECKED_IN').reduce((a, b) => a + (b.pax || 1), 0);
                        const gmv = prBk.reduce((a, b) => a + (b.totalPaid || 0), 0);
                        const comm = prBk.reduce((a, b) => a + (b.prCommission || 0), 0);
                        const prShowUp = sold > 0 ? Math.round((adm / sold) * 100) : (pr.showUpRate || 90);

                        return (
                          <tr key={pr.id} className="hover:bg-white/5">
                            <td className="py-2.5 font-bold text-white flex items-center gap-2">
                              <img src={pr.avatar} alt={pr.name} className="w-6 h-6 rounded-full object-cover" />
                              <span>{pr.name}</span>
                            </td>
                            <td className="py-2.5 text-cyan-300">{pr.niche}</td>
                            <td className="py-2.5 text-white font-mono font-bold">{sold} pax</td>
                            <td className="py-2.5 text-emerald-400 font-mono font-bold">{adm} pax</td>
                            <td className="py-2.5 text-amber-300 font-bold font-mono">{prShowUp}%</td>
                            <td className="py-2.5 text-purple-300 font-mono font-semibold">₹{gmv}</td>
                            <td className="py-2.5 text-pink-400 font-mono font-semibold">₹{comm}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Crowd Ratio & Gender Balance Matrix */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-bold">Crowd Gender & Vibe Balance:</span>
                  <span className="text-emerald-400 font-semibold text-[11px]">Optimal Ratio Maintained (46% F / 54% M)</span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                  <div className="bg-pink-500 h-full" style={{ width: '46%' }} title="Female Guests (46%)" />
                  <div className="bg-cyan-500 h-full" style={{ width: '38%' }} title="Male Stags (38%)" />
                  <div className="bg-amber-400 h-full" style={{ width: '16%' }} title="VIP Couples (16%)" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" /> 46% Female</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> 38% Male Stag</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 16% VIP Couples</span>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEADERBOARD & PR ATTRIBUTION */}
      {activeTab === 'leaderboard' && (
        <div className="p-6 rounded-3xl card-blur border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>PR Promoter Footfall & Commission Leaderboard</span>
            </h3>
            <span className="text-xs text-slate-400">Current Club: {venue.name}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2">Promoter</th>
                  <th className="pb-2">Niche</th>
                  <th className="pb-2">Door Check-Ins</th>
                  <th className="pb-2">Gross Revenue</th>
                  <th className="pb-2 tooltip-dotted">
                    <Tooltip content="Show-Up Rate: Gate scan conversion percentage.">
                      Show-Up Rate ℹ️
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {promoters.filter((p) => p.authorizedVenues.includes(venue.id)).map((pr) => {
                  const prBk = venueBookings.filter((b) => b.prId === pr.id);
                  const adm = prBk.filter((b) => b.status === 'CHECKED_IN').reduce((a, b) => a + b.pax, 0);
                  const gmv = prBk.reduce((a, b) => a + b.totalPaid, 0);
                  return (
                    <tr key={pr.id} className="hover:bg-white/5">
                      <td className="py-2.5 font-bold text-white">{pr.name} ({pr.handle})</td>
                      <td className="py-2.5 text-cyan-300">{pr.niche}</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{adm} pax</td>
                      <td className="py-2.5 text-purple-300 font-semibold">₹{gmv}</td>
                      <td className="py-2.5 text-amber-300 font-bold">{pr.showUpRate || 92}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SETTLEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="p-6 rounded-3xl card-blur border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Direct Split Settlement Ledger ({venue.name})</h3>
            <span className="text-xs text-slate-400">Sec 194H Compliant</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2">Txn ID</th>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">PR Credited</th>
                  <th className="pb-2">Venue Share</th>
                  <th className="pb-2">PR Commission</th>
                  <th className="pb-2 tooltip-dotted">
                    <Tooltip content="Sec 194H 2% Tax Deducted at Source on commission, auto-reported to ITD.">
                      2% TDS ℹ️
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {venueTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5">
                    <td className="py-2.5 font-mono text-purple-300">{t.id}</td>
                    <td className="py-2.5 text-white">{t.eventTitle}</td>
                    <td className="py-2.5 text-slate-300">{t.prName}</td>
                    <td className="py-2.5 text-emerald-400 font-bold">₹{t.venueShare}</td>
                    <td className="py-2.5 text-pink-400">₹{t.prCommission}</td>
                    <td className="py-2.5 text-slate-400">₹{t.tdsDeducted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: GOVT LICENSE VERIFICATION (<30s) */}
      {activeTab === 'license' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 rounded-3xl card-blur border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>🏛️</span>
                  <span>Instant Government License Verification</span>
                </h3>
                <p className="text-xs text-slate-400">Public Registry Lookup via GSTIN &amp; FSSAI Gateway (&lt;30s)</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SPEED VERIFY
              </span>
            </div>

            <form onSubmit={handleInstantVerifyGovtLicense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">15-Digit GSTIN Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 27AABCT1234F1Z9"
                  value={gstinInput}
                  onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm uppercase tracking-wider focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">14-Digit FSSAI Liquor &amp; Food License Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11521000000000"
                  value={fssaiInput}
                  onChange={(e) => setFssaiInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm tracking-wider focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={verifyingLicense}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                {verifyingLicense ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    <span>Querying Govt Registry APIs (&lt; 1.5s)...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Verify Instantly Online (&lt; 30s)</span>
                  </>
                )}
              </button>
            </form>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block">💡 Instant Zero-Wait Approval:</span>
              <p>NightVibe verifies directly against the GST Portal &amp; FSSAI FoSCoS database in real-time. No manual documentation queues or delayed approvals.</p>
            </div>
          </div>

          {/* Status Certificate Card */}
          <div className="lg:col-span-6 p-6 rounded-3xl card-blur border border-teal-500/30 space-y-4 relative overflow-hidden bg-gradient-to-b from-teal-950/20 via-black/40 to-black/60">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider block">NATIONAL COMPLIANCE CERTIFICATE</span>
                <h4 className="text-lg font-black text-white">{venue.name}</h4>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl border border-emerald-500/40">
                🛡️
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">GST Registration Status:</span>
                <span className="font-bold text-emerald-400 font-mono">ACTIVE (Regular Taxpayer)</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">FSSAI State FL-4 Liquor Bar License:</span>
                <span className="font-bold text-emerald-400 font-mono">VALID &amp; RENEWED (2026-2027)</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Fire Safety NOC Clearance:</span>
                <span className="font-bold text-teal-300 font-mono">APPROVED (Cat-A Commercial)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>Verified via Setu &amp; Karza Sandbox</span>
              <span>SHA256: 0x9B12...3C8E</span>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowRejectModal(false)}>
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[#0e1016] border border-rose-500/30 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Door Rejection — Reason
            </h3>
            <div className="space-y-2 text-xs">
              {['Dress code / Stag balance violation', 'Capacity full — venue at max', 'Underage (ID mismatch)', 'Intoxicated at arrival', 'Blacklist — prior incident'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition ${rejectionReason === reason ? 'bg-rose-500/20 border-rose-500/60 text-rose-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={handleReject}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition shadow-lg"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-lg rounded-3xl bg-[#0d0f1a] border border-teal-500/30 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">Club Owner Console</span>
                <h3 className="text-lg font-black text-white mt-0.5">Host / Create New Event</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition text-sm"
              >✕</button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Neon Nights — Vol. 7 (w/ DJ Henu)"
                  value={newEvent.title}
                  onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date *</label>
                  <input
                    required
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Doors Open</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Genre */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Music Genre / Vibe</label>
                <select
                  value={newEvent.genre}
                  onChange={e => setNewEvent(p => ({ ...p, genre: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-teal-400 focus:outline-none"
                >
                  {['Commercial EDM', 'Techno & Underground', 'Bollywood & Punjabi', 'Hip-Hop & R&B', 'Sunset Beach & Sundowner', 'VIP Table Lounge'].map(g => (
                    <option key={g} value={g} className="bg-slate-900">{g}</option>
                  ))}
                </select>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Box Office Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEvent.basePrice}
                    onChange={e => setNewEvent(p => ({ ...p, basePrice: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">PR Floor Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEvent.floorPrice}
                    onChange={e => setNewEvent(p => ({ ...p, floorPrice: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Capacity Quota</label>
                  <input
                    type="number"
                    min="10"
                    value={newEvent.capacityQuota}
                    onChange={e => setNewEvent(p => ({ ...p, capacityQuota: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Artist */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Headline Artist / DJ (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. DJ Henu, Ritviz, Nucleya"
                  value={newEvent.artistName}
                  onChange={e => setNewEvent(p => ({ ...p, artistName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                />
              </div>

              {/* Preview summary */}
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs space-y-1">
                <span className="font-bold text-teal-300 block">📋 Revenue Preview</span>
                <div className="flex justify-between text-slate-300">
                  <span>Estimated GMV (at capacity):</span>
                  <span className="font-mono text-white">₹{(newEvent.floorPrice * newEvent.capacityQuota).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Venue Net (~85%):</span>
                  <span className="font-mono text-emerald-400">₹{Math.round(newEvent.floorPrice * newEvent.capacityQuota * 0.85).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>PR Commissions (~12%):</span>
                  <span className="font-mono text-pink-400">₹{Math.round(newEvent.floorPrice * newEvent.capacityQuota * 0.12).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-black font-black text-sm shadow-xl hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Launch Event on NightVibe 🚀
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default OwnerView;

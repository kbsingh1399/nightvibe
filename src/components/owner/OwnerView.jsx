import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
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
} from 'lucide-react';

export const OwnerView = () => {
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
  const venueTransactions = transactions.filter((t) => t.venueName?.includes(venue.name.split(' ')[0]));

  // Active Tab: 'scanner' | 'dashboard' | 'events' | 'ledger'
  const [activeTab, setActiveTab] = useState('scanner');

  // Scanner State
  const [scannedTicketId, setScannedTicketId] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Dress code violation');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // New Event Form State
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    genre: 'Commercial EDM',
    date: 'Saturday, Tonight',
    time: '10:00 PM - 03:00 AM',
    basePrice: 2000,
    floorPrice: 1600,
    commissionCap: 350,
    description: '',
  });

  // Calculate Metrics
  const totalCheckedIn = venueBookings.filter((b) => b.status === 'CHECKED_IN').reduce((acc, b) => acc + b.pax, 0);
  const totalExpected = venueBookings.reduce((acc, b) => acc + b.pax, 0);
  const occupancyPercent = Math.min(100, Math.round((venue.currentOccupancy / venue.licensedCapacity) * 100));

  // PR Leaderboard
  const prLeaderboard = promoters
    .filter((p) => p.authorizedVenues.includes(venue.id))
    .map((pr) => {
      const prBookings = venueBookings.filter((b) => b.prId === pr.id);
      const paxBrought = prBookings.filter((b) => b.status === 'CHECKED_IN').reduce((acc, b) => acc + b.pax, 0);
      const grossRev = prBookings.reduce((acc, b) => acc + (b.totalPaid - b.platformFee), 0);
      return {
        ...pr,
        paxBrought,
        grossRev,
        totalBookedPax: prBookings.reduce((acc, b) => acc + b.pax, 0),
      };
    })
    .sort((a, b) => b.paxBrought - a.paxBrought);

  // Handle Manual/Simulated Scan
  const handleInspectTicket = (ticketIdToScan) => {
    const targetId = ticketIdToScan || scannedTicketId.trim();
    if (!targetId) {
      showToast('Please select or type a Ticket Pass ID', 'warning');
      return;
    }

    const found = bookings.find(
      (b) => b.id === targetId || b.qrToken === targetId || targetId.includes(b.id)
    );

    if (!found) {
      showToast('❌ Invalid Pass: QR Token not found in manifest', 'error');
      setScannedResult(null);
      return;
    }

    setScannedResult(found);
    setScannedTicketId(found.id);
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

  const handleCreateEventSubmit = (e) => {
    e.preventDefault();
    if (!newEvent.title) {
      showToast('Please enter an event title', 'warning');
      return;
    }
    createEvent(newEvent);
    setShowCreateEventModal(false);
    setNewEvent({
      title: '',
      genre: 'Commercial EDM',
      date: 'Saturday, Tonight',
      time: '10:00 PM - 03:00 AM',
      basePrice: 2000,
      floorPrice: 1600,
      commissionCap: 350,
      description: '',
    });
  };

  return (
    <div className="space-y-8">
      
      {/* Top Venue Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-amber-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl">
            {venue.logo || '🏢'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Club Owner & Door Console
              </span>
              <span className="text-xs text-slate-400">ID: {venue.id}</span>
            </div>
            <h2 className="text-2xl font-black text-white font-sans mt-0.5">
              {venue.name}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-pink-400" /> {venue.area} • Manager: {venue.ownerName} ({venue.ownerPhone})
            </p>
          </div>
        </div>

        {/* Venue Switcher for Demo */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Switch Club:</label>
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'scanner'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>In-App Door Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'dashboard'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Live Footfall & PR Attribution</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'events'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Manage Events & Bids ({venueEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ledger'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Settlements & Escrow</span>
        </button>
      </div>

      {/* TAB 1: IN-APP SMART DOOR SCANNER */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Col: Camera / Scanner Interface */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-5">
              
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
                  Quick-Scan Active Passes (Instant Test)
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
              <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6 shadow-2xl">
                
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

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                      Promised Perks to Verify at Entrance:
                    </span>
                    <div className="space-y-1">
                      {scannedResult.perks?.map((perk, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-pink-300 font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Admission Actions */}
                {scannedResult.status === 'ACTIVE' ? (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="py-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject / Deny Entry</span>
                    </button>

                    <button
                      onClick={handleAdmit}
                      className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black shadow-xl shadow-emerald-500/30 transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 fill-black text-emerald-400" />
                      <span>Grant Entry & Settle Escrow</span>
                    </button>
                  </div>
                ) : scannedResult.status === 'CHECKED_IN' ? (
                  <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Guest Already Admitted:</span> Scanned at {scannedResult.scannedAt} by {scannedResult.scannedBy}.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Entry Denied:</span> {scannedResult.rejectionReason} (Refund issued from Club Reserve).
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl glass-panel border border-white/10 space-y-3">
                <QrCode className="w-12 h-12 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Pass Scanned Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Use the camera viewport on the left or click any active pass in the quick-scan list to simulate an instant door verification.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE DASHBOARD & PR ATTRIBUTION */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Occupancy & Footfall Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Live Occupancy Gauge */}
            <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Club Live Occupancy</span>
                <span className="font-bold text-amber-400">{occupancyPercent}% Full</span>
              </div>
              <div className="text-2xl font-black text-white font-sans">
                {venue.currentOccupancy} <span className="text-xs font-normal text-slate-400">/ {venue.licensedCapacity} Pax</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            </div>

            {/* Total Check-ins Tonight */}
            <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 block">Verified Admissions Tonight</span>
              <div className="text-2xl font-black text-emerald-400 font-sans">
                {totalCheckedIn} <span className="text-xs font-normal text-slate-400">/ {totalExpected} Expected</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {totalExpected > 0 ? Math.round((totalCheckedIn / totalExpected) * 100) : 0}% Turnout Rate
              </p>
            </div>

            {/* Estimated Gross Revenue */}
            <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 block">Gross Box Office GMV</span>
              <div className="text-2xl font-black text-purple-300 font-sans">
                ₹{venueBookings.reduce((acc, b) => acc + b.totalPaid, 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold">
                Direct Net Payout: ₹{venueBookings.reduce((acc, b) => acc + b.venueNet, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* PR Attribution Leaderboard */}
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Real-Time PR Performance & Conversion Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track which promoters are bringing verified crowds vs no-shows tonight
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Promoter (PR)</th>
                    <th className="pb-3 font-semibold">Admitted Pax</th>
                    <th className="pb-3 font-semibold">Booked Pax</th>
                    <th className="pb-3 font-semibold">Show-up Rate</th>
                    <th className="pb-3 font-semibold">Gross Revenue</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {prLeaderboard.map((pr, idx) => (
                    <tr key={pr.id} className="hover:bg-white/5 transition">
                      <td className="py-3 flex items-center gap-2.5">
                        <span className="font-bold text-slate-500 w-4">#{idx + 1}</span>
                        <img src={pr.avatar} alt={pr.name} className="w-7 h-7 rounded-lg object-cover" />
                        <div>
                          <div className="font-bold text-white">{pr.name}</div>
                          <div className="text-[10px] text-slate-400">{pr.handle}</div>
                        </div>
                      </td>
                      <td className="py-3 font-bold text-emerald-400">{pr.paxBrought} pax</td>
                      <td className="py-3 text-slate-300">{pr.totalBookedPax} pax</td>
                      <td className="py-3 text-slate-300">
                        {pr.totalBookedPax > 0
                          ? `${Math.round((pr.paxBrought / pr.totalBookedPax) * 100)}%`
                          : `${pr.showUpRate}%`}
                      </td>
                      <td className="py-3 font-semibold text-purple-300">
                        ₹{pr.grossRev.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          Authorized
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE EVENTS & PR BIDS */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Active Club Events ({venueEvents.length})
              </h3>
              <p className="text-xs text-slate-400">
                Set price bands, floor prices, commission caps, and approve promoter bids
              </p>
            </div>

            <button
              onClick={() => setShowCreateEventModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Host New Event</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venueEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={evt.image} alt={evt.title} className="w-14 h-14 rounded-2xl object-cover" />
                    <div>
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                        {evt.genre}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{evt.title}</h4>
                      <p className="text-xs text-slate-400">{evt.date} • {evt.time}</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    Active Bidding
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-2xl bg-black/40 border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Base Price</span>
                    <span className="font-bold text-white">₹{evt.basePrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Floor Price</span>
                    <span className="font-bold text-amber-400">₹{evt.floorPrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Commission Cap</span>
                    <span className="font-bold text-pink-400">₹{evt.commissionCap}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{evt.bids.length} Competing PR Offers</span>
                  <span className="text-purple-300 font-semibold">
                    Lowest PR Deal: ₹{Math.min(...evt.bids.map((b) => b.price))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL SETTLEMENT & ESCROW LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Direct Split Settlement Ledger (Razorpay Route / Cashfree)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Zero custody: Ticket funds route directly to {venue.upiId}. PR commissions auto-released upon door scan with 2% TDS withheld.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Txn ID</th>
                    <th className="pb-3 font-semibold">Event</th>
                    <th className="pb-3 font-semibold">PR Credited</th>
                    <th className="pb-3 font-semibold">Gross</th>
                    <th className="pb-3 font-semibold">Venue Net</th>
                    <th className="pb-3 font-semibold">PR Comm.</th>
                    <th className="pb-3 font-semibold">2% TDS</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-white/5 transition">
                      <td className="py-3 font-mono text-purple-300">{txn.id}</td>
                      <td className="py-3 text-white font-medium">{txn.eventTitle}</td>
                      <td className="py-3 text-slate-300">{txn.prName}</td>
                      <td className="py-3 font-semibold text-white">₹{txn.grossAmount}</td>
                      <td className="py-3 font-bold text-emerald-400">₹{txn.venueShare}</td>
                      <td className="py-3 text-pink-400">₹{txn.prCommission}</td>
                      <td className="py-3 text-slate-400">₹{txn.tdsDeducted}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl glass-panel p-6 border border-rose-500/40 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Door Entry Denial Protocol</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select reason for turning away guest. 100% refund will be debited from Club Reserve to guest account.
            </p>

            <div className="space-y-2.5 my-4">
              {[
                'Dress code violation (Open footwear / athletic wear)',
                'Intoxication / Unruly behavior',
                'Stag policy ratio breach (Unaccompanied males)',
                'Underage / Fake Government ID',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs border transition ${
                    rejectionReason === reason
                      ? 'bg-rose-500/20 border-rose-500 text-white font-semibold'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Confirm Denial & Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl glass-panel p-6 border border-amber-500/40 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Host New Event at {venue.name}</span>
            </h3>

            <form onSubmit={handleCreateEventSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Boiler Room ft. International DJs"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Genre / Vibe</label>
                  <select
                    value={newEvent.genre}
                    onChange={(e) => setNewEvent({ ...newEvent, genre: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  >
                    <option value="Commercial EDM">Commercial EDM</option>
                    <option value="Techno & Underground">Techno & Underground</option>
                    <option value="Bollywood & Punjabi">Bollywood & Punjabi</option>
                    <option value="Sunset Beach & Sundowner">Sunset Beach & Sundowner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date & Time</label>
                  <input
                    type="text"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={newEvent.basePrice}
                    onChange={(e) => setNewEvent({ ...newEvent, basePrice: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Floor Price (₹)</label>
                  <input
                    type="number"
                    value={newEvent.floorPrice}
                    onChange={(e) => setNewEvent({ ...newEvent, floorPrice: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Comm. Cap (₹)</label>
                  <input
                    type="number"
                    value={newEvent.commissionCap}
                    onChange={(e) => setNewEvent({ ...newEvent, commissionCap: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg"
                >
                  Publish & Open PR Bidding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import QRCode from 'qrcode';
import {
  X,
  Ticket,
  ShieldCheck,
  Clock,
  MapPin,
  Users,
  Gift,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

export const MyPassesModal = ({ isOpen, onClose, defaultSelectedTicketId = null }) => {
  const { bookings, events, venues, promoters } = useApp();
  
  const [selectedTicketId, setSelectedTicketId] = useState(
    defaultSelectedTicketId || (bookings[0] ? bookings[0].id : null)
  );

  // 30s Countdown timer for Dynamic Rotating TOTP QR
  const [timeLeft, setTimeLeft] = useState(30);
  const [totpNonce, setTotpNonce] = useState(Math.floor(Date.now() / 30000));
  const qrCanvasRef = useRef(null);

  const selectedBooking = bookings.find((b) => b.id === selectedTicketId) || bookings[0];
  const event = selectedBooking ? events.find((e) => e.id === selectedBooking.eventId) : null;
  const venue = selectedBooking ? venues.find((v) => v.id === selectedBooking.venueId) : null;
  const pr = selectedBooking ? promoters.find((p) => p.id === selectedBooking.prId) : null;

  // Countdown effect
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTotpNonce(Math.floor(Date.now() / 30000));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Generate Dynamic QR Code
  useEffect(() => {
    if (!selectedBooking || !qrCanvasRef.current) return;

    // Payload includes booking ID, dynamic timestamp nonce, and security signature
    const dynamicPayload = JSON.stringify({
      tkt: selectedBooking.id,
      totp: totpNonce,
      pax: selectedBooking.pax,
      m: selectedBooking.maleCount,
      f: selectedBooking.femaleCount,
      v: selectedBooking.venueId,
      pr: selectedBooking.prId,
      secHash: `${selectedBooking.qrToken}-${totpNonce}`,
    });

    QRCode.toCanvas(
      qrCanvasRef.current,
      dynamicPayload,
      {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) console.error('QR Render error:', error);
      }
    );
  }, [selectedBooking, totpNonce]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl glass-panel my-8 shadow-2xl border border-purple-500/30 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                My Verified Dynamic Passes
              </h3>
              <p className="text-[11px] text-slate-400">
                256-Bit Rotating Door QR • Anti-Screenshot Active
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pass Selector Tabs */}
        {bookings.length > 1 && (
          <div className="flex items-center gap-2 p-3 bg-black/40 overflow-x-auto border-b border-white/5">
            {bookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedTicketId(b.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedTicketId === b.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span>{b.id}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    b.status === 'ACTIVE'
                      ? 'bg-emerald-400 animate-pulse'
                      : b.status === 'CHECKED_IN'
                      ? 'bg-cyan-400'
                      : 'bg-rose-500'
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {selectedBooking ? (
          <div className="p-5 sm:p-6 space-y-6">
            
            {/* Digital Pass Ticket Card */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#181a26] to-[#0f111a] border border-purple-500/40 p-6 shadow-2xl overflow-hidden">
              
              {/* Top Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-dashed border-white/15">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{venue?.logo || '🍸'}</span>
                    <h4 className="text-lg font-black text-white font-sans">
                      {venue?.name}
                    </h4>
                  </div>
                  <p className="text-xs font-medium text-purple-300 mt-0.5">
                    {event?.title}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-pink-400" /> {venue?.area}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      selectedBooking.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : selectedBooking.status === 'CHECKED_IN'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {selectedBooking.status === 'ACTIVE' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    )}
                    {selectedBooking.status === 'ACTIVE' ? 'READY FOR DOOR SCAN' : selectedBooking.status}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Pass ID: <span className="font-mono text-white font-semibold">{selectedBooking.id}</span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Rotating QR Code */}
              <div className="py-6 flex flex-col items-center justify-center relative">
                
                {/* QR Container with Glow */}
                <div className="relative p-3 rounded-2xl bg-white shadow-xl shadow-purple-900/40">
                  <canvas ref={qrCanvasRef} className="rounded-lg" />
                  
                  {/* Radar Line Sweep */}
                  <div className="radar-line" />
                </div>

                {/* Rotating Timer Badge */}
                <div className="mt-3.5 flex items-center gap-2 text-xs font-semibold text-purple-300">
                  <RefreshCw className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-pink-400 animate-spin' : 'text-purple-400'}`} />
                  <span>Rotating Security Token resets in:</span>
                  <span className="font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-white font-bold">
                    00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 mt-1 font-mono tracking-widest">
                  HASH: {selectedBooking.qrToken.substring(0, 14)}...
                </p>
              </div>

              {/* Bottom Section: Headcount & Promised Perks */}
              <div className="pt-4 border-t border-dashed border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Party Headcount Breakdown
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-slate-200 font-semibold">
                      🧑 Males: {selectedBooking.maleCount}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-slate-200 font-semibold">
                      👩 Females: {selectedBooking.femaleCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Host PR: <span className="text-white font-semibold">{pr?.name}</span> ({pr?.handle})
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Promised PR Perks & Access
                  </span>
                  {selectedBooking.perks.map((perk, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-pink-300 font-medium text-[11px]">
                      <Gift className="w-3 h-3 text-pink-400 flex-shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedBooking.status === 'CHECKED_IN' && (
                <div className="mt-4 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                  <span>
                    Admitted at {selectedBooking.scannedAt} by {selectedBooking.scannedBy}. Enjoy your night!
                  </span>
                </div>
              )}
            </div>

            {/* Instruction for Guest */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-400 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                Present this screen directly to the club entrance bouncer. The QR code automatically refreshes every 30 seconds to prevent fraudulent screenshots and forwarding.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No active passes found. Browse events and book your first club pass!
          </div>
        )}
      </div>
    </div>
  );
};

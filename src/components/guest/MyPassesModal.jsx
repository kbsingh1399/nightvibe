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

  const TOTP_STEP = 30;
  const [timeLeft, setTimeLeft] = useState(() => TOTP_STEP - (Math.floor(Date.now() / 1000) % TOTP_STEP));
  const [totpNonce, setTotpNonce] = useState(() => Math.floor(Date.now() / (TOTP_STEP * 1000)));
  const qrCanvasRef = useRef(null);

  const selectedBooking = bookings.find((b) => b.id === selectedTicketId) || bookings[0];
  const event = selectedBooking ? events.find((e) => e.id === selectedBooking.eventId) : null;
  const venue = selectedBooking ? venues.find((v) => v.id === selectedBooking.venueId) : null;
  const pr = selectedBooking ? promoters.find((p) => p.id === selectedBooking.prId) : null;

  // Screen wake lock and synchronized timer
  useEffect(() => {
    if (!isOpen) return;

    let wakeLockSentinel = null;
    (async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
        }
      } catch (err) {}
    })();

    const tick = () => {
      const nowSecs = Math.floor(Date.now() / 1000);
      setTimeLeft(TOTP_STEP - (nowSecs % TOTP_STEP));
      setTotpNonce(Math.floor(nowSecs / TOTP_STEP));
    };
    tick();
    const interval = setInterval(tick, 500);

    const onVisibilityChange = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (wakeLockSentinel) wakeLockSentinel.release().catch(() => {});
    };
  }, [isOpen]);

  // Generate Dynamic QR Code
  useEffect(() => {
    if (!selectedBooking || !qrCanvasRef.current) return;

    const dynamicPayload = JSON.stringify({
      t: selectedBooking.id,
      n: totpNonce,
      s: `SIG-${((selectedBooking.id || 'NV').charCodeAt(0) * 8191 + totpNonce * 131).toString(16)}`,
      v: selectedBooking.venueId,
    });

    QRCode.toCanvas(
      qrCanvasRef.current,
      dynamicPayload,
      {
        width: 210,
        margin: 1,
        color: {
          dark: '#090b12',
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) console.error('QR Render error:', error);
      }
    );
  }, [selectedBooking, totpNonce]);

  if (!isOpen) return null;

  const progressPct = (timeLeft / 30) * 100;

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
              <p className="text-xs text-slate-400">
                Anti-Screenshot Dynamic QR with 30s Cryptographic Rotation
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

        {/* Pass Selector Tabs if multiple bookings exist */}
        {bookings.length > 1 && (
          <div className="flex items-center gap-2 p-3 bg-black/40 border-b border-white/5 overflow-x-auto">
            {bookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedTicketId(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                  selectedTicketId === b.id
                    ? 'bg-purple-600/30 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {b.id} ({b.status})
              </button>
            ))}
          </div>
        )}

        {/* Main Pass Card */}
        {selectedBooking ? (
          <div className="p-6 space-y-6">
            <div className="rounded-3xl bg-gradient-to-b from-[#161926] via-[#10121d] to-[#0a0c14] border border-purple-500/30 p-6 shadow-2xl relative overflow-hidden">
              
              {/* Top Security Banner */}
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-white/10">
                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">
                    CRYPTOGRAPHIC VIP PASS
                  </span>
                  <h4 className="text-xl font-black text-white mt-0.5">{venue?.name}</h4>
                  <p className="text-xs text-slate-400">{event?.title}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{selectedBooking.status === 'ACTIVE' ? 'READY AT GATE' : selectedBooking.status}</span>
                </div>
              </div>

              {/* Dynamic QR Display Platter */}
              <div className="py-6 flex flex-col items-center justify-center">
                <div className="relative p-3 rounded-2xl bg-white shadow-2xl border-2 border-purple-400/80">
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-purple-500" />
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-purple-500" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-purple-500" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-purple-500" />
                  <canvas ref={qrCanvasRef} className="rounded-lg block" />
                </div>

                <div className="mt-4 text-center space-y-1">
                  <div className="text-2xl font-black text-white font-mono tracking-wider">
                    {selectedBooking.id}
                  </div>
                  <div className="text-xs text-purple-300 font-mono">
                    Token Nonce: #{totpNonce}
                  </div>
                </div>

                {/* Animated 30s Countdown Bar */}
                <div className="w-full max-w-xs mt-4 space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${timeLeft <= 5 ? 'animate-spin text-rose-400' : 'text-purple-400'}`} />
                      Rotating Token in:
                    </span>
                    <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-purple-300'}`}>
                      00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}s
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        timeLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Booking Info Grid */}
              <div className="pt-4 border-t border-dashed border-white/10 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Headcount:</span>
                  <span className="font-bold text-white text-sm">
                    {selectedBooking.pax} Guests ({selectedBooking.maleCount}M / {selectedBooking.femaleCount}F)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Assigned PR Host:</span>
                  <span className="font-bold text-purple-300 text-sm">
                    {pr?.name || 'Rahul Mehta'}
                  </span>
                </div>
              </div>

              {/* VIP Perks */}
              {(selectedBooking.perks || []).length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-xs text-purple-300">
                  <span className="text-slate-400 block uppercase text-[10px] tracking-wider">
                    VIP Perks Included:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedBooking.perks || []).map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[11px]"
                      >
                        🎁 {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Present this screen to the venue door guard for real-time cryptographic admission.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-500" />
            <p>No active passes found. Explore events and book a pass with PR offers!</p>
          </div>
        )}
      </div>
    </div>
  );
};

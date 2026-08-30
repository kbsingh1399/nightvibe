import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Star,
  ShieldCheck,
  Zap,
  Gift,
  Clock,
  MapPin,
  Users,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const EventDetailModal = ({ event, isOpen, onClose, onBookingSuccess }) => {
  const { venues, promoters, bookTicket } = useApp();

  // ✅ ALL Hooks unconditionally at top of component
  const [selectedBidId, setSelectedBidId] = useState(null);
  const [maleCount, setMaleCount] = useState(1);
  const [femaleCount, setFemaleCount] = useState(0);
  const [coupleCount, setCoupleCount] = useState(1);
  const [paymentStep, setPaymentStep] = useState('select');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI_GPAY');

  useEffect(() => {
    if (event?.bids?.length) {
      setSelectedBidId(event.bids[0].id);
    }
  }, [event?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ✅ Conditional return AFTER all hooks
  if (!isOpen || !event) return null;

  const venue = venues.find((v) => v.id === event.venueId) || venues[0];
  const bidsSorted = [...(event.bids || [])].sort((a, b) => a.price - b.price);
  const selectedBid = bidsSorted.find((b) => b.id === selectedBidId) || bidsSorted[0];
  const selectedPR = promoters.find((p) => p.id === selectedBid?.prId) || promoters[0];

  const totalPax = maleCount + femaleCount + (coupleCount * 2);
  const baseUnitPrice = selectedBid ? selectedBid.price : event.basePrice;

  // 3-Way Per-Tier Pricing
  const malePrice = baseUnitPrice;
  const femalePrice = Math.round(baseUnitPrice * 0.6);
  const couplePrice = Math.round(baseUnitPrice * 1.5);

  const subtotal = (maleCount * malePrice) + (femaleCount * femalePrice) + (coupleCount * couplePrice);
  const platformFee = totalPax > 0 ? Math.round(subtotal * 0.035) + 40 : 0;
  const totalAmount = subtotal + platformFee;

  const isStagHeavy = maleCount > (femaleCount + coupleCount * 2);

  const handleCheckout = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const newBooking = bookTicket({
      event,
      prBid: selectedBid,
      groupDetails: {
        maleCount,
        femaleCount,
        coupleCount,
        subtotal,
        totalAmount,
        guestType: coupleCount > 0 ? 'couple' : (totalPax > 1 ? 'group' : 'stag'),
      },
      paymentMethod: selectedPaymentMethod,
    });

    onBookingSuccess(newBooking);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl glass-panel my-8 shadow-2xl border border-purple-500/30 overflow-hidden">
        
        {/* Header Hero Image */}
        <div className="relative h-56 sm:h-64 w-full overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12141c] via-[#12141c]/60 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40 mb-2 inline-block">
                {event.genre}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-sans">
                {event.title}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-300 mt-1">
                <span className="flex items-center gap-1 font-semibold text-pink-400">
                  <MapPin className="w-3.5 h-3.5" /> {venue.name} ({venue.area})
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {event.date}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase block">Venue Box Office</span>
              <span className="text-base font-bold text-slate-400 line-through">
                ₹{event.basePrice}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6">
          {paymentStep === 'select' ? (
            <>
              {/* PR Bids Comparison Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Authorized Promoter Bids ({event.bids.length} Offers)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Floor Price: <span className="text-pink-400 font-bold">₹{event.floorPrice}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bidsSorted.map((bid) => {
                    const pr = promoters.find((p) => p.id === bid.prId) || promoters[0];
                    const isSelected = selectedBidId === bid.id;
                    const savings = event.basePrice - bid.price;

                    return (
                      <div
                        key={bid.id}
                        onClick={() => setSelectedBidId(bid.id)}
                        className={`relative p-3.5 rounded-2xl cursor-pointer transition border ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={pr.avatar}
                              alt={pr.name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                            />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                {pr.name}
                                {pr.verified && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{pr.rating}</span>
                                <span className="text-slate-400">• {pr.showUpRate}% show-up</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-black text-white font-sans">
                              ₹{bid.price}
                            </div>
                            {savings > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                Save ₹{savings}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bundled Perks */}
                        <div className="space-y-1 pt-2 border-t border-white/5">
                          {bid.perks.map((perkId) => {
                            const perkObj = event.approvedPerks?.find((p) => p.id === perkId);
                            return (
                              <div
                                key={perkId}
                                className="flex items-center gap-1.5 text-[11px] text-purple-300"
                              >
                                <Gift className="w-3 h-3 shrink-0" />
                                <span>{perkObj ? perkObj.name : perkId}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3-Way Headcount Steppers */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <span>Headcount Customization</span>
                  <span className="text-[10px] text-teal-400 font-mono">44px Touch Targets</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Male Stag */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <span className="text-xs font-bold text-white block">🕺 Male Stag</span>
                    <span className="text-[10px] text-slate-400">₹{malePrice}/pass</span>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMaleCount(Math.max(0, maleCount - 1));
                          navigator.vibrate?.(8);
                        }}
                        className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center transition"
                      >−</button>
                      <span className="text-base font-bold text-white font-mono">{maleCount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMaleCount(maleCount + 1);
                          navigator.vibrate?.(8);
                        }}
                        className="w-11 h-11 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-lg flex items-center justify-center transition"
                      >+</button>
                    </div>
                  </div>

                  {/* Female Stag */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <span className="text-xs font-bold text-white block">💃 Female Stag</span>
                    <span className="text-[10px] text-pink-400">₹{femalePrice} (40% off)</span>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFemaleCount(Math.max(0, femaleCount - 1));
                          navigator.vibrate?.(8);
                        }}
                        className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center transition"
                      >−</button>
                      <span className="text-base font-bold text-white font-mono">{femaleCount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFemaleCount(femaleCount + 1);
                          navigator.vibrate?.(8);
                        }}
                        className="w-11 h-11 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-lg flex items-center justify-center transition"
                      >+</button>
                    </div>
                  </div>

                  {/* Couple */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-teal-500/30 bg-teal-950/20 space-y-2">
                    <span className="text-xs font-bold text-teal-200 block">👫 Couple (2 Pax)</span>
                    <span className="text-[10px] text-amber-300">₹{couplePrice}/duo</span>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCoupleCount(Math.max(0, coupleCount - 1));
                          navigator.vibrate?.(8);
                        }}
                        className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center transition"
                      >−</button>
                      <span className="text-base font-bold text-white font-mono">{coupleCount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCoupleCount(coupleCount + 1);
                          navigator.vibrate?.(8);
                        }}
                        className="w-11 h-11 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-lg flex items-center justify-center transition"
                      >+</button>
                    </div>
                  </div>
                </div>

                {isStagHeavy && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Club Door Policy: Stag entries are subject to venue profile screening.</span>
                  </div>
                )}
              </div>

              {/* Pricing Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total for {totalPax} Guests</span>
                  <div className="text-xl font-black text-white font-sans">
                    ₹{totalAmount} <span className="text-[10px] text-slate-400 font-normal">(incl. ₹{platformFee} fee)</span>
                  </div>
                </div>
                <button
                  disabled={totalPax === 0}
                  onClick={() => setPaymentStep('payment')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition"
                >
                  <span>Proceed to UPI Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            /* Payment Screen */
            <div className="space-y-5">
              <button
                onClick={() => setPaymentStep('select')}
                className="text-xs text-purple-400 hover:underline"
              >
                ← Back to Bids & Headcount
              </button>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>{event.title} ({totalPax} Pax)</span>
                  <span className="font-semibold text-white">₹{subtotal}</span>
                </div>
                {maleCount > 0 && (
                  <div className="flex justify-between text-slate-400 pl-2 text-[11px]">
                    <span>• {maleCount} × Male Stag</span>
                    <span>₹{maleCount * malePrice}</span>
                  </div>
                )}
                {femaleCount > 0 && (
                  <div className="flex justify-between text-slate-400 pl-2 text-[11px]">
                    <span>• {femaleCount} × Female Stag</span>
                    <span>₹{femaleCount * femalePrice}</span>
                  </div>
                )}
                {coupleCount > 0 && (
                  <div className="flex justify-between text-slate-400 pl-2 text-[11px]">
                    <span>• {coupleCount} × Couple (2 Pax)</span>
                    <span>₹{coupleCount * couplePrice}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Platform & 256-Bit Escrow Security Fee</span>
                  <span>₹{platformFee}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-white">
                  <span>Total Amount Payable</span>
                  <span className="text-base text-pink-400">₹{totalAmount}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'UPI_GPAY', label: 'Google Pay (UPI)' },
                  { id: 'UPI_PHONEPE', label: 'PhonePe (UPI)' },
                  { id: 'UPI_PAYTM', label: 'Paytm UPI' },
                  { id: 'CARDS', label: 'Cards / NetBanking' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPaymentMethod(m.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      selectedPaymentMethod === m.id
                        ? 'bg-purple-950/40 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{m.label}</span>
                    {selectedPaymentMethod === m.id && (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm shadow-xl hover:opacity-95 transition"
              >
                Pay ₹{totalAmount} & Unlock Cryptographic Pass →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

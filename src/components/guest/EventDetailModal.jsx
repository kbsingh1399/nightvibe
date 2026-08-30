import React, { useState } from 'react';
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
  
  if (!isOpen || !event) return null;

  const venue = venues.find((v) => v.id === event.venueId) || venues[0];

  // Selected PR Bid
  const [selectedBidId, setSelectedBidId] = useState(event.bids[0]?.id || null);
  
  // Group Headcount
  const [maleCount, setMaleCount] = useState(1);
  const [femaleCount, setFemaleCount] = useState(1);
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'payment'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI_GPAY');

  const selectedBid = event.bids.find((b) => b.id === selectedBidId) || event.bids[0];
  const selectedPR = promoters.find((p) => p.id === selectedBid?.prId) || promoters[0];

  const totalPax = maleCount + femaleCount;
  const unitPrice = selectedBid ? selectedBid.price : event.basePrice;
  const subtotal = unitPrice * totalPax;
  const platformFee = Math.round(subtotal * 0.035) + 40;
  const totalAmount = subtotal + platformFee;

  // Stag policy warning check
  const isStagHeavy = maleCount > femaleCount;

  const handleCheckout = () => {
    // Trigger confetti animation
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
        guestType: totalPax > 2 ? 'group' : 'couple',
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
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> {event.date} • {event.time}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Official Venue Box Office
              </span>
              <span className="text-lg font-bold text-slate-400 line-through">
                ₹{event.basePrice}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {paymentStep === 'select' ? (
            <>
              {/* Promoters Bidding Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5 font-sans">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Authorized Promoter Bids ({event.bids.length} Active Offers)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Promoters compete to give you the lowest price and best perks. Choose your preferred PR:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {event.bids.map((bid) => {
                    const pr = promoters.find((p) => p.id === bid.prId) || promoters[0];
                    const isSelected = selectedBidId === bid.id;
                    const savings = event.basePrice - bid.price;

                    return (
                      <div
                        key={bid.id}
                        onClick={() => setSelectedBidId(bid.id)}
                        className={`p-4 rounded-2xl cursor-pointer transition relative border ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-900/30 ring-1 ring-purple-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Selected Radio Indicator */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={pr.avatar}
                              alt={pr.name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-purple-500/40"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{pr.name}</span>
                                {pr.verified && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                  <Star className="w-3 h-3 fill-amber-400" /> {pr.rating}
                                </span>
                                <span>•</span>
                                <span>{pr.conversions}+ check-ins</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-extrabold text-white">
                              ₹{bid.price}
                            </div>
                            {savings > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Save ₹{savings}/pax
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Perks Included */}
                        <div className="space-y-1 pt-1 border-t border-white/5">
                          {bid.perks.map((pId) => {
                            const perkObj = event.approvedPerks?.find((ap) => ap.id === pId);
                            return (
                              <div
                                key={pId}
                                className="flex items-center gap-1.5 text-[11px] text-purple-300 font-medium"
                              >
                                <Gift className="w-3 h-3 text-pink-400 flex-shrink-0" />
                                <span>{perkObj ? perkObj.name : pId}</span>
                              </div>
                            );
                          })}
                        </div>

                        <p className="text-[10px] text-slate-400 italic mt-2">
                          "{bid.notes}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group Customization & Headcount */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Customize Your Party Size</span>
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {/* Male Count */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Stags / Males</span>
                      <span className="text-[10px] text-slate-400">Must follow dress code</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMaleCount(Math.max(0, maleCount - 1))}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-white w-4 text-center">{maleCount}</span>
                      <button
                        onClick={() => setMaleCount(maleCount + 1)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Female Count */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Females / Couples</span>
                      <span className="text-[10px] text-slate-400">Priority guestlist</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setFemaleCount(Math.max(0, femaleCount - 1))}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-white w-4 text-center">{femaleCount}</span>
                      <button
                        onClick={() => setFemaleCount(femaleCount + 1)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {isStagHeavy && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Notice: Venue enforces a 1:1 couple ratio on peak hours. Your PR ({selectedPR.name}) will meet your group at the VIP desk for manual stag clearance.
                    </span>
                  </div>
                )}
              </div>

              {/* Venue Rules & Disclaimers */}
              <div className="text-[11px] text-slate-400 space-y-1 px-1">
                <p>👗 <span className="font-semibold text-slate-300">Dress Code:</span> {venue.dressCode}</p>
                <p>🔞 <span className="font-semibold text-slate-300">Age Limit:</span> {venue.ageLimit} • Physical Government ID mandatory.</p>
              </div>

              {/* Summary Bar & Next Button */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total for {totalPax} Guests</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white font-sans">
                      ₹{totalAmount}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      (incl. ₹{platformFee} fee)
                    </span>
                  </div>
                </div>

                <button
                  disabled={totalPax === 0}
                  onClick={() => setPaymentStep('payment')}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-sm font-bold shadow-xl shadow-purple-600/30 transition flex items-center gap-2"
                >
                  <span>Proceed to One-Tap UPI</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            /* Step 2: Instant Razorpay / UPI Checkout Simulation */
            <div className="space-y-6">
              <div>
                <button
                  onClick={() => setPaymentStep('select')}
                  className="text-xs text-purple-400 hover:underline mb-2 inline-block font-medium"
                >
                  ← Back to Bids & Group selection
                </button>
                <h3 className="text-lg font-bold text-white font-sans">
                  Complete Booking with Instant UPI / Cards
                </h3>
                <p className="text-xs text-slate-400">
                  Zero custody split: Your ₹{subtotal - (selectedBid ? selectedBid.price * 0.2 : 0)} goes directly to {venue.name} bank account.
                </p>
              </div>

              {/* Bill Breakdown */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>{event.title} ({totalPax} Pax × ₹{unitPrice})</span>
                  <span className="font-semibold text-white">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Promoter Discount Applied ({selectedPR.name})</span>
                  <span className="text-emerald-400 font-semibold">-₹{(event.basePrice - unitPrice) * totalPax}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Platform Gateway & 256-bit Dynamic QR Fee</span>
                  <span>₹{platformFee}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-white">
                  <span>Total Amount Payable</span>
                  <span className="text-lg gradient-text-purple">₹{totalAmount}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Fast UPI Gateway
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'UPI_GPAY', name: 'Google Pay', icon: '🟢' },
                    { id: 'UPI_PHONEPE', name: 'PhonePe', icon: '🟣' },
                    { id: 'UPI_PAYTM', name: 'Paytm UPI', icon: '🔵' },
                    { id: 'CARDS', name: 'Credit / Debit', icon: '💳' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-semibold ${
                        selectedPaymentMethod === method.id
                          ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <span>{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Escrow Guarantee Alert */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-bold">100% Door Entry Guarantee:</span> Promoter commission (₹{selectedBid ? Math.max(150, (event.basePrice - selectedBid.price) + 120) * totalPax : 0}) is held in smart escrow and ONLY released when the club bouncer scans your pass at the entrance!
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black text-sm font-extrabold shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-black" />
                  <span>Pay ₹{totalAmount} & Unlock Dynamic QR Pass</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

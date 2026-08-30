import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GENRES, CITIES } from '../../data/initialData';
import { EventDetailModal } from './EventDetailModal';
import {
  Sparkles,
  MapPin,
  Clock,
  Star,
  Users,
  Flame,
  Gift,
  ArrowRight,
  ShieldCheck,
  Music,
  Compass,
} from 'lucide-react';

export const GuestView = ({ onOpenPassWithTicketId }) => {
  const {
    activeCity,
    selectedGenre,
    setSelectedGenre,
    searchQuery,
    events,
    venues,
    promoters,
  } = useApp();

  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);

  // Filter events by City, Genre, Search
  const filteredEvents = events.filter((evt) => {
    const venue = venues.find((v) => v.id === evt.venueId);
    const cityMatch = venue?.city === activeCity;
    const genreMatch = selectedGenre === 'All Vibes' || evt.genre === selectedGenre;
    const searchMatch =
      searchQuery.trim() === '' ||
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.genre.toLowerCase().includes(searchQuery.toLowerCase());

    return cityMatch && genreMatch && searchMatch;
  });

  const cityName = CITIES.find((c) => c.id === activeCity)?.name || 'Mumbai';

  return (
    <div className="space-y-10">
      
      {/* Hero Nightlife Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-purple-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950/60 via-[#12141c]/90 to-[#090a0f] pointer-events-none" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Flame className="w-4 h-4 text-pink-400 fill-pink-400" />
            <span>Competitive PR Bidding Live in {cityName}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-sans">
            Never Pay Full Box Office at <span className="gradient-text-purple">Top Clubs</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Verified club promoters bid in real time to give you the lowest entry prices, queue jumps, and free welcome shooters. Zero hassle.
          </p>

          {/* Quick Metrics */}
          <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>100% Authentic Authorized PRs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Dynamic 30s Anti-Fraud Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-pink-400" />
              <span>Complimentary Perks Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Genre / Vibe Selector Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-sans">
            <Music className="w-4 h-4 text-purple-400" />
            <span>Filter by Music Vibe & Experience</span>
          </h3>
          <span className="text-xs text-slate-500">
            Showing {filteredEvents.length} Events in {cityName}
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
                selectedGenre === genre
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const venue = venues.find((v) => v.id === evt.venueId);
            const lowestBid = evt.bids.length > 0
              ? evt.bids.reduce((min, b) => (b.price < min.price ? b : min), evt.bids[0])
              : null;
            const savings = lowestBid ? evt.basePrice - lowestBid.price : 0;

            return (
              <div
                key={evt.id}
                className="group rounded-3xl glass-panel glass-panel-hover overflow-hidden border border-white/10 flex flex-col justify-between"
              >
                {/* Event Image & Badges */}
                <div className="relative h-52 w-full overflow-hidden">
                  <img
                    src={evt.image}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141c] via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-purple-300 border border-white/10">
                      {evt.genre}
                    </span>

                    {savings > 0 && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/90 text-black shadow-lg">
                        Save up to ₹{savings}
                      </span>
                    )}
                  </div>

                  {/* Date & Time pill */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10">
                    <Clock className="w-3.5 h-3.5 text-pink-400" />
                    <span>{evt.date} • {evt.time}</span>
                  </div>
                </div>

                {/* Event Details Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-400" />
                      <span className="font-semibold text-slate-300">{venue?.name}</span>
                      <span>({venue?.area.split(',')[0]})</span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition font-sans line-clamp-1">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>

                  {/* Competitive PR Bids Showcase */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    
                    {/* Bids Header */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {evt.bids.length} PR Bids available
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 line-through text-[11px]">
                          ₹{evt.basePrice}
                        </span>
                        <span className="text-sm font-extrabold text-white">
                          from ₹{lowestBid ? lowestBid.price : evt.basePrice}
                        </span>
                      </div>
                    </div>

                    {/* PR Avatars Pile */}
                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/5">
                      <div className="flex items-center -space-x-2 overflow-hidden">
                        {evt.bids.slice(0, 3).map((b) => {
                          const pr = promoters.find((p) => p.id === b.prId);
                          return (
                            <img
                              key={b.id}
                              src={pr?.avatar}
                              alt={pr?.name}
                              title={`${pr?.name} (₹${b.price})`}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-[#12141c] object-cover"
                            />
                          );
                        })}
                        <span className="text-[10px] text-purple-300 font-semibold pl-3">
                          Verified PRs Competing
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Perks Included
                      </span>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => setSelectedEventForDetail(evt)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-1.5"
                    >
                      <span>Compare PR Bids & Book</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl glass-panel border border-white/10 space-y-3">
          <Compass className="w-10 h-10 text-purple-400 mx-auto" />
          <h4 className="text-base font-bold text-white">No active events matching your filter in {cityName}</h4>
          <p className="text-xs text-slate-400">
            Try selecting "All Vibes" or switch metro to Mumbai or North Goa.
          </p>
        </div>
      )}

      {/* Featured Metro Venues Spotlight */}
      <div className="space-y-4 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-sans">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Top Verified Partner Clubs in {cityName}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues
            .filter((v) => v.city === activeCity)
            .map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl glass-panel border border-white/10 flex items-center gap-3.5 hover:border-purple-500/40 transition"
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate">{v.name}</h4>
                    <span className="flex items-center gap-0.5 text-amber-400 text-xs font-bold">
                      <Star className="w-3 h-3 fill-amber-400" /> {v.rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{v.area}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-purple-300">
                    <span>Cap: {v.capacity} pax</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{v.dressCode.split('.')[0]}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Event Details & Bids Modal */}
      {selectedEventForDetail && (
        <EventDetailModal
          event={selectedEventForDetail}
          isOpen={!!selectedEventForDetail}
          onClose={() => setSelectedEventForDetail(null)}
          onBookingSuccess={(booking) => {
            onOpenPassWithTicketId(booking.id);
          }}
        />
      )}
    </div>
  );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CITIES,
  GENRES,
  INITIAL_VENUES,
  INITIAL_PROMOTERS,
  INITIAL_EVENTS,
  INITIAL_BOOKINGS,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Role: 'guest' | 'owner' | 'pr'
  const [role, setRole] = useState(() => localStorage.getItem('nv_role') || 'guest');
  
  // Selected City & Genre Filter
  const [activeCity, setActiveCity] = useState(() => localStorage.getItem('nv_city') || 'mumbai');
  const [selectedGenre, setSelectedGenre] = useState('All Vibes');
  const [searchQuery, setSearchQuery] = useState('');

  // Core Data Store (with localStorage caching)
  const [venues, setVenues] = useState(() => {
    const saved = localStorage.getItem('nv_venues');
    return saved ? JSON.parse(saved) : INITIAL_VENUES;
  });

  const [promoters, setPromoters] = useState(() => {
    const saved = localStorage.getItem('nv_promoters');
    return saved ? JSON.parse(saved) : INITIAL_PROMOTERS;
  });

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('nv_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('nv_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('nv_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // Current Active Persona Profile
  const [currentUser, setCurrentUser] = useState(() => {
    return {
      name: 'Arjun Kapoor',
      phone: '+91 98200 44321',
      email: 'arjun.k@gmail.com',
      upiId: 'arjun@okaxis',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    };
  });

  // Active Owner & PR selection for testing views
  const [activeOwnerVenueId, setActiveOwnerVenueId] = useState('venue_trilogy');
  const [activePrId, setActivePrId] = useState('pr_rahul');

  // Razorpay Gateway Config
  const [razorpayConfig, setRazorpayConfig] = useState(() => {
    const saved = localStorage.getItem('nv_razorpay');
    return saved ? JSON.parse(saved) : {
      keyId: 'rzp_test_NightVibe991',
      keySecret: 'sec_test_vault887a1',
      routeAccountId: 'acc_TrilogyRoute01',
      mode: 'simulated', // 'simulated' | 'live'
      autoTds: true,
      instantPayout: true,
    };
  });

  // Toast Notification System
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('nv_role', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('nv_city', activeCity);
  }, [activeCity]);

  useEffect(() => {
    localStorage.setItem('nv_venues', JSON.stringify(venues));
  }, [venues]);

  useEffect(() => {
    localStorage.setItem('nv_promoters', JSON.stringify(promoters));
  }, [promoters]);

  useEffect(() => {
    localStorage.setItem('nv_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('nv_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('nv_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('nv_razorpay', JSON.stringify(razorpayConfig));
  }, [razorpayConfig]);

  // Book Ticket Action (Partygoer)
  const bookTicket = ({ event, prBid, groupDetails, paymentMethod = 'UPI' }) => {
    const pr = promoters.find((p) => p.id === prBid.prId) || promoters[0];
    const venue = venues.find((v) => v.id === event.venueId) || venues[0];

    const pax = (groupDetails.maleCount || 0) + (groupDetails.femaleCount || 0);
    const subtotal = prBid.price * pax;
    const platformFee = Math.round(subtotal * 0.035) + 40; // 3.5% + ₹40 convenience fee
    const totalPaid = subtotal + platformFee;
    
    // Split Breakdown:
    // PR Commission: Difference between base price and PR discounted price OR fixed cut
    const prCommissionPerPax = Math.max(150, (event.basePrice - prBid.price) + 120);
    const totalPrCommission = prCommissionPerPax * pax;
    const venueNet = subtotal - totalPrCommission;

    const newTicketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const qrToken = `NV1-${newTicketId}-${randomHex}`;

    const newBooking = {
      id: newTicketId,
      eventId: event.id,
      venueId: event.venueId,
      prId: pr.id,
      guestName: groupDetails.guestName || currentUser.name,
      guestPhone: groupDetails.guestPhone || currentUser.phone,
      guestEmail: groupDetails.guestEmail || currentUser.email,
      guestType: groupDetails.guestType || (pax > 2 ? 'group' : 'couple'),
      maleCount: groupDetails.maleCount || 1,
      femaleCount: groupDetails.femaleCount || 1,
      pax,
      pricePerPax: prBid.price,
      totalPaid,
      platformFee,
      prCommission: totalPrCommission,
      venueNet,
      perks: prBid.perks.map((pId) => {
        const perkObj = event.approvedPerks?.find((ap) => ap.id === pId);
        return perkObj ? perkObj.name : pId;
      }),
      status: 'ACTIVE',
      bookingTime: 'Just now',
      qrToken,
      paymentMethod,
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Update PR conversion count
    setPromoters((prev) =>
      prev.map((p) => (p.id === pr.id ? { ...p, conversions: p.conversions + 1 } : p))
    );

    showToast(`🎉 Booking Confirmed! Dynamic QR Pass Generated for ${venue.name}`, 'success');
    return newBooking;
  };

  // Door Scan & Admission Action (Club Owner / Door Manager View)
  const scanTicket = (ticketId, action, reason = '') => {
    const booking = bookings.find((b) => b.id === ticketId || b.qrToken === ticketId);
    if (!booking) {
      showToast('❌ Invalid Pass: QR Token not found in manifest', 'error');
      return { success: false, message: 'Ticket not found' };
    }

    if (booking.status === 'CHECKED_IN') {
      showToast('⚠️ Duplicate Scan: This QR code has already been admitted!', 'error');
      return { success: false, message: 'Duplicate Scan' };
    }

    if (action === 'ADMIT') {
      // Mark as CHECKED_IN
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, status: 'CHECKED_IN', scannedAt: nowTime, scannedBy: 'Club Manager (In-App)' }
            : b
        )
      );

      // Settle Financial Split & Trigger Instant PR Payout
      const tdsDeducted = Math.round(booking.prCommission * 0.02); // 2% TDS u/s 194H
      const netPrPayout = booking.prCommission - tdsDeducted;
      const pr = promoters.find((p) => p.id === booking.prId);
      const venue = venues.find((v) => v.id === booking.venueId);

      const newTxn = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        bookingId: booking.id,
        eventTitle: events.find((e) => e.id === booking.eventId)?.title || 'Club Event',
        venueName: venue?.name || 'Club Venue',
        prName: `${pr?.name} (${pr?.handle})`,
        grossAmount: booking.totalPaid - booking.platformFee,
        platformFee: booking.platformFee,
        venueShare: booking.venueNet,
        prCommission: booking.prCommission,
        tdsDeducted,
        netPrPayout,
        status: 'SETTLED',
        payoutUpi: pr?.upiId || 'pr.wallet@upi',
        settlementTimestamp: `Today, ${nowTime}`,
      };

      setTransactions((prev) => [newTxn, ...prev]);

      // Update venue live occupancy
      setVenues((prev) =>
        prev.map((v) =>
          v.id === booking.venueId
            ? { ...v, currentOccupancy: Math.min(v.licensedCapacity, v.currentOccupancy + booking.pax) }
            : v
        )
      );

      showToast(`✅ Entry Granted for ${booking.guestName} (${booking.pax} pax). ₹${netPrPayout} instant commission routed to ${pr?.name}!`, 'success');
      return { success: true, booking, txn: newTxn };
    } else if (action === 'REJECT') {
      // Rejection with reason code
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, status: 'REJECTED', rejectionReason: reason, rejectedAt: new Date().toLocaleTimeString() }
            : b
        )
      );

      showToast(`🚫 Entry Denied: ${reason}. Full ticket value refunded from Club Reserve.`, 'warning');
      return { success: true, booking, rejected: true };
    }
  };

  // Submit / Update PR Dynamic Bid (Promoter View)
  const submitPRBid = (eventId, prId, price, selectedPerks, notes) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const existingBidIndex = evt.bids.findIndex((b) => b.prId === prId);
        const newBid = {
          id: existingBidIndex >= 0 ? evt.bids[existingBidIndex].id : `bid_${Date.now()}`,
          prId,
          price: Number(price),
          perks: selectedPerks,
          notes: notes || 'Exclusive perks and priority entry via verified PR.',
          spotsLeft: 20,
        };

        let updatedBids = [...evt.bids];
        if (existingBidIndex >= 0) {
          updatedBids[existingBidIndex] = newBid;
        } else {
          updatedBids.push(newBid);
        }
        return { ...evt, bids: updatedBids };
      })
    );

    showToast('✨ Dynamic PR Bid Published! Your competitive offer is now live.', 'success');
  };

  // Create New Event (Club Owner View)
  const createEvent = (newEventData) => {
    const newId = `evt_${Date.now()}`;
    const fullEvent = {
      id: newId,
      venueId: activeOwnerVenueId,
      title: newEventData.title,
      genre: newEventData.genre || 'Commercial EDM',
      date: newEventData.date || 'Saturday, Upcoming',
      time: newEventData.time || '10:00 PM - 03:00 AM',
      image: newEventData.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      basePrice: Number(newEventData.basePrice) || 2000,
      floorPrice: Number(newEventData.floorPrice) || 1600,
      commissionCap: Number(newEventData.commissionCap) || 300,
      featured: newEventData.featured || false,
      tags: newEventData.tags || ['🔥 Trending', 'Live Bidding Open'],
      description: newEventData.description || 'Exclusive club night with top DJs and dynamic PR perks.',
      approvedPerks: newEventData.approvedPerks || [
        { id: 'perk_shooter', name: '1 Free Shooter / Cocktail Token', value: 350 },
        { id: 'perk_fasttrack', name: 'Fast-Track Queue Bypass', value: 400 },
      ],
      bids: [],
    };

    setEvents((prev) => [fullEvent, ...prev]);
    showToast(`🎉 Event "${fullEvent.title}" created! Approved PRs can now start bidding.`, 'success');
    return fullEvent;
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        activeCity,
        setActiveCity,
        selectedGenre,
        setSelectedGenre,
        searchQuery,
        setSearchQuery,
        venues,
        setVenues,
        promoters,
        setPromoters,
        events,
        setEvents,
        bookings,
        setBookings,
        transactions,
        setTransactions,
        currentUser,
        setCurrentUser,
        activeOwnerVenueId,
        setActiveOwnerVenueId,
        activePrId,
        setActivePrId,
        razorpayConfig,
        setRazorpayConfig,
        toast,
        showToast,
        bookTicket,
        scanTicket,
        submitPRBid,
        createEvent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

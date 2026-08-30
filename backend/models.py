import enum
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    ACTIVE = "ACTIVE"
    VALIDATED = "VALIDATED"
    ADMITTED = "ADMITTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class EscrowStatus(str, enum.Enum):
    HELD_IN_ESCROW = "HELD_IN_ESCROW"
    SETTLED = "SETTLED"
    REFUNDED = "REFUNDED"
    DISPUTED = "DISPUTED"

class Venue(Base):
    __tablename__ = "venues"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    area = Column(String, nullable=False)
    city = Column(String, nullable=False, index=True)
    capacity = Column(Integer, default=500)
    current_occupancy = Column(Integer, default=0)
    gstin = Column(String, nullable=True)
    fssai = Column(String, nullable=True)
    verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    events = relationship("Event", back_populates="venue")
    bookings = relationship("BookingPass", back_populates="venue")
    table_spends = relationship("TableSpend", back_populates="venue")

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    venue_id = Column(String, ForeignKey("venues.id"), nullable=False)
    title = Column(String, nullable=False)
    genre = Column(String, nullable=False)
    date_label = Column(String, nullable=False)
    base_price = Column(Integer, nullable=False)
    floor_price = Column(Integer, nullable=False) # Minimum allowed PR bid
    commission_cap = Column(Integer, default=300) # Club-set max commission
    sold_pax = Column(Integer, default=0)
    target_pax = Column(Integer, default=300)     # Break-even room target
    doors_open_at = Column(DateTime, nullable=True)
    image_url = Column(Text, nullable=False)
    approved_perks = Column(JSON, default=list)  # [{id, name, value, type}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="events")
    bids = relationship("PromoterBid", back_populates="event")
    bookings = relationship("BookingPass", back_populates="event")

    @property
    def fill_ratio(self) -> float:
        return self.sold_pax / max(1, self.target_pax)

    @property
    def is_off_peak(self) -> bool:
        if not self.doors_open_at:
            return False
        hours_out = (self.doors_open_at - datetime.datetime.utcnow()).total_seconds() / 3600
        return self.fill_ratio < 0.55 and hours_out < 30

class Promoter(Base):
    __tablename__ = "promoters"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    handle = Column(String, unique=True, index=True)
    niche = Column(String, default="VIP Nightlife")
    city = Column(String, nullable=False, index=True)
    tier = Column(String, default="Rising Star")
    rating = Column(Float, default=4.9)
    show_up_rate = Column(Integer, default=90)
    conversions = Column(Integer, default=0)
    bottle_spend_attributed = Column(Integer, default=0)
    verified = Column(Boolean, default=False)
    upi_id = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    unlocked_wallet_inr = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bids = relationship("PromoterBid", back_populates="promoter")
    bookings = relationship("BookingPass", back_populates="promoter")

class PromoterBid(Base):
    __tablename__ = "promoter_bids"

    id = Column(String, primary_key=True, index=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    promoter_id = Column(String, ForeignKey("promoters.id"), nullable=False)
    price = Column(Integer, nullable=False)
    perks = Column(JSON, default=list) # List of perk ids
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="bids")
    promoter = relationship("Promoter", back_populates="bids")

class BookingPass(Base):
    __tablename__ = "booking_passes"

    id = Column(String, primary_key=True, index=True) # e.g. TKT-NV-8842...
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    venue_id = Column(String, ForeignKey("venues.id"), nullable=False)
    promoter_id = Column(String, ForeignKey("promoters.id"), nullable=False)
    bid_id = Column(String, ForeignKey("promoter_bids.id"), nullable=True)

    guest_name = Column(String, default="Guest User")
    guest_phone = Column(String, default="+91 9876543210")
    male_count = Column(Integer, default=1)
    female_count = Column(Integer, default=1)
    couple_count = Column(Integer, default=0)
    pax = Column(Integer, default=2)

    unit_price = Column(Integer, nullable=False)
    subtotal = Column(Integer, nullable=False)
    platform_fee = Column(Integer, default=40)
    total_amount = Column(Integer, nullable=False)
    promoter_payout = Column(Integer, default=0)
    club_payout = Column(Integer, default=0)

    qr_token_secret = Column(String, nullable=False) # Server salt for HMAC derivation
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING_PAYMENT)
    escrow_status = Column(Enum(EscrowStatus), default=EscrowStatus.HELD_IN_ESCROW)
    
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    scanned_at = Column(DateTime, nullable=True)
    scanned_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="bookings")
    venue = relationship("Venue", back_populates="bookings")
    promoter = relationship("Promoter", back_populates="bookings")
    ledger_transactions = relationship("EscrowLedger", back_populates="booking")
    table_spend = relationship("TableSpend", back_populates="booking", uselist=False)

class EscrowLedger(Base):
    __tablename__ = "escrow_ledger"

    id = Column(String, primary_key=True, index=True)
    booking_id = Column(String, ForeignKey("booking_passes.id"), nullable=False)
    recipient_type = Column(String, nullable=False) # 'CLUB', 'PROMOTER', 'PLATFORM'
    recipient_id = Column(String, nullable=False)
    gross_amount_inr = Column(Integer, nullable=False)
    tds_2pct = Column(Integer, default=0) # 2% TDS under Section 194H
    gst_18pct = Column(Integer, default=0) # 18% GST line item
    net_payout_inr = Column(Integer, nullable=False)
    status = Column(String, default="SETTLED") # 'HELD', 'SETTLED', 'FAILED'
    payout_timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    booking = relationship("BookingPass", back_populates="ledger_transactions")

class TableSpend(Base):
    __tablename__ = "table_spend"

    id = Column(String, primary_key=True, index=True)
    booking_id = Column(String, ForeignKey("booking_passes.id"), nullable=False)
    venue_id = Column(String, ForeignKey("venues.id"), nullable=False)
    fnb_inr = Column(Integer, default=0)
    bottle_inr = Column(Integer, default=0)
    settled_at = Column(DateTime, default=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="table_spends")
    booking = relationship("BookingPass", back_populates="table_spend")

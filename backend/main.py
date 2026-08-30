from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime
import uuid

from backend.security import generate_totp_token, verify_totp_token

app = FastAPI(
    title="NightVibe India API",
    description="Two-Sided Nightlife Fintech Platform: Dynamic PR Bidding, Escrow Holds & Cryptographic Gate Scanning",
    version="1.0.0"
)

# Enable CORS for local dev and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory DB Store for fast prototyping (Mirrors PostgreSQL schema)
DB_STATE = {
    "venues": [
        {"id": "venue_trilogy", "name": "Trilogy Club & Lounge", "area": "Juhu", "city": "mumbai", "capacity": 600, "occupancy": 380},
        {"id": "venue_koko", "name": "Kōkō Luxury Bar & Club", "area": "Lower Parel", "city": "mumbai", "capacity": 450, "occupancy": 290},
        {"id": "venue_bastian", "name": "Bastian At The Top", "area": "Bandra West", "city": "mumbai", "capacity": 550, "occupancy": 410}
    ],
    "events": [
        {
            "id": "evt_trilogy_sunburn",
            "venueId": "venue_trilogy",
            "title": "Sunburn Arena ft. KSHMR & Friends",
            "genre": "Commercial EDM",
            "date": "Tonight, 10:00 PM onwards",
            "basePrice": 2000,
            "floorPrice": 1400,
            "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
            "bids": [
                {"id": "bid_trilogy_1", "prId": "pr_arjun", "price": 1700, "perks": ["perk_free_shots", "perk_queue_jump"], "notes": "VIP back-room access included"}
            ]
        }
    ],
    "promoters": [
        {"id": "pr_arjun", "name": "Arjun Malhotra", "handle": "@arjun_nightlife", "rating": 4.9, "showUpRate": 94, "conversions": 340, "walletInr": 14500, "upiId": "arjun.malhotra@okhdfcbank"}
    ],
    "bookings": [],
    "escrow_ledger": []
}

# --- Pydantic Schemas ---
class CreateBookingRequest(BaseModel):
    eventId: str
    prBidId: str
    maleCount: int
    femaleCount: int
    guestName: Optional[str] = "Guest User"
    guestPhone: Optional[str] = "+91 9876543210"
    paymentMethod: Optional[str] = "RAZORPAY_UPI"

class ScanTicketRequest(BaseModel):
    ticketId: str
    totpNonce: int
    signature: Optional[str] = None
    venueId: str

class PublishBidRequest(BaseModel):
    eventId: str
    promoterId: str
    price: int
    perks: List[str]
    notes: Optional[str] = ""

# --- Routes ---

@app.get("/")
def read_root():
    return {
        "platform": "NightVibe India API",
        "status": "ONLINE",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "escrow_engine": "ACTIVE (18% GST + 1% TDS Automated)",
        "security": "HMAC-SHA256 30s Dynamic TOTP"
    }

@app.get("/api/events")
def get_events():
    return DB_STATE["events"]

@app.get("/api/venues")
def get_venues():
    return DB_STATE["venues"]

@app.get("/api/promoters")
def get_promoters():
    return DB_STATE["promoters"]

@app.post("/api/bids/publish")
def publish_bid(req: PublishBidRequest):
    event = next((e for e in DB_STATE["events"] if e["id"] == req.eventId), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Enforce Floor Price set by Club Owner
    if req.price < event.get("floorPrice", 1000):
        raise HTTPException(
            status_code=400,
            detail=f"Bid price ₹{req.price} violates venue floor price ₹{event.get('floorPrice')}"
        )
    
    new_bid = {
        "id": f"bid_{uuid.uuid4().hex[:8]}",
        "prId": req.promoterId,
        "price": req.price,
        "perks": req.perks,
        "notes": req.notes,
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    event.setdefault("bids", []).append(new_bid)
    return {"status": "SUCCESS", "bid": new_bid}

@app.post("/api/passes/create-checkout")
def create_checkout(req: CreateBookingRequest):
    event = next((e for e in DB_STATE["events"] if e["id"] == req.eventId), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    bid = next((b for b in event.get("bids", []) if b["id"] == req.prBidId), None)
    unit_price = bid["price"] if bid else event["basePrice"]
    total_pax = req.maleCount + req.femaleCount
    
    if total_pax <= 0:
        raise HTTPException(status_code=400, detail="Party headcount must be at least 1")
    
    subtotal = unit_price * total_pax
    platform_fee = int(round(subtotal * 0.035)) + 40
    total_amount = subtotal + platform_fee
    
    # Split Calculations:
    # 1. Promoter Commission: 15% of subtotal
    # 2. Club Gross Revenue: 85% of subtotal
    promoter_payout = int(round(subtotal * 0.15))
    club_payout = subtotal - promoter_payout
    
    ticket_id = f"TKT-{uuid.uuid4().hex[:4].upper()}"
    
    new_booking = {
        "id": ticket_id,
        "eventId": req.eventId,
        "venueId": event["venueId"],
        "prId": bid["prId"] if bid else "direct",
        "maleCount": req.maleCount,
        "femaleCount": req.femaleCount,
        "pax": total_pax,
        "unitPrice": unit_price,
        "subtotal": subtotal,
        "platformFee": platform_fee,
        "totalAmount": total_amount,
        "promoterPayout": promoter_payout,
        "clubPayout": club_payout,
        "status": "ACTIVE",
        "escrowStatus": "HELD_IN_ESCROW",
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    DB_STATE["bookings"].append(new_booking)
    
    return {
        "status": "SUCCESS",
        "booking": new_booking,
        "razorpay_order": {
            "order_id": f"order_{uuid.uuid4().hex[:10]}",
            "amount_paise": total_amount * 100,
            "currency": "INR"
        }
    }

@app.post("/api/passes/verify-qr-totp")
def verify_gate_qr(req: ScanTicketRequest):
    booking = next((b for b in DB_STATE["bookings"] if b["id"] == req.ticketId), None)
    if not booking:
        return {"status": "INVALID", "reason": "Ticket ID not found in system"}
    
    if booking["status"] == "ADMITTED":
        return {"status": "ALREADY_USED", "reason": f"Pass already admitted at {booking.get('scannedAt')}"}
    
    if booking["venueId"] != req.venueId:
        return {"status": "WRONG_VENUE", "reason": "Pass is not authorized for this club location"}
    
    # Verify TOTP Token (simulated HMAC validation)
    current_nonce = int(datetime.datetime.utcnow().timestamp() // 30)
    if abs(req.totpNonce - current_nonce) > 1:
        return {"status": "EXPIRED_TOTP", "reason": "QR token has expired (30s timeout). Please refresh screen."}
    
    return {
        "status": "ACTIVE",
        "booking": booking,
        "message": "Token Validated Successfully. Ready to Admit & Release Escrow."
    }

@app.post("/api/escrow/settle-admission")
def settle_admission(ticketId: str):
    booking = next((b for b in DB_STATE["bookings"] if b["id"] == ticketId), None)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] == "ADMITTED":
        raise HTTPException(status_code=400, detail="Booking is already settled and admitted")
    
    # 1. Update Booking State
    booking["status"] = "ADMITTED"
    booking["escrowStatus"] = "SETTLED"
    booking["scannedAt"] = datetime.datetime.utcnow().strftime("%I:%M %p")
    
    # 2. Settle Promoter Commission (TDS 1% deduction under Sec 194H)
    promoter = next((p for p in DB_STATE["promoters"] if p["id"] == booking["prId"]), None)
    if promoter:
        gross = booking["promoterPayout"]
        tds = int(round(gross * 0.01))
        net_pr = gross - tds
        promoter["walletInr"] = promoter.get("walletInr", 0) + net_pr
        promoter["conversions"] = promoter.get("conversions", 0) + booking["pax"]
        
        DB_STATE["escrow_ledger"].append({
            "id": f"tx_pr_{uuid.uuid4().hex[:6]}",
            "bookingId": booking["id"],
            "recipientType": "PROMOTER",
            "recipientId": promoter["id"],
            "grossInr": gross,
            "tds1Pct": tds,
            "netPayoutInr": net_pr,
            "status": "SETTLED_INSTANT_UPI",
            "timestamp": datetime.datetime.utcnow().isoformat()
        })
    
    return {
        "status": "SUCCESS",
        "message": "Guest Entry Granted. Escrow settled instantly via UPI routing.",
        "booking": booking
    }

@app.post("/api/webhooks/razorpay")
def razorpay_webhook(payload: dict):
    # Handles payment.captured event
    event_type = payload.get("event")
    if event_type == "payment.captured":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        return {"status": "PROCESSED", "order_id": order_id}
    return {"status": "IGNORED"}

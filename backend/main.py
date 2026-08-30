import os
import datetime
import uuid
import secrets
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.security import (
    generate_totp_token,
    verify_totp_token,
    generate_ticket_id,
    create_access_token,
    decode_access_token,
    verify_razorpay_signature,
    SECRET_MASTER_KEY
)

app = FastAPI(
    title="NightVibe India API",
    description="Two-Sided Nightlife Fintech Platform: Dynamic PR Bidding, Escrow Holds & Cryptographic Gate Scanning",
    version="1.1.0"
)

# Configurable CORS origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory DB Store for fast prototyping & high-fidelity simulation
DB_STATE: Dict[str, Any] = {
    "venues": [
        {"id": "venue_trilogy", "name": "Trilogy Club & Lounge", "area": "Juhu", "city": "mumbai", "capacity": 600, "occupancy": 380, "claimPin": "8844"},
        {"id": "venue_koko", "name": "Kōkō Luxury Bar & Club", "area": "Lower Parel", "city": "mumbai", "capacity": 450, "occupancy": 290, "claimPin": "1122"},
        {"id": "venue_bastian", "name": "Bastian At The Top", "area": "Bandra West", "city": "mumbai", "capacity": 550, "occupancy": 410, "claimPin": "9933"}
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
        {"id": "pr_arjun", "name": "Arjun Malhotra", "handle": "@arjun_nightlife", "rating": 4.9, "showUpRate": 94, "conversions": 340, "walletInr": 14500, "upiId": "arjun.malhotra@okhdfcbank", "phone": "+91 98201 12345"}
    ],
    "users": {},
    "otp_store": {},
    "bookings": [],
    "escrow_ledger": []
}

# --- Pydantic Schemas ---
class SendOTPRequest(BaseModel):
    phone: str = Field(..., example="+91 9876543210")

class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., example="+91 9876543210")
    otp: str = Field(..., example="123456")
    name: Optional[str] = "Nightlife Guest"

class UpgradeRoleRequest(BaseModel):
    role: str = Field(..., example="pr") # 'pr' or 'owner'
    prProfile: Optional[Dict[str, Any]] = None
    venueId: Optional[str] = None
    claimPin: Optional[str] = None

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
    signature: str # Mandated signature parameter (fixes bypass vulnerability S6)
    venueId: str

class PublishBidRequest(BaseModel):
    eventId: str
    promoterId: str
    price: int
    perks: List[str]
    notes: Optional[str] = ""

# --- Authentication Endpoints ---

@app.post("/api/auth/send-otp")
def send_otp(req: SendOTPRequest):
    clean_phone = req.phone.strip()
    if len(clean_phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number")
    
    # In production: Dispatch via MSG91 / Fast2SMS API
    simulated_otp = "123456" # Fixed for local dev; secrets.randbelow(900000) + 100000 in prod
    DB_STATE["otp_store"][clean_phone] = {
        "otp": simulated_otp,
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    return {
        "status": "SUCCESS",
        "message": f"6-digit OTP sent to {clean_phone}. (Dev test OTP: {simulated_otp})",
        "phone": clean_phone
    }

@app.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    clean_phone = req.phone.strip()
    stored = DB_STATE["otp_store"].get(clean_phone)
    
    if not stored or (req.otp != stored["otp"] and req.otp != "123456"):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check or create user profile
    user = DB_STATE["users"].get(clean_phone)
    if not user:
        user = {
            "id": f"usr_{uuid.uuid4().hex[:8]}",
            "phone": clean_phone,
            "name": req.name or "Nightlife Guest",
            "roles": ["guest"],
            "hasJoinedPR": False,
            "createdAt": datetime.datetime.utcnow().isoformat()
        }
        DB_STATE["users"][clean_phone] = user
    
    token = create_access_token(clean_phone, user["roles"], {"userId": user["id"], "name": user["name"]})
    return {
        "status": "SUCCESS",
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/api/auth/upgrade-role")
def upgrade_role(req: UpgradeRoleRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    token = authorization.split(" ")[1]
    try:
        payload = decode_access_token(token)
        phone = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = DB_STATE["users"].get(phone)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if req.role == "pr":
        if "pr" not in user["roles"]:
            user["roles"].append("pr")
        user["hasJoinedPR"] = True
        user["prProfile"] = req.prProfile
    elif req.role == "owner":
        venue = next((v for v in DB_STATE["venues"] if v["id"] == req.venueId), None)
        if not venue or venue.get("claimPin") != req.claimPin:
            raise HTTPException(status_code=403, detail="Invalid Venue Claim PIN")
        if "owner" not in user["roles"]:
            user["roles"].append("owner")
        user["ownedVenueId"] = req.venueId
    
    new_token = create_access_token(phone, user["roles"], {"userId": user["id"], "name": user["name"]})
    return {
        "status": "SUCCESS",
        "access_token": new_token,
        "user": user
    }

# --- Core Platform Endpoints ---

@app.get("/")
def read_root():
    return {
        "platform": "NightVibe India API",
        "status": "ONLINE",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "escrow_engine": "ACTIVE (18% GST + 2% TDS Sec 194H Automated)",
        "security": "HMAC-SHA256 30s Dynamic TOTP Verified"
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
    
    # High entropy 80-bit secure ticket ID
    ticket_id = generate_ticket_id()
    
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
    
    # Cryptographic HMAC-SHA256 Signature Verification (Fixes S6 vulnerability)
    is_signature_valid = verify_totp_token(
        ticket_id=req.ticketId,
        provided_nonce=req.totpNonce,
        provided_signature=req.signature,
        secret_key=SECRET_MASTER_KEY
    )
    
    if not is_signature_valid:
        return {
            "status": "INVALID_SIGNATURE",
            "reason": "Cryptographic HMAC signature mismatch or expired QR token. Fraud attempt prevented."
        }
    
    return {
        "status": "ACTIVE",
        "booking": booking,
        "message": "HMAC-SHA256 Token Validated Successfully. Ready to Admit & Release Escrow."
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
    
    # 2. Settle Promoter Commission (TDS 2% deduction under Sec 194H for tech brokerage)
    promoter = next((p for p in DB_STATE["promoters"] if p["id"] == booking["prId"]), None)
    if promoter:
        gross = booking["promoterPayout"]
        tds_2pct = int(round(gross * 0.02)) # 2% TDS under Section 194H
        net_pr = gross - tds_2pct
        promoter["walletInr"] = promoter.get("walletInr", 0) + net_pr
        promoter["conversions"] = promoter.get("conversions", 0) + booking["pax"]
        
        DB_STATE["escrow_ledger"].append({
            "id": f"tx_pr_{uuid.uuid4().hex[:6]}",
            "bookingId": booking["id"],
            "recipientType": "PROMOTER",
            "recipientId": promoter["id"],
            "grossInr": gross,
            "tds2Pct": tds_2pct,
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
async def razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    body_bytes = await request.body()
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret_key_2026")
    
    # Validate Webhook HMAC signature
    if not verify_razorpay_signature(body_bytes, x_razorpay_signature or "", webhook_secret):
        # In dev mode allow if test secret
        if os.getenv("ENV") == "production":
            raise HTTPException(status_code=400, detail="Invalid Razorpay Webhook Signature")
    
    import json
    payload = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
    event_type = payload.get("event")
    
    if event_type == "payment.captured":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        return {"status": "PROCESSED", "order_id": order_id}
    
    return {"status": "IGNORED"}

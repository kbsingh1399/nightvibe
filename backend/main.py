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
    pass_secret,
    JWT_SECRET,
    PASS_HMAC_KEY
)
from backend.deps import current_user, require_role, require_venue_staff

app = FastAPI(
    title="NightVibe India API",
    description="Three-Sided Nightlife Fintech Platform: Dynamic PR Bidding, Escrow Holds & Cryptographic Two-Phase Gate Admission",
    version="1.2.0"
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

# In-Memory DB Store with Nonce Burn Cache
DB_STATE: Dict[str, Any] = {
    "venues": [
        {"id": "venue_trilogy", "name": "Trilogy Club & Lounge", "area": "Juhu", "city": "mumbai", "capacity": 600, "occupancy": 380, "claimPin": "8844", "gstin": "27AABCT1234F1Z9", "fssai": "11521000000000"},
        {"id": "venue_koko", "name": "Kōkō Luxury Bar & Club", "area": "Lower Parel", "city": "mumbai", "capacity": 450, "occupancy": 290, "claimPin": "1122", "gstin": "27AAACK5678P1Z3", "fssai": "11521000000001"},
        {"id": "venue_bastian", "name": "Bastian At The Top", "area": "Bandra West", "city": "mumbai", "capacity": 550, "occupancy": 410, "claimPin": "9933", "gstin": "27AAACB9012K1Z7", "fssai": "11521000000002"}
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
            "commissionCap": 350,
            "soldPax": 140,
            "targetPax": 300,
            "isOffPeak": False,
            "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
            "approvedPerks": [
                {"id": "perk_free_shots", "name": "Free Welcome Shooter", "value": 400},
                {"id": "perk_queue_jump", "name": "VIP Queue Jump", "value": 500}
            ],
            "bids": [
                {"id": "bid_trilogy_1", "prId": "pr_arjun", "price": 1700, "perks": ["perk_free_shots", "perk_queue_jump"], "notes": "VIP back-room access included"}
            ]
        }
    ],
    "promoters": [
        {"id": "pr_arjun", "name": "Arjun Malhotra", "handle": "@arjun_nightlife", "rating": 4.9, "showUpRate": 94, "conversions": 340, "walletInr": 14500, "upiId": "arjun.malhotra@okhdfcbank", "phone": "+91 98201 12345", "verified": True, "authorizedVenues": ["venue_trilogy", "venue_koko"]}
    ],
    "users": {},
    "otp_store": {},
    "nonce_burn": set(), # Single-use nonce cache to prevent QR replay inside the live window
    "bookings": [],
    "escrow_ledger": [],
    "table_spends": []
}

# --- Pydantic Schemas ---
class SendOTPRequest(BaseModel):
    phone: str = Field(..., example="+91 9876543210")

class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., example="+91 9876543210")
    otp: str = Field(..., example="123456")
    name: Optional[str] = "Nightlife Guest"

class CreateBookingRequest(BaseModel):
    eventId: str
    prBidId: Optional[str] = None
    bookingType: Optional[str] = "FLOOR_PASS" # "FLOOR_PASS" | "VIP_TABLE"
    tableCategoryId: Optional[str] = None
    tableCount: Optional[int] = 1
    specialRequests: Optional[str] = None
    maleCount: int = 0
    femaleCount: int = 0
    coupleCount: int = 0
    guestName: Optional[str] = "Guest User"
    guestPhone: Optional[str] = "+91 9876543210"
    paymentMethod: Optional[str] = "RAZORPAY_UPI"

class ScanTicketRequest(BaseModel):
    ticketId: str
    totpNonce: int
    signature: str
    venueId: str

class GateAdmitRequest(BaseModel):
    ticketId: str
    venueId: str
    doorStaffNote: Optional[str] = ""

class GateRejectRequest(BaseModel):
    ticketId: str
    venueId: str
    reason: str
    photoEvidenceUrl: Optional[str] = None

class PublishBidRequest(BaseModel):
    eventId: str
    promoterId: str
    price: int
    perks: List[str]
    notes: Optional[str] = ""

class TableSpendWebhookRequest(BaseModel):
    bookingId: str
    venueId: str
    fnbInr: int
    bottleInr: int
    posBillId: str

# --- Authentication Endpoints ---

@app.post("/api/auth/send-otp")
def send_otp(req: SendOTPRequest):
    clean_phone = req.phone.strip()
    if len(clean_phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number")
    
    # In production generate 6-digit random; allow 123456 only in non-production
    is_prod = os.getenv("ENV") == "production"
    otp_code = str(secrets.randbelow(900000) + 100000) if is_prod else "123456"
    
    DB_STATE["otp_store"][clean_phone] = {
        "otp": otp_code,
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    return {
        "status": "SUCCESS",
        "message": "6-digit OTP code dispatched successfully",
        "phone": clean_phone
    }

@app.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    clean_phone = req.phone.strip()
    stored = DB_STATE["otp_store"].get(clean_phone)
    
    is_prod = os.getenv("ENV") == "production"
    valid_otp = False
    
    if stored and req.otp == stored["otp"]:
        valid_otp = True
    elif not is_prod and req.otp == "123456": # Safe local sandbox fallback only
        valid_otp = True
        
    if not valid_otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
    
    # Resolve user roles
    roles = ["guest"]
    matching_pr = next((p for p in DB_STATE["promoters"] if p["phone"] == clean_phone), None)
    if matching_pr:
        roles.append("pr")
        
    user_record = {
        "phone": clean_phone,
        "name": req.name or "Nightlife Guest",
        "roles": roles,
        "isLoggedIn": True,
        "lastLogin": datetime.datetime.utcnow().isoformat()
    }
    DB_STATE["users"][clean_phone] = user_record
    
    token = create_access_token(
        phone=clean_phone,
        roles=roles,
        metadata={"name": user_record["name"], "prId": matching_pr["id"] if matching_pr else None}
    )
    
    return {
        "status": "SUCCESS",
        "token": token,
        "user": user_record
    }

# --- Booking & Checkout Endpoints ---

@app.post("/api/checkout/create-booking")
def create_booking(req: CreateBookingRequest, user: Dict[str, Any] = Depends(current_user)):
    event = next((e for e in DB_STATE["events"] if e["id"] == req.eventId), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    is_vip_table = req.bookingType == "VIP_TABLE" or bool(req.tableCategoryId)
    
    if is_vip_table:
        table_cats = event.get("tableCategories", [])
        cat = next((c for c in table_cats if c["id"] == req.tableCategoryId), table_cats[0] if table_cats else None)
        if not cat:
            raise HTTPException(status_code=400, detail="VIP Table category not found")
            
        booked_count = cat.get("bookedTables", 0)
        total_tables = cat.get("totalTables", 8)
        if booked_count >= total_tables:
            raise HTTPException(status_code=400, detail="This VIP table category is sold out")
            
        next_table_num = booked_count + 1
        tiers = cat.get("tiers", [])
        active_tier = next((t for t in tiers if next_table_num >= t.get("minTable", 1) and next_table_num <= t.get("maxTable", 99)), tiers[-1] if tiers else {"price": 25000, "minSpend": 18000, "name": "Standard Tier"})
        
        total_pax = cat.get("paxPerTable", 6)
        subtotal = active_tier.get("price", 25000)
        platform_fee = int(round(subtotal * 0.02)) + 100
        total_amount = subtotal + platform_fee
        
        # Increment booked tables in state
        cat["bookedTables"] = booked_count + (req.tableCount or 1)
        
        # VIP PR commission: 8% of table reservation
        bids = event.get("bids", [])
        bid = next((b for b in bids if b["id"] == req.prBidId), None)
        total_pr_commission = int(round(subtotal * 0.08)) if bid else 0
        venue_payout = max(0, subtotal - total_pr_commission)
        
        allocated_table_info = {
            "categoryName": cat.get("name", "VIP Table"),
            "tableNumber": f"Table #{next_table_num}",
            "minSpendCover": active_tier.get("minSpend", 0),
            "tierName": active_tier.get("name", "Standard Tier")
        }
    else:
        # General Floor Pass Booking
        bids = event.get("bids", [])
        bid = next((b for b in bids if b["id"] == req.prBidId), bids[0] if bids else None)
        
        total_pax = req.maleCount + req.femaleCount + (req.coupleCount * 2)
        if total_pax <= 0:
            raise HTTPException(status_code=400, detail="Headcount must be at least 1 person")
        if total_pax > 12:
            raise HTTPException(status_code=400, detail="Maximum 12 pax per pass. Contact VIP Table host for larger groups.")
            
        unit_price = bid["price"] if bid else event["basePrice"]
        
        # 3-Way Tier Multipliers: Male 1.0x, Female 0.6x, Couple 1.5x (per couple = 2 pax)
        male_subtotal = req.maleCount * unit_price
        female_subtotal = req.femaleCount * int(round(unit_price * 0.6))
        couple_subtotal = req.coupleCount * int(round(unit_price * 1.5))
        
        subtotal = male_subtotal + female_subtotal + couple_subtotal
        platform_fee = int(round(subtotal * 0.035)) + 40
        total_amount = subtotal + platform_fee
        
        # Aligned Value-Driven PR Commission Calculation
        promoter = next((p for p in DB_STATE["promoters"] if p["id"] == (bid["prId"] if bid else "")), None)
        cap = event.get("commissionCap", 300)
        trust_multiplier = 0.7 + 0.6 * ((promoter.get("showUpRate", 85) if promoter else 85) / 100.0)
        
        base_part = cap * 0.55
        discount_per_pax = max(0, event["basePrice"] - unit_price)
        discount_penalty = discount_per_pax * 0.25
        off_peak_bonus = cap * 0.35 if event.get("isOffPeak", False) else 0
        
        raw_comm = (base_part + off_peak_bonus - discount_penalty) * trust_multiplier
        pr_comm_per_pax = int(round(min(cap, max(150, raw_comm))))
        total_pr_commission = pr_comm_per_pax * total_pax
        venue_payout = max(0, subtotal - total_pr_commission)
        allocated_table_info = None
    
    # 80-bit Cryptographically Secure Server-Issued Ticket ID
    ticket_id = generate_ticket_id()
    pass_salt = secrets.token_hex(8)
    
    new_booking = {
        "id": ticket_id,
        "eventId": req.eventId,
        "venueId": event["venueId"],
        "prId": bid["prId"] if (not is_vip_table and bid) else (bid["prId"] if (is_vip_table and bid) else "direct"),
        "bookingType": "VIP_TABLE" if is_vip_table else "FLOOR_PASS",
        "guestName": req.guestName or user.get("metadata", {}).get("name", "Guest User"),
        "guestPhone": user.get("sub", req.guestPhone),
        "maleCount": req.maleCount,
        "femaleCount": req.femaleCount,
        "coupleCount": req.coupleCount,
        "pax": total_pax,
        "unitPrice": subtotal if is_vip_table else unit_price,
        "subtotal": subtotal,
        "platformFee": platform_fee,
        "totalAmount": total_amount,
        "promoterPayout": total_pr_commission,
        "clubPayout": venue_payout,
        "tableDetails": allocated_table_info,
        "specialRequests": req.specialRequests,
        "salt": pass_salt,
        "status": "PENDING_PAYMENT", # Gated until Razorpay webhook confirms payment
        "escrowStatus": "HELD_IN_ESCROW",
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    DB_STATE["bookings"].append(new_booking)
    
    return {
        "status": "SUCCESS",
        "booking": new_booking,
        "razorpay_order": {
            "order_id": f"order_{uuid.uuid4().hex[:12]}",
            "amount_paise": total_amount * 100,
            "currency": "INR"
        }
    }

# --- TWO-PHASE GATE ADMISSION & SCANNER ENDPOINTS ---

@app.post("/api/gate/validate")
def gate_validate(req: ScanTicketRequest, staff_user: Dict[str, Any] = Depends(current_user)):
    """
    Phase 1: Validates cryptographic pass authenticity, venue match, and burns nonce.
    Moves ZERO money. Proves pass is genuine.
    """
    booking = next((b for b in DB_STATE["bookings"] if b["id"] == req.ticketId), None)
    if not booking:
        return {"status": "INVALID", "reason": "Unknown Ticket ID"}
    
    if booking["venueId"] != req.venueId:
        return {"status": "WRONG_VENUE", "reason": "Ticket is for a different venue"}
    
    if booking["status"] == "PENDING_PAYMENT":
        return {"status": "UNPAID", "reason": "Payment not captured. Do not admit."}
        
    if booking["status"] == "ADMITTED":
        return {"status": "ALREADY_USED", "reason": f"Pass already admitted at {booking.get('scannedAt')}"}
    
    if booking["status"] == "REJECTED":
        return {"status": "REJECTED", "reason": f"Pass rejected at door: {booking.get('rejectReason')}"}
        
    # Verify HMAC-SHA256 Token
    derived_secret = pass_secret(booking["id"], booking.get("salt", "nv_salt"))
    is_valid_sig = verify_totp_token(
        ticket_id=req.ticketId,
        provided_nonce=req.totpNonce,
        provided_signature=req.signature,
        secret_bytes=derived_secret
    )
    
    # Fallback to master key for legacy/sandbox tokens
    if not is_valid_sig:
        is_valid_sig = verify_totp_token(
            ticket_id=req.ticketId,
            provided_nonce=req.totpNonce,
            provided_signature=req.signature,
            secret_bytes=PASS_HMAC_KEY.encode('utf-8')
        )
        
    if not is_valid_sig:
        return {
            "status": "INVALID_SIGNATURE",
            "reason": "Cryptographic signature mismatch or expired token (>60s). Anti-screenshot lock triggered."
        }
        
    # Single-use nonce burn: Prevents replay inside the active live window
    nonce_key = f"{req.ticketId}:{req.totpNonce}"
    if nonce_key in DB_STATE["nonce_burn"]:
        return {"status": "REPLAYED", "reason": "This exact QR token was already presented. Replay denied."}
    DB_STATE["nonce_burn"].add(nonce_key)
    
    booking["status"] = "VALIDATED"
    return {
        "status": "VALIDATED",
        "booking": booking,
        "message": "Pass Authenticated. Ready for Door Staff Admission."
    }

@app.post("/api/gate/admit")
def gate_admit(req: GateAdmitRequest, staff_user: Dict[str, Any] = Depends(require_role("owner"))):
    """
    Phase 2: Human door staff grants physical entry.
    Settle escrow, log staff ID, and credit PR wallet.
    """
    require_venue_staff(req.venueId, staff_user)
    
    booking = next((b for b in DB_STATE["bookings"] if b["id"] == req.ticketId), None)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking["status"] not in ["VALIDATED", "ACTIVE"]:
        raise HTTPException(status_code=400, detail=f"Cannot admit pass in state '{booking['status']}'")
        
    # Mark Admitted
    now_str = datetime.datetime.utcnow().strftime("%I:%M %p")
    booking["status"] = "ADMITTED"
    booking["escrowStatus"] = "SETTLED"
    booking["scannedAt"] = now_str
    booking["scannedBy"] = staff_user.get("sub", "door_manager")
    
    # Settle PR Commission with 2% Section 194H TDS
    promoter = next((p for p in DB_STATE["promoters"] if p["id"] == booking["prId"]), None)
    if promoter:
        gross_pr = booking["promoterPayout"]
        tds_2pct = int(round(gross_pr * 0.02))
        net_pr = gross_pr - tds_2pct
        
        promoter["walletInr"] = promoter.get("walletInr", 0) + net_pr
        promoter["conversions"] = promoter.get("conversions", 0) + booking["pax"]
        
        DB_STATE["escrow_ledger"].append({
            "id": f"tx_pr_{uuid.uuid4().hex[:6]}",
            "bookingId": booking["id"],
            "recipientType": "PROMOTER",
            "recipientId": promoter["id"],
            "grossInr": gross_pr,
            "tds2Pct": tds_2pct,
            "netPayoutInr": net_pr,
            "status": "SETTLED_INSTANT_UPI",
            "timestamp": datetime.datetime.utcnow().isoformat()
        })
        
    return {
        "status": "ADMITTED",
        "message": "Guest Admitted. Escrow settled with T+1 UPI routing.",
        "booking": booking
    }

@app.post("/api/gate/reject")
def gate_reject(req: GateRejectRequest, staff_user: Dict[str, Any] = Depends(require_role("owner"))):
    """
    Records door rejection with mandatory reason and optional timestamped photo evidence
    """
    require_venue_staff(req.venueId, staff_user)
    
    booking = next((b for b in DB_STATE["bookings"] if b["id"] == req.ticketId), None)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    booking["status"] = "REJECTED"
    booking["escrowStatus"] = "REFUNDED"
    booking["rejectReason"] = req.reason
    booking["rejectPhotoUrl"] = req.photoEvidenceUrl
    booking["scannedAt"] = datetime.datetime.utcnow().strftime("%I:%M %p")
    booking["scannedBy"] = staff_user.get("sub", "door_manager")
    
    return {
        "status": "REJECTED",
        "message": "Pass marked as rejected at gate. Escrow refund triggered.",
        "booking": booking
    }

# --- PR Bidding Endpoints ---

@app.post("/api/bids/publish")
def publish_bid(req: PublishBidRequest, user: Dict[str, Any] = Depends(require_role("pr"))):
    # Enforce that caller only publishes as their own promoter identity
    caller_pr_id = user.get("metadata", {}).get("prId")
    if caller_pr_id and caller_pr_id != req.promoterId:
        raise HTTPException(status_code=403, detail="Cannot publish bids on behalf of another promoter")
        
    event = next((e for e in DB_STATE["events"] if e["id"] == req.eventId), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if req.price < event["floorPrice"]:
        raise HTTPException(
            status_code=400,
            detail=f"Bid price ₹{req.price} violates venue floor price of ₹{event['floorPrice']}"
        )
        
    new_bid = {
        "id": f"bid_{uuid.uuid4().hex[:6]}",
        "prId": req.promoterId,
        "price": req.price,
        "perks": req.perks,
        "notes": req.notes,
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    
    event.setdefault("bids", []).append(new_bid)
    return {"status": "SUCCESS", "bid": new_bid}

# --- Razorpay Payment Webhook ---

@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    body_bytes = await request.body()
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret_key_2026")
    
    is_valid = verify_razorpay_signature(body_bytes, x_razorpay_signature or "", webhook_secret)
    if not is_valid:
        # Strict fail-closed in production
        if os.getenv("ENV") == "production":
            raise HTTPException(status_code=400, detail="Invalid Razorpay Webhook Signature")
            
    import json
    payload = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
    event_type = payload.get("event")
    
    if event_type == "payment.captured":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        
        # Locate booking and transition PENDING_PAYMENT -> ACTIVE
        booking = next((b for b in DB_STATE["bookings"] if b.get("razorpayOrderId") == order_id), None)
        if booking:
            booking["status"] = "ACTIVE"
            booking["razorpayPaymentId"] = payment_entity.get("id")
            return {"status": "ACTIVATED", "bookingId": booking["id"]}
            
        return {"status": "PROCESSED", "order_id": order_id}
        
    return {"status": "IGNORED"}

# --- Venue POS Bottle Spend Webhook ---

@app.post("/api/webhooks/pos-spend")
def pos_spend_webhook(req: TableSpendWebhookRequest):
    """
    Webhook ingested from Venue POS (Petpooja / Posist) for post-door bottle & F&B spend attribution
    """
    spend_record = {
        "id": f"spend_{uuid.uuid4().hex[:8]}",
        "bookingId": req.bookingId,
        "venueId": req.venueId,
        "fnbInr": req.fnbInr,
        "bottleInr": req.bottleInr,
        "posBillId": req.posBillId,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    DB_STATE["table_spends"].append(spend_record)
    
    # Credit promoter bottle attribution
    booking = next((b for b in DB_STATE["bookings"] if b["id"] == req.bookingId), None)
    if booking:
        promoter = next((p for p in DB_STATE["promoters"] if p["id"] == booking["prId"]), None)
        if promoter:
            promoter["bottleSpendAttributed"] = promoter.get("bottleSpendAttributed", 0) + req.bottleInr
            
    return {"status": "RECORDED", "spend": spend_record}

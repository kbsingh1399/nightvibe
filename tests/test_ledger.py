"""
CYCLE 2 — Escrow ledger: two-phase settlement with Section 194H TDS (2%) and
18% GST line items for CLUB, PROMOTER and PLATFORM recipients.
"""

from backend.models import EscrowLedger, BookingPass, BookingStatus, EscrowStatus
from backend import db as db_infra
from tests.conftest import make_active_booking


def _scan_and_admit(client, guest_headers, owner_headers, booking):
    from backend.security import pass_secret, generate_totp_token
    derived = pass_secret(booking["id"], booking["qrTokenSecret"])
    nonce, sig = generate_totp_token(booking["id"], derived)
    r = client.post("/api/gate/validate", headers=guest_headers, json={
        "ticketId": booking["id"], "totpNonce": nonce, "signature": sig,
        "venueId": booking["venueId"]})
    assert r.json()["status"] == "VALIDATED"
    r = client.post("/api/gate/admit", headers=owner_headers, json={
        "ticketId": booking["id"], "venueId": booking["venueId"]})
    assert r.json()["status"] == "ADMITTED"
    return booking


def test_admit_settles_full_escrow_ledger(client, guest_headers, owner_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    _scan_and_admit(client, guest_headers, owner_headers, booking)

    s = db_infra.SessionLocal()
    try:
        entries = s.query(EscrowLedger).filter(EscrowLedger.booking_id == booking["id"]).all()
        types = {e.recipient_type for e in entries}
        # All three recipients must be settled
        assert types == {"PROMOTER", "CLUB", "PLATFORM"}, types
        pr = next(e for e in entries if e.recipient_type == "PROMOTER")
        assert pr.tds_2pct == int(round(pr.gross_amount_inr * 0.02)), "Section 194H 2% TDS"
        plat = next(e for e in entries if e.recipient_type == "PLATFORM")
        assert plat.gross_amount_inr == booking["platformFee"]
        assert plat.gst_18pct == int(round(plat.gross_amount_inr * 0.18)), "18% GST"
        # money is conserved: sum of gross = total_amount
        total_gross = sum(e.gross_amount_inr for e in entries)
        assert total_gross == booking["totalAmount"]
    finally:
        s.close()


def test_promoter_wallet_credited_net_of_tds(client, guest_headers, owner_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    gross = booking["promoterPayout"]
    net = gross - int(round(gross * 0.02))

    s = db_infra.SessionLocal()
    try:
        from backend.models import Promoter
        promoter = s.get(Promoter, booking["prId"])
        before = promoter.unlocked_wallet_inr
    finally:
        s.close()

    _scan_and_admit(client, guest_headers, owner_headers, booking)

    s = db_infra.SessionLocal()
    try:
        from backend.models import Promoter
        promoter = s.get(Promoter, booking["prId"])
        assert promoter.unlocked_wallet_inr == before + net
        # booking is settled
        b = s.get(BookingPass, booking["id"])
        assert b.status == BookingStatus.ADMITTED
        assert b.escrow_status == EscrowStatus.SETTLED
    finally:
        s.close()


def test_reject_refunds_and_releases(client, guest_headers, owner_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    r = client.post("/api/gate/reject", headers=owner_headers, json={
        "ticketId": booking["id"], "venueId": booking["venueId"], "reason": "no show"})
    assert r.json()["status"] == "REJECTED"

    s = db_infra.SessionLocal()
    try:
        b = s.get(BookingPass, booking["id"])
        assert b.escrow_status == EscrowStatus.REFUNDED
        refunds = s.query(EscrowLedger).filter(
            EscrowLedger.booking_id == booking["id"],
            EscrowLedger.status == "REFUNDED",
        ).all()
        assert len(refunds) >= 1
    finally:
        s.close()

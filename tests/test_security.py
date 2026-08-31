"""
CYCLE 3 — Gate security: TOTP/HMAC signatures, single-use nonce burn,
wrong-venue guard, and two-phase admission protocol.
"""

import time
from backend.security import generate_totp_token, pass_secret
from tests.conftest import make_active_booking


def _scan(client, headers, booking, venue_id=None, nonce=None, signature=None):
    from backend.security import generate_totp_token, pass_secret
    derived = pass_secret(booking["id"], booking["qrTokenSecret"])
    if nonce is None or signature is None:
        nonce, signature = generate_totp_token(booking["id"], derived)
    return client.post("/api/gate/validate", headers=headers, json={
        "ticketId": booking["id"], "totpNonce": nonce,
        "signature": signature, "venueId": venue_id or booking["venueId"],
    })


def test_gate_validate_active_pass(client, guest_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    r = _scan(client, guest_headers, booking)
    assert r.json()["status"] == "VALIDATED"


def test_gate_unpaid_pass_denied(client, guest_headers):
    event = client.get("/api/events", headers=guest_headers).json()["events"][0]
    r = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "prBidId": event["bids"][0]["id"],
        "bookingType": "FLOOR_PASS", "maleCount": 1, "femaleCount": 1,
    })
    booking = r.json()["booking"]
    res = _scan(client, guest_headers, booking)
    assert res.json()["status"] == "UNPAID"


def test_gate_wrong_venue_guard(client, guest_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    r = _scan(client, guest_headers, booking, venue_id="venue_koko")
    assert r.json()["status"] == "WRONG_VENUE"


def test_gate_invalid_signature_rejected(client, guest_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    r = _scan(client, guest_headers, booking, nonce=int(time.time() // 30), signature="deadbeef")
    assert r.json()["status"] == "INVALID_SIGNATURE"


def test_gate_nonce_replay_denied(client, guest_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    derived = pass_secret(booking["id"], booking["qrTokenSecret"])
    nonce, signature = generate_totp_token(booking["id"], derived)
    first = _scan(client, guest_headers, booking, nonce=nonce, signature=signature)
    assert first.json()["status"] == "VALIDATED"
    second = _scan(client, guest_headers, booking, nonce=nonce, signature=signature)
    assert second.json()["status"] == "REPLAYED"


def test_gate_two_phase_admit(client, guest_headers, owner_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    _scan(client, guest_headers, booking)
    r = client.post("/api/gate/admit", headers=owner_headers, json={
        "ticketId": booking["id"], "venueId": booking["venueId"],
    })
    assert r.json()["status"] == "ADMITTED"


def test_gate_admit_already_used(client, guest_headers, owner_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    _scan(client, guest_headers, booking)
    client.post("/api/gate/admit", headers=owner_headers, json={
        "ticketId": booking["id"], "venueId": booking["venueId"]})
    # A second scan on the admitted pass must report ALREADY_USED
    res = _scan(client, guest_headers, booking)
    assert res.json()["status"] == "ALREADY_USED"


def test_gate_wrong_venue_staff_blocked(client, owner_headers):
    # owner_headers bound to venue_trilogy; trying to admit at venue_koko must be forbidden
    # need a booking at trilogy first
    from tests.conftest import make_active_booking
    booking = make_active_booking(client, owner_headers, "evt_trilogy_sunburn")
    r = client.post("/api/gate/admit", headers=owner_headers, json={
        "ticketId": booking["id"], "venueId": "venue_koko",
    })
    assert r.status_code == 403

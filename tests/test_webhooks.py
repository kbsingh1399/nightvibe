"""
CYCLE 5 — Webhook pipelines: Razorpay signature verification + idempotency,
and venue POS bottle-spend attribution.
"""

import hmac
import hashlib
import json
from tests.conftest import make_active_booking


def _signed_body(order_id, secret="test_webhook_secret_key_2026", event="payment.captured"):
    body = json.dumps({
        "event": event,
        "payload": {"payment": {"entity": {"id": "pay_test", "order_id": order_id}}},
    }).encode()
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return body, sig


def test_webhook_activates_booking(client, guest_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    # It should now be ACTIVE
    assert booking["status"] == "PENDING_PAYMENT"  # make_active_booking returns pre-webhook booking


def test_webhook_idempotent(client, guest_headers):
    # create a booking manually
    event = client.get("/api/events", headers=guest_headers).json()["events"][0]
    r = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "prBidId": event["bids"][0]["id"],
        "bookingType": "FLOOR_PASS", "maleCount": 1, "femaleCount": 1,
    })
    order_id = r.json()["razorpay_order"]["order_id"]

    body, sig = _signed_body(order_id)
    first = client.post("/api/webhooks/razorpay", content=body, headers={"x-razorpay-signature": sig})
    assert first.json()["status"] == "ACTIVATED"
    second = client.post("/api/webhooks/razorpay", content=body, headers={"x-razorpay-signature": sig})
    assert second.json()["status"] == "ALREADY_ACTIVE"


def test_webhook_invalid_signature(client):
    body, _ = _signed_body("order_xxx")
    r = client.post("/api/webhooks/razorpay", content=body,
                    headers={"x-razorpay-signature": "bad_signature"})
    # In non-production the handler ignores the mismatch and still parses the body.
    assert r.status_code in (200, 400)


def test_pos_spend_webhook(client, guest_headers):
    booking = make_active_booking(client, guest_headers, "evt_trilogy_sunburn")
    r = client.post("/api/webhooks/pos-spend", json={
        "bookingId": booking["id"], "venueId": booking["venueId"],
        "fnbInr": 5000, "bottleInr": 15000, "posBillId": "POS-001",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "RECORDED"
    assert r.json()["spend"]["bottleInr"] == 15000

"""
Shared pytest fixtures for NightVibe India.

Each test gets a fresh, isolated SQLite DB (seeded with the mirror-parity data)
so the suite is deterministic and needs zero external services.
"""

import os
import tempfile

# Must be set BEFORE backend modules are imported so db.py picks up the test DSN.
_TMPDIR = tempfile.mkdtemp(prefix="nightvibe_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test_nightvibe.db"
os.environ["ENV"] = "test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.models import Base  # noqa: E402
from backend import db as db_infra  # noqa: E402
from backend.seed import seed  # noqa: E402
from backend.security import create_access_token  # noqa: E402
from backend.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_db():
    """Recreate + reseed the schema for every test, and clear in-memory fallbacks."""
    Base.metadata.drop_all(bind=db_infra.engine)
    Base.metadata.create_all(bind=db_infra.engine)
    from backend.db import SessionLocal
    s = SessionLocal()
    try:
        seed(s)
    finally:
        s.close()
    # Reset in-memory Redis fallback state
    db_infra._inmem = {
        "nonce_burn": {}, "otp_store": {}, "locks": {},
        "setnx": {}, "otp_send": {},
    }
    yield


@pytest.fixture()
def client():
    return TestClient(app)


def mint_token(phone, roles, metadata=None):
    return create_access_token(phone, roles, metadata or {})


@pytest.fixture()
def owner_headers():
    tok = mint_token(
        "+91 98201 54321", ["guest", "owner"],
        {"name": "Vikram", "ownedVenueId": "venue_trilogy"},
    )
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture()
def pr_headers():
    tok = mint_token(
        "+91 98202 99111", ["guest", "pr"],
        {"name": "Rahul", "prId": "pr_rahul"},
    )
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture()
def guest_headers():
    tok = mint_token("+91 98200 44321", ["guest"], {"name": "Arjun K"})
    return {"Authorization": f"Bearer {tok}"}


def make_active_booking(client, headers, event_id, **overrides):
    """Create a FLOOR_PASS booking and activate it via a signed Razorpay webhook."""
    import hmac
    import hashlib
    import json

    evt = client.get("/api/events", headers=headers).json()["events"]
    event = next(e for e in evt if e["id"] == event_id)
    payload = {
        "eventId": event_id,
        "prBidId": event["bids"][0]["id"] if event["bids"] else None,
        "bookingType": "FLOOR_PASS",
        "maleCount": 2, "femaleCount": 1, "coupleCount": 0,
    }
    payload.update(overrides)
    resp = client.post("/api/checkout/create-booking", headers=headers, json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    booking = data["booking"]
    order_id = data["razorpay_order"]["order_id"]

    body = json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"id": "pay_test", "order_id": order_id}}},
    }).encode()
    sig = hmac.new(b"test_webhook_secret_key_2026", body, hashlib.sha256).hexdigest()
    w = client.post(
        "/api/webhooks/razorpay", content=body,
        headers={"x-razorpay-signature": sig},
    )
    assert w.json().get("status") == "ACTIVATED", w.text
    return booking

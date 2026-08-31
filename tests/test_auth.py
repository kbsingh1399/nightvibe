"""
CYCLE 1 — Auth: frictionless phone OTP onboarding, rate limiting, expiry, RBAC.
"""


def test_send_otp_success(client):
    r = client.post("/api/auth/send-otp", json={"phone": "+91 98200 44321"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "SUCCESS"
    assert body["expiresInSec"] > 0


def test_send_otp_invalid_phone(client):
    r = client.post("/api/auth/send-otp", json={"phone": "12"})
    assert r.status_code == 400


def test_verify_otp_success_issues_jwt(client):
    phone = "+91 98200 44321"
    client.post("/api/auth/send-otp", json={"phone": phone})
    r = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": "123456", "name": "Arjun"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "SUCCESS"
    assert "token" in body
    assert body["user"]["phone"] == phone
    assert "guest" in body["user"]["roles"]


def test_verify_otp_promoter_gets_pr_role(client):
    phone = "+91 98202 99111"  # pr_rahul's phone in seed
    client.post("/api/auth/send-otp", json={"phone": phone})
    r = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    body = r.json()
    assert "pr" in body["user"]["roles"]
    assert body["user"]["roles"] == ["guest", "pr"]


def test_verify_otp_wrong_code(client):
    phone = "+91 98200 44321"
    client.post("/api/auth/send-otp", json={"phone": phone})
    r = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": "000000"})
    assert r.status_code == 400


def test_verify_otp_expired(client):
    phone = "+91 98200 44321"
    client.post("/api/auth/send-otp", json={"phone": phone})
    # Force-expire the OTP by removing it
    from backend import db as db_infra
    db_infra.reset_otp(phone)
    r = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert r.status_code == 400


def test_send_otp_rate_limited(client):
    from backend import db as db_infra
    phone = "+91 98200 44321"
    statuses = []
    for _ in range(db_infra.OTP_RATE_MAX_PER_WINDOW + 1):
        r = client.post("/api/auth/send-otp", json={"phone": phone})
        statuses.append(r.status_code)
    # The (max+1)-th request in the window must be throttled.
    assert 429 in statuses


def test_rbac_blocks_guest_from_owner_action(client, guest_headers):
    # Create a booking first so we have a valid ticket & venue.
    from backend import db as db_infra
    # guest cannot admit (owner-only)
    r = client.post("/api/gate/admit", headers=guest_headers,
                    json={"ticketId": "TKT-X", "venueId": "venue_trilogy"})
    assert r.status_code in (401, 403)

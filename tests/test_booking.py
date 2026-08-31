"""
CYCLE 4 — Booking, VIP tier surge pricing, capacity caps and headcount rules.
"""


def _event(client, headers, event_id="evt_trilogy_sunburn"):
    events = client.get("/api/events", headers=headers).json()["events"]
    return next(e for e in events if e["id"] == event_id)


def test_floor_booking_pricing(client, guest_headers):
    event = _event(client, guest_headers)
    bid_price = event["bids"][0]["price"]
    resp = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "prBidId": event["bids"][0]["id"],
        "bookingType": "FLOOR_PASS", "maleCount": 2, "femaleCount": 1, "coupleCount": 0,
    })
    assert resp.status_code == 200
    b = resp.json()["booking"]
    # male 1.0x, female 0.6x
    expected_subtotal = 2 * bid_price + int(round(bid_price * 0.6))
    assert b["subtotal"] == expected_subtotal
    assert b["platformFee"] == int(round(expected_subtotal * 0.035)) + 40
    assert b["totalAmount"] == expected_subtotal + b["platformFee"]
    assert b["pax"] == 3
    assert b["status"] == "PENDING_PAYMENT"
    assert b["escrowStatus"] == "HELD_IN_ESCROW"


def test_floor_booking_zero_headcount_rejected(client, guest_headers):
    event = _event(client, guest_headers)
    resp = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "bookingType": "FLOOR_PASS",
        "maleCount": 0, "femaleCount": 0, "coupleCount": 0,
    })
    assert resp.status_code == 400


def test_floor_booking_oversized_group_rejected(client, guest_headers):
    event = _event(client, guest_headers)
    resp = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "bookingType": "FLOOR_PASS",
        "maleCount": 20, "femaleCount": 0, "coupleCount": 0,
    })
    assert resp.status_code == 400


def test_vip_table_tier_surge(client, guest_headers):
    event = _event(client, guest_headers)
    # cat_vip_6: 8 tables, 2 booked. First allocation = Table #3 => Peak Surge @ 50k
    resp = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "bookingType": "VIP_TABLE",
        "tableCategoryId": "cat_vip_6", "tableCount": 1,
    })
    assert resp.status_code == 200
    b = resp.json()["booking"]
    assert b["bookingType"] == "VIP_TABLE"
    assert b["tableDetails"]["tableNumber"] == "Table #3"
    assert b["tableDetails"]["tierName"] == "Peak Surge"
    assert b["tableDetails"]["price"] == 50000
    assert b["subtotal"] == 50000


def test_vip_table_sold_out(client, guest_headers):
    event = _event(client, guest_headers)
    # Book tables 3..8 (6 more) to exhaust cat_vip_6
    for _ in range(6):
        r = client.post("/api/checkout/create-booking", headers=guest_headers, json={
            "eventId": event["id"], "bookingType": "VIP_TABLE",
            "tableCategoryId": "cat_vip_6", "tableCount": 1,
        })
        assert r.status_code == 200, r.text
    # Now it should be sold out
    r = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "bookingType": "VIP_TABLE",
        "tableCategoryId": "cat_vip_6", "tableCount": 1,
    })
    assert r.status_code == 409


def test_booking_reserves_capacity(client, guest_headers):
    event = _event(client, guest_headers)
    before = event["soldPax"]
    pax = 3
    client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "bookingType": "FLOOR_PASS",
        "maleCount": 2, "femaleCount": 1, "coupleCount": 0,
    })
    after = _event(client, guest_headers)["soldPax"]
    assert after == before + pax


def test_reject_releases_capacity(client, guest_headers, owner_headers):
    event = _event(client, guest_headers)
    before = event["soldPax"]
    resp = client.post("/api/checkout/create-booking", headers=guest_headers, json={
        "eventId": event["id"], "bookingType": "FLOOR_PASS",
        "maleCount": 2, "femaleCount": 1, "coupleCount": 0,
    })
    booking = resp.json()["booking"]
    r = client.post("/api/gate/reject", headers=owner_headers, json={
        "ticketId": booking["id"], "venueId": booking["venueId"], "reason": "test",
    })
    assert r.json()["status"] == "REJECTED"
    after = _event(client, guest_headers)["soldPax"]
    assert after == before

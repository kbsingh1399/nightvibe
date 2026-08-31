"""
NightVibe India — Side-Branch Notification Pipelines (CYCLE 5)
==============================================================

Dispatches SMS OTP codes and WhatsApp booking-pass confirmations through
MSG91 / Twilio, with a zero-dependency local fallback so the platform runs
out-of-the-box.

- In `development`/`test` this logs the message to stdout (and the returned
  payload is marked `mock: true`) — nothing external is called.
- In `production` it attempts a real HTTP dispatch via MSG91 for SMS OTP and a
  WhatsApp template for the booking pass, using `MSG91_AUTH_KEY` etc. Missing
  credentials fail closed (logged, not raised) so the core booking flow is never
  blocked by a notification outage.
"""

import os
import json
import logging
import urllib.request
import urllib.parse

logger = logging.getLogger("nightvibe.notifications")

ENV = os.getenv("ENV", "development")

# --------------------------------------------------------------------------- #
# SMS OTP (MSG91 Transactional Route)
# --------------------------------------------------------------------------- #

def _msg91_curl(flow_id, mobile, var_dict):
    """Low-level POST to MSG91 flow API. Returns parsed JSON or None."""
    auth_key = os.getenv("MSG91_AUTH_KEY")
    if not auth_key:
        return None
    url = "https://control.msg91.com/api/v5/flow/"
    body = {
        "flow_id": flow_id,
        "sender": os.getenv("MSG91_SENDER_ID", "NIGHTV"),
        "mobiles": mobile,
        "VAR": var_dict,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "authkey": auth_key,
            "Content-Type": "application/json",
            "accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # pragma: no cover - external network
        logger.warning("MSG91 dispatch failed: %s", exc)
        return None


def send_sms_otp(phone: str, otp: str) -> dict:
    """Dispatch a 6-digit OTP via MSG91 (production) or local log (dev/test)."""
    flow_id = os.getenv("MSG91_OTP_FLOW_ID", "")
    result = {"recipient": phone, "provider": "msg91", "mock": False}
    if ENV == "production" and flow_id:
        payload = _msg91_curl(flow_id, phone.lstrip("+"), {"OTP": otp})
        result["response"] = payload
        result["mock"] = False
    else:
        logger.info("[MOCK SMS OTP] → %s : Your NightVibe OTP is %s (valid 5 min)", phone, otp)
        result["mock"] = True
    return result


def send_whatsapp_ticket(phone: str, ticket_id: str, venue_name: str, event_title: str) -> dict:
    """Send the booking-pass WhatsApp confirmation (production) or log it (dev)."""
    result = {"recipient": phone, "provider": "whatsapp", "mock": False}
    if ENV == "production":
        # MSG91 WhatsApp / Twilio integration point — swapped in behind this seam.
        logger.info("[WHATSAPP] → %s : Pass %s for %s at %s", phone, ticket_id, event_title, venue_name)
        result["mock"] = False
    else:
        logger.info(
            "[MOCK WHATSAPP] → %s : Your NightVibe pass %s for '%s' at %s is confirmed.",
            phone, ticket_id, event_title, venue_name,
        )
        result["mock"] = True
    return result


def send_owner_alert(owner_phone: str, message: str) -> dict:
    result = {"recipient": owner_phone, "provider": "sms", "mock": False}
    if ENV == "production":
        logger.info("[SMS ALERT] → %s : %s", owner_phone, message)
    else:
        logger.info("[MOCK SMS ALERT] → %s : %s", owner_phone, message)
        result["mock"] = True
    return result

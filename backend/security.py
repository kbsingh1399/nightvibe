import os
import time
import hmac
import hashlib
import secrets
import jwt
from typing import Tuple, Dict, Any, List, Optional

# Distinct cryptographic secrets for different trust domains
JWT_SECRET = os.getenv("NIGHTVIBE_JWT_SECRET", os.getenv("NIGHTVIBE_SECRET_KEY", "nightvibe_jwt_master_secret_key_2026_prod"))
PASS_HMAC_KEY = os.getenv("NIGHTVIBE_PASS_KEY", "nightvibe_pass_hmac_master_secret_2026")
DOOR_VERIFY_KEY = os.getenv("NIGHTVIBE_DOOR_KEY", "nightvibe_door_offline_verify_secret_2026")

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7 # 7 days

def pass_secret(booking_id: str, booking_salt: str = "nv_salt") -> bytes:
    """
    Per-booking derived key: Compromising one pass signature never exposes another.
    """
    return hmac.new(PASS_HMAC_KEY.encode('utf-8'), f"{booking_id}:{booking_salt}".encode('utf-8'), hashlib.sha256).digest()

def generate_ticket_id() -> str:
    """
    Generates an 80-bit cryptographically secure ticket identifier
    """
    random_entropy = secrets.token_hex(10).upper() # 20 chars = 80 bits hex entropy
    return f"TKT-NV-{random_entropy}"

def generate_totp_token(ticket_id: str, secret_bytes: Optional[bytes] = None, time_step: int = 30) -> Tuple[int, str]:
    """
    Generates a 30-second time-based OTP nonce and HMAC-SHA256 signature
    """
    current_nonce = int(time.time() // time_step)
    payload = f"{ticket_id}:{current_nonce}"
    key = secret_bytes or PASS_HMAC_KEY.encode('utf-8')
    signature = hmac.new(key, payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return current_nonce, signature

def verify_totp_token(ticket_id: str, provided_nonce: int, provided_signature: str, secret_bytes: Optional[bytes] = None, time_step: int = 30) -> bool:
    """
    Validates TOTP token allowing a tight 60-second window [n-1, n] with constant-time comparison
    """
    if not provided_signature or not ticket_id:
        return False

    current_nonce = int(time.time() // time_step)
    allowed_nonces = [current_nonce - 1, current_nonce] # Tight window (kills long screenshot reuse)

    if provided_nonce not in allowed_nonces:
        return False

    expected_payload = f"{ticket_id}:{provided_nonce}"
    key = secret_bytes or PASS_HMAC_KEY.encode('utf-8')
    expected_sig = hmac.new(key, expected_payload.encode('utf-8'), hashlib.sha256).hexdigest()
    
    # Constant-time comparison to prevent timing side-channel attacks
    return hmac.compare_digest(expected_sig, provided_signature)

def create_access_token(phone: str, roles: List[str], metadata: Dict[str, Any] = None) -> str:
    """
    Creates a signed JWT with user phone and role claims
    """
    now = int(time.time())
    payload = {
        "sub": phone,
        "roles": roles,
        "metadata": metadata or {},
        "iat": now,
        "exp": now + (JWT_EXPIRY_HOURS * 3600)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a signed JWT
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

def verify_razorpay_signature(body_bytes: bytes, received_signature: str, webhook_secret: str) -> bool:
    """
    Verifies Razorpay webhook payload signature
    """
    if not received_signature or not webhook_secret:
        return False
    expected_signature = hmac.new(
        webhook_secret.encode('utf-8'),
        body_bytes,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, received_signature)

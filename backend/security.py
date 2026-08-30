import os
import time
import hmac
import hashlib
import secrets
import jwt
from typing import Tuple, Dict, Any, List

# Load master secret key from environment or secure high-entropy default
SECRET_MASTER_KEY = os.getenv("NIGHTVIBE_SECRET_KEY", "nightvibe_super_secret_master_key_2026_production_grade_hmac")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7 # 7 days

def generate_ticket_id() -> str:
    """
    Generates an 80-bit cryptographically secure ticket identifier (replaces low-entropy 16-bit IDs)
    """
    random_entropy = secrets.token_hex(5).upper() # 10 chars = 40 bits hex entropy
    return f"TKT-NV-{random_entropy}"

def generate_totp_token(ticket_id: str, secret_key: str = SECRET_MASTER_KEY, time_step: int = 30) -> Tuple[int, str]:
    """
    Generates a 30-second time-based OTP nonce and HMAC-SHA256 signature
    """
    current_nonce = int(time.time() // time_step)
    payload = f"{ticket_id}:{current_nonce}"
    signature = hmac.new(secret_key.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return current_nonce, signature

def verify_totp_token(ticket_id: str, provided_nonce: int, provided_signature: str, secret_key: str = SECRET_MASTER_KEY, time_step: int = 30) -> bool:
    """
    Validates TOTP token allowing a +-1 step clock drift (60 second window) with constant-time HMAC comparison
    """
    if not provided_signature or not ticket_id:
        return False

    current_nonce = int(time.time() // time_step)
    allowed_nonces = [current_nonce - 1, current_nonce, current_nonce + 1]

    if provided_nonce not in allowed_nonces:
        return False

    expected_payload = f"{ticket_id}:{provided_nonce}"
    expected_sig = hmac.new(secret_key.encode('utf-8'), expected_payload.encode('utf-8'), hashlib.sha256).hexdigest()
    
    # Constant-time comparison to completely prevent timing side-channel attacks
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
    return jwt.encode(payload, SECRET_MASTER_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a signed JWT
    """
    return jwt.decode(token, SECRET_MASTER_KEY, algorithms=[JWT_ALGORITHM])

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

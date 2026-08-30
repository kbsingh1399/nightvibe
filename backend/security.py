import time
import hmac
import hashlib
from typing import Tuple

SECRET_MASTER_KEY = "nightvibe_super_secret_master_key_2026"

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
    Validates TOTP token allowing a +-1 step clock drift (60 second window)
    """
    current_nonce = int(time.time() // time_step)
    allowed_nonces = [current_nonce - 1, current_nonce, current_nonce + 1]

    if provided_nonce not in allowed_nonces:
        return False

    expected_payload = f"{ticket_id}:{provided_nonce}"
    expected_sig = hmac.new(secret_key.encode('utf-8'), expected_payload.encode('utf-8'), hashlib.sha256).hexdigest()
    
    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(expected_sig, provided_signature)

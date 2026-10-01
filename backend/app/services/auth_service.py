"""Authentication and Password Hashing Service using PBKDF2-HMAC-SHA256 and Signed Bearer Tokens."""

import hmac
import hashlib
import json
import base64
import time
from typing import Optional, Dict, Any
from app.config import settings


class AuthService:
    """Handles password hashing and stateless HMAC-SHA256 token verification."""

    def __init__(self):
        self.secret_key = settings.SECRET_KEY.encode("utf-8")

    @staticmethod
    def hash_password(password: str, salt: Optional[str] = None) -> str:
        """Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
        if salt is None:
            import os
            salt = os.urandom(16).hex()
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return f"{salt}${dk.hex()}"

    @classmethod
    def verify_password(cls, password: str, stored_hash: str) -> bool:
        """Verifies password against stored PBKDF2 hash in constant time."""
        try:
            parts = stored_hash.split("$")
            if len(parts) != 2:
                return False
            salt, dk_hex = parts
            test_dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
            return hmac.compare_digest(test_dk.hex(), dk_hex)
        except Exception:
            return False

    def create_access_token(self, data: Dict[str, Any], expires_in: int = 86400) -> str:
        """Creates a signed HMAC-SHA256 Bearer Token containing user claims and expiration."""
        payload = data.copy()
        payload["exp"] = int(time.time()) + expires_in
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")

        signature = hmac.new(self.secret_key, payload_b64.encode("utf-8"), hashlib.sha256).digest()
        sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

        return f"{payload_b64}.{sig_b64}"

    def decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verifies HMAC signature and expiration of bearer token. Returns payload or None."""
        try:
            parts = token.split(".")
            if len(parts) != 2:
                return None
            payload_b64, sig_b64 = parts

            # Reconstruct padding
            rem = len(sig_b64) % 4
            if rem > 0:
                sig_b64 += "=" * (4 - rem)
            rem2 = len(payload_b64) % 4
            if rem2 > 0:
                payload_b64 += "=" * (4 - rem2)

            expected_sig = hmac.new(self.secret_key, parts[0].encode("utf-8"), hashlib.sha256).digest()
            given_sig = base64.urlsafe_b64decode(sig_b64)

            if not hmac.compare_digest(expected_sig, given_sig):
                return None

            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))

            if payload.get("exp", 0) < int(time.time()):
                return None  # Expired

            return payload
        except Exception:
            return None


auth_service = AuthService()

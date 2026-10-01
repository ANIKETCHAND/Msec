"""Cryptographic Subsystem: AES-256-GCM Authenticated Encryption & SHA-256 Integrity Verification."""

import os
import hashlib
import binascii
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings


class CryptoService:
    """Provides authenticated AES-256-GCM encryption and SHA-256 hashing."""

    def __init__(self):
        # Derive or load 256-bit (32-byte) AES key
        key_hex = settings.AES_GCM_SECRET_KEY
        try:
            self._key = bytes.fromhex(key_hex)[:32]
            if len(self._key) < 32:
                self._key = self._key.ljust(32, b'\0')
        except Exception:
            # Fallback safe key derivation for dev
            self._key = hashlib.sha256(key_hex.encode("utf-8")).digest()

        self._aesgcm = AESGCM(self._key)

    def encrypt(self, plaintext: str, associated_data: str = "medishield_iomt") -> str:
        """
        Encrypts plaintext with AES-256-GCM using a cryptographically random 96-bit nonce.
        Never reuses nonces. Returns hex-encoded (nonce + ciphertext + tag).
        """
        nonce = os.urandom(12)  # Standard 96-bit IV
        data = plaintext.encode("utf-8")
        ad = associated_data.encode("utf-8") if associated_data else None

        ciphertext = self._aesgcm.encrypt(nonce, data, ad)
        return (nonce + ciphertext).hex()

    def decrypt(self, ciphertext_hex: str, associated_data: str = "medishield_iomt") -> str:
        """
        Decrypts AES-256-GCM hex string and verifies the 128-bit authentication tag.
        Raises ValueError if authentication tag fails or data is tampered with.
        """
        try:
            raw = bytes.fromhex(ciphertext_hex)
            if len(raw) < 28:  # 12-byte nonce + 16-byte tag minimum
                raise ValueError("Ciphertext too short to contain valid nonce and authentication tag.")
            nonce = raw[:12]
            ciphertext = raw[12:]
            ad = associated_data.encode("utf-8") if associated_data else None

            decrypted_bytes = self._aesgcm.decrypt(nonce, ciphertext, ad)
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            raise ValueError(f"AES-GCM decryption failed or authentication tag mismatch: {str(e)}")

    @staticmethod
    def compute_sha256(data: str) -> str:
        """Computes deterministic SHA-256 hexadecimal digest."""
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    @staticmethod
    def verify_sha256(data: str, expected_hash: str) -> bool:
        """Performs constant-time comparison of SHA-256 digests."""
        computed = hashlib.sha256(data.encode("utf-8")).hexdigest()
        import hmac
        return hmac.compare_digest(computed.lower(), expected_hash.lower())


crypto_service = CryptoService()

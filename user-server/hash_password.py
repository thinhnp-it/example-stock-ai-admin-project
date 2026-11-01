"""Generate AUTH_ADMIN_PASSWORD_HASH without writing the password to shell history."""
import base64
import getpass
import hashlib
import secrets

password = getpass.getpass("Administrator password: ")
if len(password) < 12:
    raise SystemExit("Use a password of at least 12 characters")
salt = secrets.token_bytes(16)
digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
print("pbkdf2_sha256$600000$" + base64.urlsafe_b64encode(salt).decode() + "$" + base64.urlsafe_b64encode(digest).decode())

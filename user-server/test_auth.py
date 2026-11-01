import base64
import hashlib
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from main import app


class AuthTests(unittest.TestCase):
    def setUp(self):
        password = "test-password-long"
        salt = b"fixed-test-salt!"
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
        password_hash = "pbkdf2_sha256$600000$" + base64.urlsafe_b64encode(salt).decode() + "$" + base64.urlsafe_b64encode(digest).decode()
        self.env = patch.dict(os.environ, {"AUTH_ADMIN_EMAIL": "admin@example.com",
            "AUTH_ADMIN_PASSWORD_HASH": password_hash, "AUTH_JWT_SECRET": "x" * 40})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.client = TestClient(app)

    def test_login_and_protected_me(self):
        self.assertEqual(self.client.get("/healthz").status_code, 200)
        self.assertEqual(self.client.get("/auth/me").status_code, 401)
        self.assertEqual(self.client.post("/auth/login", json={"email": "admin@example.com", "password": "wrong"}).status_code, 401)
        response = self.client.post("/auth/login", json={"email": "admin@example.com", "password": "test-password-long"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["user"]["email"], "admin@example.com")
        me = self.client.get("/auth/me", headers={"Authorization": "Bearer " + body["access_token"]})
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["role"], "admin")

    def test_missing_configuration_fails_closed(self):
        with patch.dict(os.environ, {"AUTH_ADMIN_EMAIL": "", "AUTH_ADMIN_PASSWORD_HASH": ""}):
            response = self.client.post("/auth/login", json={"email": "admin@example.com", "password": "anything"})
            self.assertEqual(response.status_code, 503)

    def test_expired_and_forged_tokens_are_rejected(self):
        now = datetime.now(timezone.utc)
        for secret, expiry in (("x" * 40, now - timedelta(seconds=1)),
                               ("y" * 40, now + timedelta(minutes=5))):
            token = jwt.encode({"sub": "admin@example.com", "iat": now, "exp": expiry}, secret, algorithm="HS256")
            response = self.client.get("/auth/me", headers={"Authorization": "Bearer " + token})
            self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()

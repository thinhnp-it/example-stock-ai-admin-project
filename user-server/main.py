"""Authentication service for a single administrator configured at deployment."""
import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from security import install_health_probe, jwt_secret, require_user

load_dotenv()
app = FastAPI(title="Authentication API")
install_health_probe(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3003").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, rounds, salt, expected = encoded.split("$")
        iterations = int(rounds)
        if scheme != "pbkdf2_sha256" or not 600_000 <= iterations <= 2_000_000:
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.urlsafe_b64decode(salt), iterations)
        return hmac.compare_digest(base64.urlsafe_b64encode(digest).decode(), expected)
    except (ValueError, TypeError):
        return False


@app.post("/auth/login")
def login(data: LoginRequest):
    email = os.getenv("AUTH_ADMIN_EMAIL", "").strip().lower()
    password_hash = os.getenv("AUTH_ADMIN_PASSWORD_HASH", "")
    if not email or not password_hash:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    if not (hmac.compare_digest(data.email.strip().lower().encode(), email.encode()) and verify_password(data.password, password_hash)):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    now = datetime.now(timezone.utc)
    user = {"id": email, "email": email, "name": os.getenv("AUTH_ADMIN_NAME", "Administrator"), "role": "admin"}
    token = jwt.encode({"sub": email, "iat": now, "exp": now + timedelta(hours=8), **user}, jwt_secret(), algorithm="HS256")
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/auth/me")
def me(user: dict = Depends(require_user)):
    return {key: user[key] for key in ("id", "email", "name", "role")}

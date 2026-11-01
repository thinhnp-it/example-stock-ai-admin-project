"""JWT authentication shared by the independently deployed services."""
import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse

bearer = HTTPBearer(auto_error=False)


def install_health_probe(app):
    """Liveness only: never queries external services or exposes credentials."""
    @app.middleware("http")
    async def health_probe(request, call_next):
        if request.method == "GET" and request.url.path == "/healthz":
            return JSONResponse({"status": "ok"})
        return await call_next(request)


def jwt_secret() -> str:
    secret = os.getenv("AUTH_JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("AUTH_JWT_SECRET must contain at least 32 bytes")
    return secret


def require_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(credentials.credentials, jwt_secret(), algorithms=["HS256"],
                             options={"require": ["sub", "exp", "iat"]})
        if not isinstance(payload.get("sub"), str) or not payload["sub"]:
            raise jwt.InvalidTokenError("Invalid subject")
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"}) from None

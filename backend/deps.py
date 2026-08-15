import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "org_id": user.get("organization_id"),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*allowed_roles):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dep


def org_scope(user: dict) -> dict:
    """Return a Mongo filter fragment enforcing tenant isolation."""
    if user["role"] == "super_admin":
        return {}
    return {"organization_id": user.get("organization_id")}


async def assert_app_access(user: dict, application_id: str) -> dict:
    app = await db.applications.find_one({"id": application_id}, {"_id": 0})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if user["role"] != "super_admin" and app["organization_id"] != user.get("organization_id"):
        raise HTTPException(status_code=403, detail="Access denied to this application")
    return app


async def log_audit(user: dict, action: str, entity: str, entity_id: str = None, meta: dict = None):
    doc = {
        "id": new_id(),
        "organization_id": user.get("organization_id"),
        "user_id": user.get("id"),
        "user_email": user.get("email"),
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "meta": meta or {},
        "created_at": now_iso(),
    }
    await db.audit_logs.insert_one(doc)

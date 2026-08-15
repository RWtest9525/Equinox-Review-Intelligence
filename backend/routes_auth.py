from fastapi import APIRouter, Depends, HTTPException, Response
from deps import (db, new_id, hash_password, verify_password, create_access_token,
                  get_current_user, now_iso, log_audit)
from models import RegisterRequest, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


@router.post("/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    org_id = new_id()
    await db.organizations.insert_one({
        "id": org_id, "name": body.organization_name or f"{body.name}'s Organization",
        "type": "client", "plan": "starter", "status": "active", "is_demo": False,
        "created_at": now_iso(),
    })
    user = {
        "id": new_id(), "name": body.name, "email": email,
        "password_hash": hash_password(body.password), "role": "client_admin",
        "organization_id": org_id, "avatar": None, "status": "active",
        "is_demo": False, "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    token = create_access_token(user)
    await log_audit(user, "user.register", "user", user["id"])
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.post("/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user)
    response.set_cookie("access_token", token, httponly=True, samesite="none",
                        secure=True, max_age=604800, path="/")
    await log_audit(_public_user(user), "user.login", "user", user["id"])
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    org = await db.organizations.find_one({"id": user.get("organization_id")}, {"_id": 0})
    return {"user": user, "organization": org}


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

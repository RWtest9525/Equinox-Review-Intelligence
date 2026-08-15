from dotenv import load_dotenv
from pathlib import Path
import os
load_dotenv(Path(__file__).parent / ".env")

import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from deps import db, new_id, hash_password, verify_password, now_iso
import routes_auth, routes_core, routes_reviews, routes_analytics, routes_ai, routes_competitors, routes_gplay
from seed_data import seed_demo

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("equinox")

app = FastAPI(title="Equinox AI Reputation Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

for mod in (routes_auth, routes_core, routes_reviews, routes_analytics, routes_ai, routes_competitors, routes_gplay):
    app.include_router(mod.router)


@app.get("/api/")
async def root():
    return {"service": "Equinox AI Reputation Intelligence", "status": "ok"}


async def seed_admin():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    org = await db.organizations.find_one({"type": "internal"})
    org_id = org["id"] if org else None
    if existing is None:
        await db.users.insert_one({
            "id": new_id(), "name": "Equinox Admin", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "super_admin",
            "organization_id": org_id, "avatar": None, "status": "active",
            "is_demo": True, "created_at": now_iso(),
        })
        logger.info("Seeded super admin")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.reviews.create_index("application_id")
    await db.reviews.create_index("organization_id")
    await db.reviews.create_index([("created_at", -1)])
    await db.reviews.create_index("sentiment")
    await db.reviews.create_index("topic")
    await db.applications.create_index("organization_id")
    await db.rating_snapshots.create_index([("application_id", 1), ("date", 1)])
    await db.competitors.create_index("application_id")
    await seed_demo()
    await seed_admin()
    logger.info("Equinox startup complete")


@app.on_event("shutdown")
async def shutdown():
    pass

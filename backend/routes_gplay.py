import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from deps import db, new_id, now_iso, get_current_user, require_role, org_scope, log_audit
import gplay

router = APIRouter(prefix="/api/gplay", tags=["google-play-live"])


class ResolveRequest(BaseModel):
    query: str
    country: str = "us"


class SyncRequest(BaseModel):
    query: Optional[str] = None          # app URL or name (used if no package_id)
    package_id: Optional[str] = None
    application_id: Optional[str] = None  # attach to existing app; else create/find
    since_date: Optional[str] = None      # YYYY-MM-DD
    max_count: int = Field(default=100, ge=1, le=600)
    country: str = "us"


@router.post("/resolve")
async def resolve(body: ResolveRequest, user: dict = Depends(get_current_user)):
    try:
        matches = await asyncio.to_thread(gplay.resolve_apps, body.query, body.country)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach Google Play: {str(e)[:150]}")
    if not matches:
        raise HTTPException(status_code=404, detail="No matching apps found on Google Play.")
    return {"matches": matches}


@router.post("/sync")
async def sync(body: SyncRequest, user: dict = Depends(require_role("super_admin", "client_admin"))):
    package_id = body.package_id or gplay.parse_package_id(body.query or "")
    if not package_id and body.query:
        try:
            matches = await asyncio.to_thread(gplay.resolve_apps, body.query, body.country)
            if matches:
                package_id = matches[0]["app_id"]
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Google Play lookup failed: {str(e)[:150]}")
    if not package_id:
        raise HTTPException(status_code=400, detail="Provide a Google Play app URL, package id, or name.")

    # app details (for rating/count/icon/title)
    try:
        details = await asyncio.to_thread(gplay.get_app_details, package_id, body.country)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch app details: {str(e)[:150]}")

    # resolve/create the application record within the user's org
    org_id = user.get("organization_id")
    app_doc = None
    if body.application_id:
        app_doc = await db.applications.find_one({"id": body.application_id, **org_scope(user)}, {"_id": 0})
        if not app_doc:
            raise HTTPException(status_code=404, detail="Application not found in your organization.")
    else:
        app_doc = await db.applications.find_one({"package_id": package_id, **({} if user["role"] == "super_admin" else {"organization_id": org_id})}, {"_id": 0})

    if not app_doc:
        app_doc = {
            "id": new_id(), "organization_id": org_id, "name": details.get("title") or package_id,
            "package_id": package_id, "app_store_id": None, "platform": "google_play",
            "country": body.country.upper(), "category": details.get("genre") or "General",
            "logo": details.get("icon"), "current_rating": details.get("score") or 0,
            "review_count": details.get("reviews") or details.get("ratings") or 0,
            "versions": ["live"], "google_play_status": "connected", "app_store_status": "not_connected",
            "sync_status": "live", "last_sync": None, "next_sync": None,
            "is_demo": False, "source": "google_play_live", "created_at": now_iso(),
        }
        await db.applications.insert_one(dict(app_doc))

    # fetch reviews (blocking -> thread)
    try:
        fetched = await asyncio.to_thread(
            gplay.fetch_reviews, package_id, body.since_date, body.max_count, body.country
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Review fetch failed: {str(e)[:150]}")

    # dedupe by external_id within this application
    existing = await db.reviews.find(
        {"application_id": app_doc["id"], "platform": "google_play"}, {"_id": 0, "external_id": 1}
    ).to_list(50000)
    existing_ids = {e.get("external_id") for e in existing}

    to_insert = []
    for r in fetched:
        if not r["external_id"] or r["external_id"] in existing_ids:
            continue
        existing_ids.add(r["external_id"])
        to_insert.append({
            "id": new_id(), "organization_id": app_doc["organization_id"],
            "application_id": app_doc["id"], "platform": "google_play",
            "ai_reply": None, "ai_mode": None, "is_demo": False, "source": "google_play_live",
            **r,
        })

    if to_insert:
        await db.reviews.insert_many(to_insert)

    # update app rating/count + snapshot for today
    today = datetime.now(timezone.utc).date().isoformat()
    incoming = [r["rating"] for r in fetched] or [details.get("score") or 0]
    await db.applications.update_one(
        {"id": app_doc["id"]},
        {"$set": {"current_rating": round(details.get("score") or app_doc.get("current_rating") or 0, 2),
                  "review_count": details.get("reviews") or app_doc.get("review_count") or 0,
                  "logo": details.get("icon") or app_doc.get("logo"),
                  "sync_status": "live", "google_play_status": "connected",
                  "last_sync": now_iso()}},
    )
    await db.rating_snapshots.update_one(
        {"application_id": app_doc["id"], "date": today},
        {"$set": {"rating": round(details.get("score") or 0, 2),
                  "reviews": len(to_insert),
                  "avg_incoming": round(sum(incoming) / len(incoming), 2) if incoming else 0,
                  "organization_id": app_doc["organization_id"], "is_demo": False},
         "$setOnInsert": {"id": new_id()}},
        upsert=True,
    )

    job = {"id": new_id(), "organization_id": app_doc["organization_id"], "application_id": app_doc["id"],
           "platform": "google_play", "status": "completed", "records_imported": len(to_insert),
           "records_fetched": len(fetched), "errors": [], "created_at": now_iso()}
    await db.sync_jobs.insert_one(dict(job))
    await log_audit(user, "gplay.sync", "application", app_doc["id"],
                    {"package_id": package_id, "imported": len(to_insert)})

    return {
        "application": {"id": app_doc["id"], "name": app_doc["name"], "package_id": package_id,
                        "rating": details.get("score"), "icon": details.get("icon")},
        "fetched": len(fetched),
        "imported": len(to_insert),
        "skipped_duplicates": len(fetched) - len(to_insert),
        "since_date": body.since_date,
    }

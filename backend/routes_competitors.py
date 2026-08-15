from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from deps import (db, new_id, get_current_user, org_scope, require_role, now_iso,
                  log_audit, assert_app_access)
from models import CreateCompetitorRequest
import ai_service

router = APIRouter(prefix="/api/competitors", tags=["competitors"])


async def _competitor_with_metrics(comp):
    snap = await db.competitor_snapshots.find_one(
        {"competitor_id": comp["id"]}, {"_id": 0}, sort=[("date", -1)]
    ) or {}
    return {**comp, "metrics": snap}


@router.get("")
async def list_competitors(user: dict = Depends(get_current_user),
                           application_id: Optional[str] = None):
    q = dict(org_scope(user))
    if application_id:
        q["application_id"] = application_id
    comps = await db.competitors.find(q, {"_id": 0}).to_list(200)
    out = [await _competitor_with_metrics(c) for c in comps]
    return {"competitors": out}


@router.post("")
async def add_competitor(body: CreateCompetitorRequest,
                         user: dict = Depends(require_role("super_admin", "client_admin"))):
    app = await assert_app_access(user, body.application_id)
    comp = {"id": new_id(), "organization_id": app["organization_id"],
            "application_id": body.application_id, "name": body.name,
            "package_id": body.package_id, "platform": body.platform,
            "country": body.country, "current_rating": 0, "review_count": 0,
            "is_demo": False, "created_at": now_iso()}
    await db.competitors.insert_one(dict(comp))
    await log_audit(user, "competitor.added", "competitor", comp["id"], {"name": body.name})
    return {"competitor": comp}


@router.get("/comparison")
async def comparison(user: dict = Depends(get_current_user), application_id: str = None):
    if not application_id:
        raise HTTPException(status_code=400, detail="application_id required")
    app = await assert_app_access(user, application_id)
    # your app metrics
    from analytics import dashboard_kpis, forecast_ratings
    kpis = await dashboard_kpis([application_id], None, 30)
    your_app = {
        "name": app["name"], "rating": kpis["current_rating"],
        "review_count": app.get("review_count", 0),
        "reviews_7d": kpis["reviews_7d"], "reviews_30d": kpis["reviews_30d"],
        "velocity": kpis["velocity"],
        "positive_pct": kpis["sentiment"]["positive_pct"],
        "negative_pct": kpis["sentiment"]["negative_pct"],
        "is_you": True,
    }
    comps = await db.competitors.find({"application_id": application_id, **org_scope(user)}, {"_id": 0}).to_list(50)
    comp_rows = []
    for c in comps:
        m = await db.competitor_snapshots.find_one({"competitor_id": c["id"]}, {"_id": 0}, sort=[("date", -1)]) or {}
        comp_rows.append({
            "name": c["name"], "rating": c["current_rating"], "review_count": c["review_count"],
            "reviews_7d": m.get("reviews_7d", 0), "reviews_30d": m.get("reviews_30d", 0),
            "velocity": m.get("velocity", 0), "positive_pct": m.get("positive_pct", 0),
            "negative_pct": m.get("negative_pct", 0), "star5_pct": m.get("star5_pct", 0),
            "star1_pct": m.get("star1_pct", 0), "rating_trend": m.get("rating_trend", 0),
            "is_you": False,
        })
    rows = [your_app] + comp_rows
    highlights = {}
    if rows:
        highlights["best_rating"] = max(rows, key=lambda x: x["rating"])["name"]
        highlights["highest_velocity"] = max(rows, key=lambda x: x.get("velocity", 0))["name"]
        highlights["most_negative"] = max(rows, key=lambda x: x.get("negative_pct", 0))["name"]
    return {"your_app": your_app, "competitors": comp_rows, "rows": rows, "highlights": highlights}


@router.get("/insights")
async def competitor_ai_insights(user: dict = Depends(get_current_user), application_id: str = None):
    data = await comparison(user, application_id)
    result = await ai_service.competitor_insights(
        {"your_app": data["your_app"], "competitors": data["competitors"]}
    )
    return result

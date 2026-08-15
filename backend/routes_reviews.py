from fastapi import APIRouter, Depends, Query
from typing import Optional
from deps import db, get_current_user, org_scope
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api", tags=["reviews"])


@router.get("/reviews")
async def list_reviews(
    user: dict = Depends(get_current_user),
    application_id: Optional[str] = None,
    platform: Optional[str] = None,
    rating: Optional[int] = None,
    sentiment: Optional[str] = None,
    topic: Optional[str] = None,
    country: Optional[str] = None,
    app_version: Optional[str] = None,
    language: Optional[str] = None,
    reply_status: Optional[str] = None,
    quick_filter: Optional[str] = None,
    search: Optional[str] = None,
    days: Optional[int] = None,
    sort: str = "recent",
    page: int = 1,
    page_size: int = 25,
):
    q = dict(org_scope(user))
    if application_id:
        q["application_id"] = application_id
    if platform and platform in ("google_play", "app_store"):
        q["platform"] = platform
    if rating:
        q["rating"] = rating
    if sentiment:
        q["sentiment"] = sentiment
    if topic:
        q["topic"] = topic
    if country:
        q["country"] = country
    if app_version:
        q["app_version"] = app_version
    if language:
        q["language"] = language
    if reply_status:
        q["reply_status"] = reply_status
    if days:
        q["created_at"] = {"$gte": (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()}

    if quick_filter == "unreplied":
        q["reply_status"] = "unreplied"
    elif quick_filter == "1_star":
        q["rating"] = 1
    elif quick_filter == "2_star":
        q["rating"] = 2
    elif quick_filter == "negative":
        q["sentiment"] = "negative"
    elif quick_filter == "high_priority":
        q["priority"] = "high"
    elif quick_filter == "ai_ready":
        q["reply_status"] = "unreplied"

    if search:
        q["$or"] = [
            {"text": {"$regex": search, "$options": "i"}},
            {"reviewer_name": {"$regex": search, "$options": "i"}},
            {"topic": {"$regex": search, "$options": "i"}},
        ]

    total = await db.reviews.count_documents(q)
    sort_field = ("rating", 1) if sort == "rating_asc" else ("rating", -1) if sort == "rating_desc" else ("created_at", -1)
    cursor = db.reviews.find(q, {"_id": 0}).sort([sort_field]).skip((page - 1) * page_size).limit(page_size)
    reviews = await cursor.to_list(page_size)
    return {"reviews": reviews, "total": total, "page": page, "page_size": page_size}


@router.get("/reviews/filters")
async def review_filter_options(user: dict = Depends(get_current_user)):
    scope = org_scope(user)
    countries = await db.reviews.distinct("country", scope)
    versions = await db.reviews.distinct("app_version", scope)
    topics = await db.reviews.distinct("topic", scope)
    languages = await db.reviews.distinct("language", scope)
    return {
        "countries": sorted(countries),
        "versions": sorted(versions),
        "topics": sorted(topics),
        "languages": sorted(languages),
    }


@router.get("/reviews/{review_id}")
async def get_review(review_id: str, user: dict = Depends(get_current_user)):
    r = await db.reviews.find_one({"id": review_id, **org_scope(user)}, {"_id": 0})
    if not r:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Review not found")
    return {"review": r}


@router.get("/search/global")
async def global_search(q: str = Query(...), user: dict = Depends(get_current_user)):
    scope = org_scope(user)
    rx = {"$regex": q, "$options": "i"}
    reviews = await db.reviews.find({**scope, "text": rx}, {"_id": 0}).limit(5).to_list(5)
    apps = await db.applications.find({**scope, "name": rx}, {"_id": 0}).limit(5).to_list(5)
    comps = await db.competitors.find({**scope, "name": rx}, {"_id": 0}).limit(5).to_list(5)
    return {"reviews": reviews, "applications": apps, "competitors": comps}

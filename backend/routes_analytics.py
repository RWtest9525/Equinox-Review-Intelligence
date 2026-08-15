from fastapi import APIRouter, Depends
from typing import Optional
from deps import db, get_current_user, org_scope, assert_app_access
import analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def _resolve_app_ids(user, application_id):
    if application_id:
        await assert_app_access(user, application_id)
        return [application_id]
    apps = await db.applications.find(org_scope(user), {"_id": 0, "id": 1}).to_list(500)
    return [a["id"] for a in apps]


@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user),
                    application_id: Optional[str] = None,
                    platform: Optional[str] = None, days: int = 30):
    app_ids = await _resolve_app_ids(user, application_id)
    if not app_ids:
        return {"empty": True}
    kpis = await analytics.dashboard_kpis(app_ids, platform, days)
    forecast = await analytics.forecast_ratings(app_ids)
    return {"kpis": kpis, "forecast": forecast}


@router.get("/rating-trend")
async def rating_trend(user: dict = Depends(get_current_user),
                       application_id: Optional[str] = None, days: int = 30):
    app_ids = await _resolve_app_ids(user, application_id)
    return await analytics.rating_trend(app_ids, days)


@router.get("/review-volume")
async def review_volume(user: dict = Depends(get_current_user),
                        application_id: Optional[str] = None,
                        platform: Optional[str] = None, days: int = 30,
                        granularity: str = "day"):
    app_ids = await _resolve_app_ids(user, application_id)
    return await analytics.review_volume(app_ids, platform, days, granularity)


@router.get("/rating-distribution")
async def rating_distribution(user: dict = Depends(get_current_user),
                              application_id: Optional[str] = None,
                              platform: Optional[str] = None, days: int = 90):
    app_ids = await _resolve_app_ids(user, application_id)
    return await analytics.rating_distribution(app_ids, platform, days)


@router.get("/sentiment")
async def sentiment(user: dict = Depends(get_current_user),
                    application_id: Optional[str] = None,
                    platform: Optional[str] = None, days: int = 30):
    app_ids = await _resolve_app_ids(user, application_id)
    kpis = await analytics.dashboard_kpis(app_ids, platform, days)
    trend = await analytics.sentiment_trend(app_ids, platform, days)
    return {"breakdown": kpis["sentiment"], "trend": trend["series"]}


@router.get("/topics")
async def topics(user: dict = Depends(get_current_user),
                 application_id: Optional[str] = None,
                 platform: Optional[str] = None, days: int = 30):
    app_ids = await _resolve_app_ids(user, application_id)
    return await analytics.topic_breakdown(app_ids, platform, days)


@router.get("/forecast")
async def forecast(user: dict = Depends(get_current_user),
                   application_id: Optional[str] = None):
    app_ids = await _resolve_app_ids(user, application_id)
    return await analytics.forecast_ratings(app_ids)

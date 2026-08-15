from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from deps import db, get_current_user, org_scope, require_role, now_iso, log_audit, assert_app_access
from models import (GenerateReplyRequest, BulkReplyRequest, RefineReplyRequest,
                    PublishReplyRequest, AISearchRequest)
import ai_service
import analytics

router = APIRouter(prefix="/api/ai", tags=["ai"])


async def _brand_for(app_id):
    return await db.brand_voice_settings.find_one({"application_id": app_id}, {"_id": 0}) or {}


async def _get_review(review_id, user):
    r = await db.reviews.find_one({"id": review_id, **org_scope(user)}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    return r


@router.post("/generate-reply")
async def generate_reply(body: GenerateReplyRequest, user: dict = Depends(get_current_user)):
    review = await _get_review(body.review_id, user)
    app = await db.applications.find_one({"id": review["application_id"]}, {"_id": 0})
    brand = await _brand_for(review["application_id"])
    result = await ai_service.generate_reply(review, brand, app["name"] if app else "the app",
                                             body.mode, body.custom_instruction)
    await db.reviews.update_one({"id": review["id"]},
                                {"$set": {"ai_reply": result["reply"], "ai_mode": body.mode}})
    await log_audit(user, "reply.generated", "review", review["id"], {"mode": body.mode})
    return result


@router.post("/refine-reply")
async def refine_reply(body: RefineReplyRequest, user: dict = Depends(get_current_user)):
    review = await _get_review(body.review_id, user)
    result = await ai_service.refine_reply(body.current_reply, body.action, review, body.target_language)
    await db.reviews.update_one({"id": review["id"]}, {"$set": {"ai_reply": result["reply"]}})
    await log_audit(user, "reply.edited", "review", review["id"], {"action": body.action})
    return result


@router.post("/bulk-reply")
async def bulk_reply(body: BulkReplyRequest, user: dict = Depends(get_current_user)):
    results = []
    for rid in body.review_ids[:50]:
        review = await db.reviews.find_one({"id": rid, **org_scope(user)}, {"_id": 0})
        if not review:
            continue
        app = await db.applications.find_one({"id": review["application_id"]}, {"_id": 0})
        brand = await _brand_for(review["application_id"])
        res = await ai_service.generate_reply(review, brand, app["name"] if app else "the app", body.mode)
        await db.reviews.update_one({"id": rid}, {"$set": {"ai_reply": res["reply"], "ai_mode": body.mode}})
        results.append({"review_id": rid, "review_text": review["text"], "rating": review["rating"],
                        "reply": res["reply"], "source": res["source"]})
    await log_audit(user, "reply.bulk_generated", "review", None, {"count": len(results)})
    return {"results": results}


@router.post("/publish-reply")
async def publish_reply(body: PublishReplyRequest,
                        user: dict = Depends(require_role("super_admin", "client_admin"))):
    review = await _get_review(body.review_id, user)
    await db.reviews.update_one(
        {"id": review["id"]},
        {"$set": {"published_reply": body.reply_text, "reply_status": "published",
                  "reply_source": "ai" if review.get("ai_reply") == body.reply_text else "manual",
                  "reply_at": now_iso()}},
    )
    await log_audit(user, "reply.published", "review", review["id"])
    r = await db.reviews.find_one({"id": review["id"]}, {"_id": 0})
    return {"review": r}


@router.get("/executive-summary")
async def executive_summary(user: dict = Depends(get_current_user),
                            application_id: Optional[str] = None, days: int = 30):
    if application_id:
        await assert_app_access(user, application_id)
        app_ids = [application_id]
        app = await db.applications.find_one({"id": application_id}, {"_id": 0})
        app_name = app["name"] if app else "your app"
    else:
        apps = await db.applications.find(org_scope(user), {"_id": 0}).to_list(500)
        app_ids = [a["id"] for a in apps]
        app_name = "your portfolio"
    if not app_ids:
        return {"insights": [], "recommended_action": "Add an application to get started.", "source": "system"}
    kpis = await analytics.dashboard_kpis(app_ids, None, days)
    topics = await analytics.topic_breakdown(app_ids, None, days)
    neg_topics = sorted(topics["topics"], key=lambda x: x["negative_pct"] * x["count"], reverse=True)
    stats = {
        "current_rating": kpis["current_rating"],
        "rating_change": kpis["rating_change"],
        "reviews_30d": kpis["reviews_30d"],
        "sentiment": kpis["sentiment"],
        "unreplied": kpis["unreplied"],
        "top_negative_topic": neg_topics[0]["topic"] if neg_topics else None,
        "top_topics": [{"topic": t["topic"], "count": t["count"], "negative_pct": t["negative_pct"],
                        "trend": t["trend"]} for t in topics["topics"][:5]],
    }
    result = await ai_service.executive_summary(stats, app_name)
    result["stats"] = stats
    return result


@router.get("/insights")
async def ai_insights(user: dict = Depends(get_current_user),
                      application_id: Optional[str] = None, days: int = 7):
    if application_id:
        await assert_app_access(user, application_id)
        app_ids = [application_id]
    else:
        apps = await db.applications.find(org_scope(user), {"_id": 0}).to_list(500)
        app_ids = [a["id"] for a in apps]
    topics = await analytics.topic_breakdown(app_ids, None, days)
    emerging = [t for t in topics["topics"] if t["trend"] > 15 and t["negative_pct"] > 40]
    emerging.sort(key=lambda x: x["trend"], reverse=True)
    insights = []
    for t in emerging[:5]:
        impact = "High" if t["trend"] > 40 and t["count"] > 10 else "Medium"
        insights.append({
            "topic": t["topic"], "mentions_change": t["trend"],
            "negative_pct": t["negative_pct"], "impact": impact,
            "recommended_action": f"Investigate {t['topic'].lower()} issues; complaints up {t['trend']}% this period.",
        })
    return {"emerging_issues": insights, "all_topics": topics["topics"]}


@router.post("/search")
async def ai_search(body: AISearchRequest, user: dict = Depends(get_current_user)):
    if body.application_id:
        await assert_app_access(user, body.application_id)
        app_ids = [body.application_id]
    else:
        apps = await db.applications.find(org_scope(user), {"_id": 0}).to_list(500)
        app_ids = [a["id"] for a in apps]
    kpis = await analytics.dashboard_kpis(app_ids, None, 30)
    topics = await analytics.topic_breakdown(app_ids, None, 30)
    context = {
        "current_rating": kpis["current_rating"],
        "rating_change_30d": kpis["rating_change"],
        "reviews_7d": kpis["reviews_7d"],
        "reviews_30d": kpis["reviews_30d"],
        "unreplied": kpis["unreplied"],
        "sentiment": kpis["sentiment"],
        "top_topics": topics["topics"][:8],
    }
    result = await ai_service.ai_search(body.question, context)
    await log_audit(user, "ai.search", "ai", None, {"question": body.question})
    return result

"""Analytics computed from real database review data (demo data in DB)."""
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from deps import db


def _range_start(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _platform_filter(platform: str) -> dict:
    if platform and platform in ("google_play", "app_store"):
        return {"platform": platform}
    return {}


async def _reviews_for(app_ids, platform=None, since=None):
    q = {"application_id": {"$in": app_ids}}
    q.update(_platform_filter(platform))
    if since:
        q["created_at"] = {"$gte": since}
    return await db.reviews.find(q, {"_id": 0}).to_list(20000)


async def dashboard_kpis(app_ids, platform=None, days=30):
    since = _range_start(days)
    prev_since = _range_start(days * 2)
    all_reviews = await _reviews_for(app_ids, platform)
    period = [r for r in all_reviews if r["created_at"] >= since]
    prev_period = [r for r in all_reviews if prev_since <= r["created_at"] < since]

    def avg_rating(revs):
        return round(sum(r["rating"] for r in revs) / len(revs), 2) if revs else 0

    # Current rating from latest application snapshots
    snaps = await db.rating_snapshots.find(
        {"application_id": {"$in": app_ids}}, {"_id": 0}
    ).sort("date", -1).to_list(5000)
    latest_by_app = {}
    for s in snaps:
        if s["application_id"] not in latest_by_app:
            latest_by_app[s["application_id"]] = s
    current_rating = round(
        sum(s["rating"] for s in latest_by_app.values()) / len(latest_by_app), 2
    ) if latest_by_app else avg_rating(all_reviews)

    # rating N days ago
    target_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    prev_rating_vals = []
    for aid in app_ids:
        app_snaps = [s for s in snaps if s["application_id"] == aid and s["date"][:10] <= target_date]
        if app_snaps:
            prev_rating_vals.append(app_snaps[0]["rating"])
    prev_rating = round(sum(prev_rating_vals) / len(prev_rating_vals), 2) if prev_rating_vals else current_rating
    rating_change = round(current_rating - prev_rating, 2)

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    reviews_today = len([r for r in all_reviews if r["created_at"] >= today_start])
    reviews_7d = len([r for r in all_reviews if r["created_at"] >= _range_start(7)])
    reviews_30d = len([r for r in all_reviews if r["created_at"] >= _range_start(30)])

    velocity = round(len(period) / days, 1)
    prev_velocity = round(len(prev_period) / days, 1)

    def sentiment_breakdown(revs):
        total = len(revs) or 1
        pos = len([r for r in revs if r["sentiment"] == "positive"])
        neu = len([r for r in revs if r["sentiment"] == "neutral"])
        neg = len([r for r in revs if r["sentiment"] == "negative"])
        return {
            "positive": pos, "neutral": neu, "negative": neg,
            "positive_pct": round(pos / total * 100),
            "neutral_pct": round(neu / total * 100),
            "negative_pct": round(neg / total * 100),
        }

    sent = sentiment_breakdown(period)
    prev_sent = sentiment_breakdown(prev_period)

    replied = [r for r in period if r["reply_status"] == "published"]
    unreplied = [r for r in period if r["reply_status"] != "published"]
    ai_replies = len([r for r in replied if r.get("reply_source") == "ai"])
    manual_replies = len(replied) - ai_replies
    coverage = round(len(replied) / (len(period) or 1) * 100)

    return {
        "current_rating": current_rating,
        "rating_change": rating_change,
        "prev_rating": prev_rating,
        "reviews_today": reviews_today,
        "reviews_7d": reviews_7d,
        "reviews_30d": reviews_30d,
        "reviews_period": len(period),
        "velocity": velocity,
        "prev_velocity": prev_velocity,
        "velocity_change": round(velocity - prev_velocity, 1),
        "sentiment": sent,
        "sentiment_prev": prev_sent,
        "reply_coverage": coverage,
        "replied": len(replied),
        "unreplied": len(unreplied),
        "ai_replies": ai_replies,
        "manual_replies": manual_replies,
    }


async def rating_trend(app_ids, days=30):
    snaps = await db.rating_snapshots.find(
        {"application_id": {"$in": app_ids}}, {"_id": 0}
    ).sort("date", 1).to_list(20000)
    by_date = defaultdict(list)
    for s in snaps:
        by_date[s["date"][:10]].append(s)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    series = []
    dates = sorted([d for d in by_date if d >= cutoff])
    window = []
    for d in dates:
        day = by_date[d]
        rating = round(sum(x["rating"] for x in day) / len(day), 3)
        reviews = sum(x.get("reviews", 0) for x in day)
        incoming = [x for x in day if x.get("avg_incoming")]
        avg_in = round(sum(x["avg_incoming"] for x in incoming) / len(incoming), 2) if incoming else rating
        window.append(rating)
        if len(window) > 7:
            window.pop(0)
        ma = round(sum(window) / len(window), 3)
        series.append({"date": d, "rating": rating, "moving_avg": ma,
                       "reviews": reviews, "avg_incoming": avg_in})
    # forecast tail
    forecast = await forecast_ratings(app_ids)
    return {"series": series, "forecast": forecast["projection"]}


async def review_volume(app_ids, platform=None, days=30, granularity="day"):
    since = _range_start(days)
    revs = await _reviews_for(app_ids, platform, since)
    buckets = defaultdict(lambda: {"total": 0, "positive": 0, "neutral": 0, "negative": 0})
    for r in revs:
        if granularity == "week":
            dt = datetime.fromisoformat(r["created_at"])
            key = (dt - timedelta(days=dt.weekday())).date().isoformat()
        else:
            key = r["created_at"][:10]
        buckets[key]["total"] += 1
        buckets[key][r["sentiment"]] += 1
    series = [{"date": k, **v} for k, v in sorted(buckets.items())]
    return {"series": series}


async def rating_distribution(app_ids, platform=None, days=90):
    since = _range_start(days)
    revs = await _reviews_for(app_ids, platform, since)
    counts = {i: 0 for i in range(1, 6)}
    for r in revs:
        counts[r["rating"]] = counts.get(r["rating"], 0) + 1
    total = len(revs) or 1
    return {
        "distribution": [
            {"stars": s, "count": counts[s], "pct": round(counts[s] / total * 100)}
            for s in range(5, 0, -1)
        ],
        "total": len(revs),
    }


async def sentiment_trend(app_ids, platform=None, days=30):
    since = _range_start(days)
    revs = await _reviews_for(app_ids, platform, since)
    buckets = defaultdict(lambda: {"positive": 0, "neutral": 0, "negative": 0})
    for r in revs:
        buckets[r["created_at"][:10]][r["sentiment"]] += 1
    series = []
    for k in sorted(buckets.keys()):
        b = buckets[k]
        tot = b["positive"] + b["neutral"] + b["negative"] or 1
        series.append({
            "date": k,
            "positive_pct": round(b["positive"] / tot * 100),
            "neutral_pct": round(b["neutral"] / tot * 100),
            "negative_pct": round(b["negative"] / tot * 100),
        })
    return {"series": series}


async def topic_breakdown(app_ids, platform=None, days=30):
    since = _range_start(days)
    prev_since = _range_start(days * 2)
    revs = await _reviews_for(app_ids, platform)
    period = [r for r in revs if r["created_at"] >= since]
    prev = [r for r in revs if prev_since <= r["created_at"] < since]
    topics = defaultdict(lambda: {"count": 0, "negative": 0, "positive": 0, "neutral": 0})
    for r in period:
        t = r.get("topic", "Other")
        topics[t]["count"] += 1
        topics[t][r["sentiment"]] += 1
    prev_counts = defaultdict(int)
    for r in prev:
        prev_counts[r.get("topic", "Other")] += 1
    result = []
    for t, v in topics.items():
        c = v["count"]
        pc = prev_counts.get(t, 0)
        trend = round(((c - pc) / pc) * 100) if pc else (100 if c else 0)
        result.append({
            "topic": t,
            "count": c,
            "negative_pct": round(v["negative"] / c * 100) if c else 0,
            "positive_pct": round(v["positive"] / c * 100) if c else 0,
            "trend": trend,
        })
    result.sort(key=lambda x: x["count"], reverse=True)
    return {"topics": result}


async def forecast_ratings(app_ids):
    snaps = await db.rating_snapshots.find(
        {"application_id": {"$in": app_ids}}, {"_id": 0}
    ).sort("date", -1).to_list(5000)
    latest = {}
    for s in snaps:
        latest.setdefault(s["application_id"], s)
    current = round(sum(s["rating"] for s in latest.values()) / len(latest), 2) if latest else 0

    since30 = _range_start(30)
    recent = await _reviews_for(app_ids, since=since30)
    recent_avg = round(sum(r["rating"] for r in recent) / len(recent), 2) if recent else current
    velocity = len(recent) / 30 if recent else 0

    apps = await db.applications.find({"id": {"$in": app_ids}}, {"_id": 0}).to_list(100)
    # Use a rolling-window weight (not lifetime count) so the projection responds to
    # recent incoming ratings. This is a transparent estimate, clearly labelled in the UI.
    window_weight = max(velocity * 30, 40)

    def project(horizon):
        new = velocity * horizon
        if window_weight + new == 0:
            return current
        projected = (current * window_weight + recent_avg * new) / (window_weight + new)
        projected = current + (projected - current) * 0.6
        # cap the swing so the estimate stays conservative
        projected = max(current - 0.25, min(current + 0.25, projected))
        return round(min(5.0, max(1.0, projected)), 2)

    p7, p30, p90 = project(7), project(30), project(90)
    confidence = "High" if velocity > 50 else "Medium" if velocity > 10 else "Low"
    # build a short forward-looking series for the trend chart
    today = datetime.now(timezone.utc).date()
    projection = []
    for h, val in [(0, current), (7, p7), (30, p30), (90, p90)]:
        projection.append({"date": (today + timedelta(days=h)).isoformat(), "forecast": val})
    return {
        "current": current,
        "p7": p7, "p30": p30, "p90": p90,
        "recent_incoming_avg": recent_avg,
        "velocity": round(velocity, 1),
        "confidence": confidence,
        "projection": projection,
    }

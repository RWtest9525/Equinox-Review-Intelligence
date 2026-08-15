"""Live Google Play review ingestion (public data, no API key).

Read-only: fetches real reviews & ratings via the maintained google-play-scraper
library (wraps Play's internal endpoints). Publishing replies still requires the
official Google Play Developer API and is NOT done here.
"""
import re
import time
from datetime import datetime, timezone, date
from google_play_scraper import search as gp_search, reviews as gp_reviews, app as gp_app, Sort


def _reviews_with_retry(package_id, lang, country, count, token, attempts=3):
    last = None
    for i in range(attempts):
        try:
            return gp_reviews(package_id, lang=lang, country=country, sort=Sort.NEWEST,
                              count=count, continuation_token=token)
        except Exception as e:
            last = e
            time.sleep(0.6 * (i + 1))
    raise last

TOPIC_KEYWORDS = {
    "Payments": ["payment", "pay", "transaction", "money", "deducted", "refund", "wallet", "upi", "debit", "credit"],
    "Login": ["login", "log in", "sign in", "signin", "otp", "password", "logout"],
    "KYC": ["kyc", "aadhaar", "aadhar", "pan", "document verification"],
    "Customer Support": ["support", "customer care", "help", "service", "response", "contact", "no one help"],
    "Performance": ["slow", "lag", "loading", "hang", "freeze", "speed", "performance"],
    "Bugs": ["bug", "crash", "error", "not working", "glitch", "issue", "problem"],
    "UI/UX": ["ui", "ux", "design", "interface", "layout", "confusing", "easy to use"],
    "Notifications": ["notification", "alert", "reminder", "push"],
    "Pricing": ["price", "expensive", "cost", "charge", "fee", "subscription"],
    "Offers": ["offer", "deal", "discount", "promo", "coupon"],
    "Cashback": ["cashback", "reward", "points"],
    "Account": ["account", "profile", "settings", "delete account"],
    "Security": ["security", "hack", "fraud", "scam", "safe", "privacy"],
    "Verification": ["verify", "verification", "authenticate"],
    "Features": ["feature", "option", "update", "add", "missing"],
}


def classify_sentiment(score: int) -> str:
    if score >= 4:
        return "positive"
    if score == 3:
        return "neutral"
    return "negative"


def classify_topic(text: str) -> str:
    t = (text or "").lower()
    for topic, kws in TOPIC_KEYWORDS.items():
        if any(kw in t for kw in kws):
            return topic
    return "General"


def parse_package_id(query: str):
    """Extract a package id from a Play URL or return the string if it looks like a package."""
    if not query:
        return None
    q = query.strip()
    m = re.search(r"[?&]id=([a-zA-Z0-9._]+)", q)
    if m:
        return m.group(1)
    # bare package: contains dots, no spaces, no slashes
    if "." in q and " " not in q and "/" not in q:
        return q
    return None


def resolve_apps(query: str, country: str = "us", lang: str = "en"):
    """Return candidate apps for a URL, package id, or free-text name."""
    pkg = parse_package_id(query)
    results = []
    if pkg:
        try:
            d = gp_app(pkg, lang=lang, country=country)
            results.append(_app_summary(d, pkg))
            return results
        except Exception:
            pass
    # free-text search
    hits = gp_search(query, n_hits=6, lang=lang, country=country)
    for h in hits:
        aid = h.get("appId")
        if not aid:
            continue
        results.append({
            "app_id": aid,
            "title": h.get("title"),
            "developer": h.get("developer"),
            "score": round(h.get("score") or 0, 2),
            "icon": h.get("icon"),
        })
    return results


def _app_summary(d: dict, pkg: str) -> dict:
    return {
        "app_id": pkg,
        "title": d.get("title"),
        "developer": d.get("developer"),
        "score": round(d.get("score") or 0, 2),
        "ratings": d.get("ratings"),
        "reviews": d.get("reviews"),
        "icon": d.get("icon"),
        "genre": d.get("genre"),
    }


def get_app_details(package_id: str, country: str = "us", lang: str = "en") -> dict:
    d = gp_app(package_id, lang=lang, country=country)
    return _app_summary(d, package_id)


def fetch_reviews(package_id: str, since_date: str = None, max_count: int = 200,
                  country: str = "us", lang: str = "en"):
    """Fetch recent reviews (newest first). Stops early once older than since_date.
    Returns list of normalized review dicts. Blocking — run in a thread."""
    cutoff = None
    if since_date:
        try:
            cutoff = datetime.fromisoformat(since_date).date()
        except Exception:
            cutoff = None

    collected = []
    token = None
    max_count = min(max_count or 200, 600)
    while len(collected) < max_count:
        batch, token = _reviews_with_retry(
            package_id, lang, country, min(200, max_count - len(collected)), token
        )
        if not batch:
            break
        stop = False
        for r in batch:
            at = r.get("at")
            if isinstance(at, datetime):
                at_utc = at.replace(tzinfo=timezone.utc) if at.tzinfo is None else at
            else:
                at_utc = datetime.now(timezone.utc)
            if cutoff and at_utc.date() < cutoff:
                stop = True
                break
            score = int(r.get("score") or 0)
            text = r.get("content") or ""
            reply = r.get("replyContent")
            replied_at = r.get("repliedAt")
            collected.append({
                "external_id": r.get("reviewId"),
                "rating": score,
                "text": text,
                "reviewer_name": r.get("userName") or "Anonymous",
                "country": country.upper(),
                "app_version": r.get("reviewCreatedVersion") or "—",
                "language": lang,
                "sentiment": classify_sentiment(score),
                "topic": classify_topic(text),
                "reply_status": "published" if reply else "unreplied",
                "reply_source": "manual" if reply else None,
                "published_reply": reply,
                "reply_at": replied_at.replace(tzinfo=timezone.utc).isoformat() if isinstance(replied_at, datetime) else None,
                "priority": "high" if score <= 2 else "normal",
                "created_at": at_utc.isoformat(),
            })
        if stop or not token:
            break
    return collected

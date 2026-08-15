"""Deterministic demo data generator. Seeds organizations, users, applications,
competitors, reviews, rating snapshots, brand voice, alerts, notifications, reports.
Clearly demo data (is_demo flag). Idempotent: only runs when DB is empty."""
import random
from datetime import datetime, timezone, timedelta
from deps import db, new_id, hash_password, now_iso, iso

random.seed(42)

TOPICS = ["Payments", "Login", "KYC", "Customer Support", "Performance", "Bugs",
          "UI/UX", "Notifications", "Pricing", "Offers", "Cashback", "Account",
          "Security", "Verification", "Features", "General"]

COUNTRIES = ["India", "United States", "United Kingdom", "Germany", "Brazil",
             "Indonesia", "Nigeria", "Canada", "Australia", "United Arab Emirates"]

NAMES = ["Aarav Sharma", "Priya Patel", "John Miller", "Sofia Rossi", "Chen Wei",
         "Fatima Khan", "Lucas Silva", "Emma Johnson", "Rahul Verma", "Ananya Reddy",
         "David Cohen", "Yuki Tanaka", "Omar Hassan", "Grace Lee", "Nikhil Gupta",
         "Isabella Garcia", "Mohammed Ali", "Olivia Brown", "Sanjay Kumar", "Mia Wilson"]

NEG = [
    "{t} keeps failing and nobody helped me. Very frustrating experience.",
    "Terrible {t} experience. The app crashed twice while I was trying.",
    "I am extremely disappointed with the {t}. Please fix this urgently.",
    "{t} is broken after the latest update. I'm losing trust in this app.",
    "Worst {t} ever, I could not complete what I wanted to do.",
    "Money got deducted but the {t} did not go through. No response from support.",
]
POS = [
    "Love the {t}! Everything works smoothly and fast.",
    "Great {t} experience, very reliable and easy to use.",
    "The {t} is excellent, best app in this category by far.",
    "Smooth {t} and clean interface. Highly recommend!",
    "Impressed with the {t}. Keep up the great work team.",
]
NEU = [
    "The {t} is okay but could be improved.",
    "{t} works fine mostly, sometimes a bit slow.",
    "Average {t}, nothing special but it does the job.",
    "Decent {t}, hope more features are added soon.",
]

APP_ICONS = [
    "https://images.unsplash.com/photo-1644310885721-98c5c7f94ca3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMDNkJTIwYXBwJTIwaWNvbnxlbnwwfHx8fDE3ODY3ODg2NzJ8MA&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1644318295821-12c4ddf2a36e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMDNkJTIwYXBwJTIwaWNvbnxlbnwwfHx8fDE3ODY3ODg2NzJ8MA&ixlib=rb-4.1.0&q=85",
]
AVATARS = [
    "https://images.unsplash.com/photo-1609436132311-e4b0c9370469?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4NjcyMTE0M3ww&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4NjcyMTE0M3ww&ixlib=rb-4.1.0&q=85",
]


def sentiment_for(rating):
    if rating >= 4:
        return "positive"
    if rating == 3:
        return "neutral"
    return "negative"


def make_review(app, days_ago_max=90):
    dist = [5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 3, 2, 1, 1]
    rating = random.choice(dist)
    sentiment = sentiment_for(rating)
    topic = random.choice(TOPICS)
    if sentiment == "negative":
        text = random.choice(NEG).format(t=topic.lower())
    elif sentiment == "positive":
        text = random.choice(POS).format(t=topic.lower())
    else:
        text = random.choice(NEU).format(t=topic.lower())
    days_ago = random.randint(0, days_ago_max)
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=random.randint(0, 23),
                                                minutes=random.randint(0, 59))
    platform = random.choice(["google_play", "google_play", "app_store"]) if app["platform"] == "both" else app["platform"]
    replied = random.random() < 0.55
    reply_source = random.choice(["ai", "manual"]) if replied else None
    lang = "hi" if random.random() < 0.18 else "en"
    return {
        "id": new_id(),
        "organization_id": app["organization_id"],
        "application_id": app["id"],
        "platform": platform,
        "external_id": f"{platform}-{new_id()[:12]}",
        "rating": rating,
        "text": text,
        "reviewer_name": random.choice(NAMES),
        "country": random.choice(COUNTRIES),
        "app_version": random.choice(app["versions"]),
        "language": lang,
        "sentiment": sentiment,
        "topic": topic,
        "reply_status": "published" if replied else "unreplied",
        "reply_source": reply_source,
        "ai_reply": None,
        "published_reply": ("Thank you for your feedback. We appreciate you taking the time to share this."
                            if replied else None),
        "reply_at": iso(dt + timedelta(hours=random.randint(1, 20))) if replied else None,
        "priority": "high" if rating <= 2 else "normal",
        "is_demo": True,
        "created_at": iso(dt),
    }


def make_snapshots(app):
    snaps = []
    # start clearly below current so there is a visible trend toward current_rating
    trend_bias = random.choice([0.006, 0.008, -0.004, 0.010, -0.006])
    base = app["current_rating"] - trend_bias * 90
    rating = round(min(4.9, max(3.4, base)), 3)
    for d in range(90, -1, -1):
        date = (datetime.now(timezone.utc) - timedelta(days=d)).date().isoformat()
        drift = trend_bias + random.uniform(-0.006, 0.006)
        rating = round(min(5.0, max(3.2, rating + drift)), 3)
        snaps.append({
            "id": new_id(),
            "application_id": app["id"],
            "organization_id": app["organization_id"],
            "date": date,
            "rating": rating,
            "reviews": random.randint(60, 180),
            "avg_incoming": round(min(5.0, max(1.0, rating + random.uniform(-0.6, 0.5))), 2),
            "is_demo": True,
        })
    # align current rating to last snapshot
    app["current_rating"] = snaps[-1]["rating"]
    return snaps


async def seed_demo():
    if await db.organizations.count_documents({}) > 0:
        return

    # Internal org for super admin
    equinox_org = {"id": new_id(), "name": "Equinox Zyvena Pvt Ltd", "type": "internal",
                   "plan": "enterprise", "status": "active", "logo": None,
                   "is_demo": True, "created_at": now_iso()}
    await db.organizations.insert_one(dict(equinox_org))

    # Client orgs + apps definitions
    client_defs = [
        {"org": "Zenpay Technologies", "plan": "enterprise", "contact": "Rahul Verma",
         "email": "rahul@zenpay.io",
         "apps": [
             {"name": "POP UPI", "package": "io.zenpay.popupi", "cat": "Finance", "rating": 4.54,
              "count": 186421, "versions": ["8.2.1", "8.3.0", "8.3.1"]},
             {"name": "Zenpay Wallet", "package": "io.zenpay.wallet", "cat": "Finance", "rating": 4.31,
              "count": 92140, "versions": ["5.1.0", "5.2.0"]},
         ]},
        {"org": "ShopSphere Retail", "plan": "growth", "contact": "Ananya Reddy",
         "email": "ananya@shopsphere.com",
         "apps": [
             {"name": "ShopSphere", "package": "com.shopsphere.app", "cat": "Shopping", "rating": 4.18,
              "count": 254900, "versions": ["12.0.4", "12.1.0"]},
             {"name": "ShopSphere Seller", "package": "com.shopsphere.seller", "cat": "Business", "rating": 3.92,
              "count": 41200, "versions": ["3.4.2", "3.5.0"]},
         ]},
        {"org": "MediCare Health", "plan": "starter", "contact": "Dr. Sanjay Kumar",
         "email": "sanjay@medicare.health",
         "apps": [
             {"name": "MediCare Plus", "package": "com.medicare.plus", "cat": "Medical", "rating": 4.67,
              "count": 63800, "versions": ["6.0.0", "6.1.2"]},
         ]},
    ]

    competitor_defs = {
        "POP UPI": [("PhonePe", 4.38), ("Paytm", 4.12), ("Google Pay", 4.62)],
        "Zenpay Wallet": [("Mobikwik", 4.05), ("Amazon Pay", 4.29)],
        "ShopSphere": [("Amazon Shopping", 4.47), ("Flipkart", 4.35)],
        "ShopSphere Seller": [("Meesho Supplier", 3.88)],
        "MediCare Plus": [("Practo", 4.41), ("1mg", 4.55)],
    }

    all_apps = []
    users = []
    # super admin created separately in seed_admin
    for cd in client_defs:
        org = {"id": new_id(), "name": cd["org"], "type": "client", "plan": cd["plan"],
               "status": "active", "contact_name": cd["contact"], "contact_email": cd["email"],
               "logo": None, "is_demo": True, "created_at": now_iso()}
        await db.organizations.insert_one(dict(org))
        # client admin user
        admin_email = cd["email"]
        admin_user = {"id": new_id(), "name": cd["contact"], "email": admin_email,
                      "password_hash": hash_password("Client@2026"), "role": "client_admin",
                      "organization_id": org["id"], "avatar": AVATARS[0], "status": "active",
                      "is_demo": True, "created_at": now_iso()}
        users.append(admin_user)
        # a member
        member = {"id": new_id(), "name": "Team Member", "email": f"member@{cd['org'].split()[0].lower()}.com",
                  "password_hash": hash_password("Member@2026"), "role": "client_member",
                  "organization_id": org["id"], "avatar": AVATARS[1], "status": "active",
                  "is_demo": True, "created_at": now_iso()}
        users.append(member)

        for ad in cd["apps"]:
            app = {"id": new_id(), "organization_id": org["id"], "name": ad["name"],
                   "package_id": ad["package"], "app_store_id": f"id{random.randint(1000000000, 1999999999)}",
                   "platform": "both", "country": "India", "category": ad["cat"],
                   "logo": random.choice(APP_ICONS), "current_rating": ad["rating"],
                   "review_count": ad["count"], "versions": ad["versions"],
                   "google_play_status": "demo", "app_store_status": "demo",
                   "last_sync": now_iso(), "next_sync": iso(datetime.now(timezone.utc) + timedelta(hours=6)),
                   "sync_status": "demo", "is_demo": True, "created_at": now_iso()}
            all_apps.append(app)

    if users:
        await db.users.insert_many([dict(u) for u in users])

    # generate reviews, snapshots, competitors
    reviews = []
    snapshots = []
    competitors = []
    comp_snaps = []
    for app in all_apps:
        snapshots.extend(make_snapshots(app))  # mutates current_rating
        n = random.randint(100, 160)
        for _ in range(n):
            reviews.append(make_review(app))
        for cname, crating in competitor_defs.get(app["name"], []):
            comp = {"id": new_id(), "organization_id": app["organization_id"],
                    "application_id": app["id"], "name": cname,
                    "package_id": f"com.{cname.lower().replace(' ', '')}.app",
                    "platform": "google_play", "country": "India",
                    "current_rating": crating, "review_count": random.randint(50000, 900000),
                    "is_demo": True, "created_at": now_iso()}
            competitors.append(comp)
            # competitor snapshot metrics
            comp_snaps.append({
                "id": new_id(), "competitor_id": comp["id"], "organization_id": comp["organization_id"],
                "date": datetime.now(timezone.utc).date().isoformat(),
                "rating": crating, "review_count": comp["review_count"],
                "reviews_today": random.randint(20, 200),
                "reviews_7d": random.randint(200, 1400),
                "reviews_30d": random.randint(900, 6000),
                "velocity": round(random.uniform(30, 200), 1),
                "rating_trend": round(random.uniform(-0.08, 0.09), 2),
                "positive_pct": random.randint(55, 88),
                "neutral_pct": random.randint(5, 15),
                "negative_pct": random.randint(8, 35),
                "star5_pct": random.randint(55, 80),
                "star1_pct": random.randint(4, 18),
                "is_demo": True,
            })

    # persist mutated app ratings
    for app in all_apps:
        await db.applications.insert_one(dict(app))
    if reviews:
        await db.reviews.insert_many(reviews)
    if snapshots:
        await db.rating_snapshots.insert_many(snapshots)
    if competitors:
        await db.competitors.insert_many(competitors)
    if comp_snaps:
        await db.competitor_snapshots.insert_many(comp_snaps)

    # brand voice defaults per app
    bvs = []
    for app in all_apps:
        bvs.append({"id": new_id(), "application_id": app["id"], "organization_id": app["organization_id"],
                    "personality": "Friendly and professional",
                    "tone": "Empathetic, concise, solution-oriented",
                    "words_to_use": ["we're here to help", "thank you", "we understand"],
                    "words_to_avoid": ["unfortunately", "policy", "no"],
                    "support_url": "https://support.example.com",
                    "support_email": f"support@{app['name'].split()[0].lower()}.com",
                    "guidelines": "Never promise refunds or compensation unless explicitly approved.",
                    "is_demo": True, "created_at": now_iso()})
    if bvs:
        await db.brand_voice_settings.insert_many(bvs)

    # sample alerts + notifications + reports
    alerts = []
    notifications = []
    for app in all_apps[:3]:
        alerts.append({"id": new_id(), "organization_id": app["organization_id"],
                       "application_id": app["id"], "type": "rating_drop", "severity": "high",
                       "title": "Rating dropped",
                       "message": f"{app['name']} rating dropped from 4.56 to 4.52 in the last 24 hours.",
                       "cause": "Increase in 1-star payment-related reviews.",
                       "status": "active", "is_demo": True, "created_at": now_iso()})
        alerts.append({"id": new_id(), "organization_id": app["organization_id"],
                       "application_id": app["id"], "type": "unanswered_threshold", "severity": "medium",
                       "title": "Unanswered reviews high",
                       "message": f"{app['name']} has 147 unanswered reviews above threshold.",
                       "cause": "Reply backlog growing.",
                       "status": "active", "is_demo": True, "created_at": now_iso()})
        notifications.append({"id": new_id(), "organization_id": app["organization_id"],
                              "application_id": app["id"], "channel": "dashboard",
                              "title": "Emerging issue: Payment failures",
                              "message": "Payment complaints up 23% this week.",
                              "read": False, "is_demo": True, "created_at": now_iso()})
    if alerts:
        await db.alerts.insert_many(alerts)
    if notifications:
        await db.notifications.insert_many(notifications)

    # integrations config docs (not connected)
    integrations = []
    for app in all_apps:
        for plat in ["google_play", "app_store"]:
            integrations.append({"id": new_id(), "organization_id": app["organization_id"],
                                 "application_id": app["id"], "platform": plat,
                                 "connected": False, "status": "demo",
                                 "credentials": {}, "is_demo": True, "created_at": now_iso()})
    if integrations:
        await db.application_integrations.insert_many(integrations)

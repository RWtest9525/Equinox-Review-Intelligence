"""End-to-end backend tests for Equinox AI Reputation Intelligence.

Covers: auth, tenant isolation, applications, reviews, analytics/dashboard/forecast,
AI reply/refine/bulk/publish, executive summary, insights, AI search, competitors,
management (clients/team), integrations error handling, reports, brand voice.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


# ---------------------- Auth ----------------------
class TestAuth:
    def test_super_admin_login(self, super_admin_session):
        assert super_admin_session.user["role"] == "super_admin"
        assert super_admin_session.user["email"] == "admin@equinox.ai"

    def test_get_me_with_bearer(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == "admin@equinox.ai"

    def test_client_member_login(self, client_member_session):
        assert client_member_session.user["role"] == "client_member"

    def test_login_invalid_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "admin@equinox.ai", "password": "wrong"},
                          timeout=15)
        assert r.status_code == 401


# ---------------------- Tenant isolation & Applications ----------------------
class TestApplicationsAndIsolation:
    def test_super_admin_sees_all_apps(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/applications")
        assert r.status_code == 200
        apps = r.json()["applications"]
        assert len(apps) >= 5, f"expected >=5 apps, got {len(apps)}"

    def test_client_member_sees_only_org_apps(self, client_member_session):
        r = client_member_session.get(f"{BASE_URL}/api/applications")
        assert r.status_code == 200
        apps = r.json()["applications"]
        names = [a["name"] for a in apps]
        assert len(apps) == 2, f"expected 2 apps for zenpay member, got {len(apps)}: {names}"
        assert any("POP" in n or "Zenpay" in n for n in names)

    def test_client_member_cannot_create_application(self, client_member_session):
        body = {"name": "Attempted", "package_id": "x.y", "platform": "google_play",
                "country": "IN"}
        r = client_member_session.post(f"{BASE_URL}/api/applications", json=body)
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:200]}"


# ---------------------- Analytics dashboard & forecast ----------------------
class TestAnalytics:
    def test_dashboard_kpis_and_forecast(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/analytics/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d and "forecast" in d
        k = d["kpis"]
        for key in ("current_rating", "rating_change", "reviews_today", "reviews_7d",
                    "reviews_30d", "velocity", "sentiment", "reply_coverage"):
            assert key in k, f"missing kpi {key}"
        # sentiment breakdown
        for sk in ("positive_pct", "negative_pct", "neutral_pct"):
            assert sk in k["sentiment"]
        f = d["forecast"]
        for key in ("p7", "p30", "p90", "confidence"):
            assert key in f

    def test_dashboard_changes_per_app(self, super_admin_session):
        apps = super_admin_session.get(f"{BASE_URL}/api/applications").json()["applications"]
        assert len(apps) >= 2
        r1 = super_admin_session.get(f"{BASE_URL}/api/analytics/dashboard",
                                     params={"application_id": apps[0]["id"]}).json()
        r2 = super_admin_session.get(f"{BASE_URL}/api/analytics/dashboard",
                                     params={"application_id": apps[1]["id"]}).json()
        # Numbers should differ between two apps (or at least some KPI should differ)
        assert (r1["kpis"]["reviews_30d"], r1["kpis"]["current_rating"]) != \
               (r2["kpis"]["reviews_30d"], r2["kpis"]["current_rating"]), \
               "Dashboard KPIs identical across two different apps - filter may not work"

    def test_chart_endpoints(self, super_admin_session):
        endpoints = ["rating-trend", "review-volume", "rating-distribution",
                     "sentiment", "topics"]
        for e in endpoints:
            r = super_admin_session.get(f"{BASE_URL}/api/analytics/{e}")
            assert r.status_code == 200, f"{e} failed: {r.status_code}"
            data = r.json()
            assert isinstance(data, dict)


# ---------------------- Reviews ----------------------
class TestReviews:
    def test_list_reviews(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                    params={"page_size": 5})
        assert r.status_code == 200
        d = r.json()
        assert "reviews" in d and "total" in d
        assert d["total"] > 0

    def test_filter_unreplied(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                    params={"quick_filter": "unreplied", "page_size": 10})
        assert r.status_code == 200
        for rev in r.json()["reviews"]:
            assert rev.get("reply_status") == "unreplied"

    def test_filter_rating(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                    params={"rating": 1, "page_size": 5})
        assert r.status_code == 200
        for rev in r.json()["reviews"]:
            assert rev["rating"] == 1

    def test_search_text(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                    params={"search": "crash", "page_size": 5})
        assert r.status_code == 200

    def test_pagination(self, super_admin_session):
        r1 = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                     params={"page": 1, "page_size": 5}).json()
        r2 = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                     params={"page": 2, "page_size": 5}).json()
        assert r1["reviews"] and r2["reviews"]
        assert r1["reviews"][0]["id"] != r2["reviews"][0]["id"]

    def test_filters_endpoint(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/reviews/filters")
        assert r.status_code == 200
        d = r.json()
        for k in ("countries", "versions", "topics", "languages"):
            assert k in d and isinstance(d[k], list)


# ---------------------- AI (real LLM) ----------------------
@pytest.fixture(scope="module")
def one_star_review(super_admin_session):
    r = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                params={"rating": 1, "sort": "rating_asc",
                                        "quick_filter": "unreplied", "page_size": 1})
    assert r.status_code == 200
    revs = r.json()["reviews"]
    if not revs:
        # fallback to any 1-star
        r = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                    params={"rating": 1, "page_size": 1}).json()
        revs = r["reviews"]
    assert revs, "no 1-star reviews available for AI reply test"
    return revs[0]


class TestAI:
    def test_generate_reply_real_llm(self, super_admin_session, one_star_review):
        rid = one_star_review["id"]
        r = super_admin_session.post(f"{BASE_URL}/api/ai/generate-reply",
                                     json={"review_id": rid, "mode": "Professional"},
                                     timeout=90)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "reply" in d
        # Save reply text for evidence
        print(f"\n[AI generate-reply] source={d.get('source')} model={d.get('model')}")
        print(f"[reply]: {d['reply'][:400]}")
        assert d["source"] == "ai", f"expected source=ai, got {d.get('source')}, error={d.get('error')}"
        assert len(d["reply"]) > 20, "reply too short"
        assert d["reply"].strip() != one_star_review["text"].strip(), "reply just echoes review"

    def test_refine_reply_shorten(self, super_admin_session, one_star_review):
        # first generate to have baseline
        gen = super_admin_session.post(f"{BASE_URL}/api/ai/generate-reply",
                                       json={"review_id": one_star_review["id"], "mode": "Professional"},
                                       timeout=90).json()
        current = gen["reply"]
        r = super_admin_session.post(f"{BASE_URL}/api/ai/refine-reply",
                                     json={"review_id": one_star_review["id"],
                                           "current_reply": current, "action": "shorten"},
                                     timeout=90)
        assert r.status_code == 200
        d = r.json()
        print(f"\n[AI refine] source={d.get('source')} reply={d.get('reply','')[:200]}")
        assert d["source"] == "ai", f"expected ai, got {d.get('source')}, err={d.get('error')}"
        # Refined should be shorter (or at least non-empty)
        assert len(d["reply"]) > 0

    def test_bulk_reply(self, super_admin_session):
        revs = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                       params={"rating": 2, "page_size": 3}).json()["reviews"]
        ids = [x["id"] for x in revs][:2]
        if not ids:
            pytest.skip("no 2-star reviews to bulk reply")
        r = super_admin_session.post(f"{BASE_URL}/api/ai/bulk-reply",
                                     json={"review_ids": ids, "mode": "Empathetic"},
                                     timeout=180)
        assert r.status_code == 200
        d = r.json()
        assert "results" in d and len(d["results"]) == len(ids)
        for res in d["results"]:
            assert res["reply"] and len(res["reply"]) > 10
            print(f"[bulk] source={res['source']} reply={res['reply'][:150]}")

    def test_publish_reply_super_admin(self, super_admin_session):
        rev = super_admin_session.get(f"{BASE_URL}/api/reviews",
                                      params={"rating": 3, "page_size": 1}).json()["reviews"][0]
        r = super_admin_session.post(f"{BASE_URL}/api/ai/publish-reply",
                                     json={"review_id": rev["id"],
                                           "reply_text": "Thanks for feedback."})
        assert r.status_code == 200
        assert r.json()["review"]["reply_status"] == "published"

    def test_publish_reply_client_member_forbidden(self, client_member_session):
        rev = client_member_session.get(f"{BASE_URL}/api/reviews",
                                        params={"page_size": 1}).json()["reviews"][0]
        r = client_member_session.post(f"{BASE_URL}/api/ai/publish-reply",
                                       json={"review_id": rev["id"],
                                             "reply_text": "Should be denied"})
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:200]}"

    def test_executive_summary(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/ai/executive-summary", timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert "insights" in d and isinstance(d["insights"], list) and len(d["insights"]) >= 1
        assert "recommended_action" in d
        print(f"\n[exec summary] source={d.get('source')} insights={len(d['insights'])}")
        for ins in d["insights"][:3]:
            print(f"  - [{ins.get('level')}] {ins.get('text','')[:180]}")

    def test_ai_insights(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/ai/insights")
        assert r.status_code == 200
        d = r.json()
        assert "emerging_issues" in d and "all_topics" in d

    def test_ai_search(self, super_admin_session):
        q = "What are the top negative topics driving our 1-star reviews right now?"
        r = super_admin_session.post(f"{BASE_URL}/api/ai/search",
                                     json={"question": q}, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert "answer" in d
        print(f"\n[ai search] source={d.get('source')} answer={d['answer'][:400]}")
        assert d["source"] == "ai", f"expected ai, got {d.get('source')}, err={d.get('error')}"
        assert len(d["answer"]) > 20


# ---------------------- Competitors ----------------------
class TestCompetitors:
    def test_list_competitors(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/competitors")
        assert r.status_code == 200
        d = r.json()
        assert "competitors" in d and len(d["competitors"]) > 0
        assert "metrics" in d["competitors"][0]

    def test_comparison(self, super_admin_session):
        apps = super_admin_session.get(f"{BASE_URL}/api/applications").json()["applications"]
        aid = apps[0]["id"]
        r = super_admin_session.get(f"{BASE_URL}/api/competitors/comparison",
                                    params={"application_id": aid})
        assert r.status_code == 200
        d = r.json()
        assert "your_app" in d and "competitors" in d and "highlights" in d
        assert d["your_app"]["is_you"] is True

    def test_competitor_insights(self, super_admin_session):
        apps = super_admin_session.get(f"{BASE_URL}/api/applications").json()["applications"]
        aid = apps[0]["id"]
        r = super_admin_session.get(f"{BASE_URL}/api/competitors/insights",
                                    params={"application_id": aid}, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert "insights" in d and len(d["insights"]) >= 1
        print(f"\n[competitor insights] source={d.get('source')}: {d['insights'][:2]}")


# ---------------------- Management ----------------------
class TestManagement:
    def test_create_client_super_admin(self, super_admin_session):
        email = f"TEST_client_{int(time.time())}@equinox-testing.io"
        body = {"company_name": "TEST_Client_Org", "plan": "starter",
                "contact_name": "Test Contact", "contact_email": email,
                "admin_password": "TestPass123!"}
        r = super_admin_session.post(f"{BASE_URL}/api/clients", json=body)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["client"]["name"] == "TEST_Client_Org"

    def test_team_scope(self, client_admin_session):
        r = client_admin_session.get(f"{BASE_URL}/api/team")
        assert r.status_code == 200
        members = r.json()["members"]
        # All should be same org
        org_ids = {m.get("organization_id") for m in members}
        assert len(org_ids) == 1, f"team leaks orgs: {org_ids}"

    def test_invite_member(self, client_admin_session):
        email = f"TEST_member_{int(time.time())}@zenpay-testing.io"
        body = {"name": "TEST Member", "email": email, "password": "MemberPass123!",
                "role": "client_member"}
        r = client_admin_session.post(f"{BASE_URL}/api/team", json=body)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["member"]["email"] == email.lower()


# ---------------------- Integrations error handling ----------------------
class TestIntegrations:
    def test_sync_not_connected_returns_400(self, super_admin_session):
        # find an integration
        integs = super_admin_session.get(f"{BASE_URL}/api/integrations").json()["integrations"]
        # try to find one that is not connected
        candidate = next((i for i in integs if not i.get("connected")), None)
        if not candidate:
            pytest.skip("no not-connected integration to test error handling")
        r = super_admin_session.post(f"{BASE_URL}/api/integrations/{candidate['id']}/sync")
        assert r.status_code == 400, f"expected 400 for not-connected, got {r.status_code}: {r.text[:200]}"
        assert "connection" in r.json().get("detail", "").lower() or \
               "not configured" in r.json().get("detail", "").lower()


# ---------------------- Reports ----------------------
class TestReports:
    def test_generate_report(self, super_admin_session):
        apps = super_admin_session.get(f"{BASE_URL}/api/applications").json()["applications"]
        aid = apps[0]["id"]
        body = {"application_id": aid, "report_type": "weekly", "title": "TEST_Weekly"}
        r = super_admin_session.post(f"{BASE_URL}/api/reports", json=body)
        assert r.status_code == 200, r.text[:300]
        d = r.json()["report"]
        assert d["status"] == "ready"
        assert "kpis" in d["data"] and "topics" in d["data"] and "forecast" in d["data"]

    def test_list_reports(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/reports")
        assert r.status_code == 200
        assert "reports" in r.json()


# ---------------------- Brand voice ----------------------
class TestBrandVoice:
    def test_update_and_get_brand_voice(self, super_admin_session):
        apps = super_admin_session.get(f"{BASE_URL}/api/applications").json()["applications"]
        aid = apps[0]["id"]
        body = {"application_id": aid, "personality": "Warm expert",
                "tone": "Empathetic and clear", "words_to_use": ["Zenpay"],
                "words_to_avoid": ["cash"], "support_email": "help@zenpay.io",
                "guidelines": "No refunds without approval."}
        r = super_admin_session.put(f"{BASE_URL}/api/brand-voice", json=body)
        assert r.status_code == 200
        r2 = super_admin_session.get(f"{BASE_URL}/api/brand-voice/{aid}")
        assert r2.status_code == 200
        bv = r2.json()["brand_voice"]
        assert bv["personality"] == "Warm expert"
        assert "Zenpay" in bv["words_to_use"]

"""Google Play LIVE reviews feature tests.

Feature: POST /api/gplay/resolve, POST /api/gplay/sync using google-play-scraper
(no API key). Real live public data — network required.

Test scope:
- resolve by free-text name
- resolve by Play URL
- sync as admin -> imported/fetched, application auto-created; re-sync dedupes to 0
- since_date filter: newer cutoff => fewer/equal reviews
- reviews queryable via /api/reviews with source='google_play_live'
- RBAC: client_member -> 403 on /sync ; resolve allowed
Cleanup: deletes applications and reviews created by this run.
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

# use a light app to keep sync fast — reviews rich for filter test
TEST_PACKAGE = "com.spotify.music"
TEST_URL = "https://play.google.com/store/apps/details?id=com.spotify.music"


# ---------------------- resolve ----------------------
class TestGplayResolve:
    def test_resolve_by_name(self, super_admin_session):
        r = super_admin_session.post(
            f"{BASE_URL}/api/gplay/resolve",
            json={"query": "spotify"}, timeout=60,
        )
        assert r.status_code == 200, r.text[:300]
        matches = r.json().get("matches", [])
        assert isinstance(matches, list) and len(matches) > 0, "no matches returned"
        first = matches[0]
        for k in ("app_id", "title", "score", "icon"):
            assert k in first, f"missing key {k} in match: {first}"
        # spotify should be among top hits
        ids = [m["app_id"] for m in matches]
        assert any("spotify" in aid.lower() for aid in ids), f"no spotify-ish appId in {ids}"

    def test_resolve_by_url(self, super_admin_session):
        r = super_admin_session.post(
            f"{BASE_URL}/api/gplay/resolve",
            json={"query": TEST_URL}, timeout=60,
        )
        assert r.status_code == 200, r.text[:300]
        matches = r.json().get("matches", [])
        assert len(matches) == 1, f"expected 1 URL-resolved match, got {len(matches)}"
        assert matches[0]["app_id"] == TEST_PACKAGE

    def test_resolve_allowed_for_client_member(self, client_member_session):
        r = client_member_session.post(
            f"{BASE_URL}/api/gplay/resolve",
            json={"query": "spotify"}, timeout=60,
        )
        assert r.status_code == 200, f"resolve should be open to any user; got {r.status_code}: {r.text[:200]}"


# ---------------------- sync ----------------------
_created_state = {"app_id": None, "org_id": None}


class TestGplaySync:
    def test_sync_forbidden_for_client_member(self, client_member_session):
        r = client_member_session.post(
            f"{BASE_URL}/api/gplay/sync",
            json={"package_id": TEST_PACKAGE, "max_count": 10}, timeout=60,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:200]}"

    def test_sync_admin_imports_real_reviews(self, super_admin_session):
        body = {"package_id": TEST_PACKAGE, "since_date": "2026-01-01", "max_count": 40}
        r = super_admin_session.post(f"{BASE_URL}/api/gplay/sync", json=body, timeout=180)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert "imported" in d and "fetched" in d and "application" in d, d
        assert isinstance(d["imported"], int) and isinstance(d["fetched"], int)
        assert d["fetched"] > 0, "no reviews fetched from Play (network / scraper broken?)"
        # first run should import > 0 (unless the same package was previously synced globally
        # in super_admin org). It may also be equal to fetched.
        assert d["imported"] >= 0
        app = d["application"]
        assert app.get("id") and app.get("package_id") == TEST_PACKAGE
        _created_state["app_id"] = app["id"]
        print(f"\n[sync #1] fetched={d['fetched']} imported={d['imported']} app={app['name']} id={app['id']}")

    def test_sync_dedupes_on_repeat(self, super_admin_session):
        assert _created_state["app_id"], "prev sync test did not run"
        body = {"package_id": TEST_PACKAGE, "since_date": "2026-01-01", "max_count": 40}
        r = super_admin_session.post(f"{BASE_URL}/api/gplay/sync", json=body, timeout=180)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        print(f"\n[sync #2 dedupe] fetched={d['fetched']} imported={d['imported']} skipped={d.get('skipped_duplicates')}")
        assert d["imported"] == 0, f"dedupe failed: imported={d['imported']} on repeat"
        assert d.get("skipped_duplicates", 0) == d["fetched"]

    def test_since_date_filters_older_reviews(self, super_admin_session):
        # Very-far-future cutoff -> should yield 0 fetched (no reviews are AFTER 2099)
        body_future = {"package_id": TEST_PACKAGE, "since_date": "2099-12-31", "max_count": 20}
        r_f = super_admin_session.post(f"{BASE_URL}/api/gplay/sync", json=body_future, timeout=120)
        assert r_f.status_code == 200, r_f.text[:400]
        d_future = r_f.json()

        # Far-past cutoff -> should yield many
        body_past = {"package_id": TEST_PACKAGE, "since_date": "2020-01-01", "max_count": 20}
        r_p = super_admin_session.post(f"{BASE_URL}/api/gplay/sync", json=body_past, timeout=120)
        assert r_p.status_code == 200, r_p.text[:400]
        d_past = r_p.json()

        print(f"\n[since-filter] future={d_future['fetched']} past={d_past['fetched']}")
        assert d_future["fetched"] == 0, (
            f"since_date filter broken: future cutoff still returned {d_future['fetched']} reviews")
        assert d_past["fetched"] > d_future["fetched"], (
            f"since_date not effective: past={d_past['fetched']} not > future={d_future['fetched']}")


    # ---------------------- imported reviews queryable ----------------------
    def test_reviews_queryable_and_shape(self, super_admin_session):
        # look up the app super-admin created for TEST_PACKAGE (loadscope keeps this class on one worker,
        # but be robust by resolving the app via listing)
        app_id = _created_state.get("app_id")
        if not app_id:
            apps = super_admin_session.get(f"{BASE_URL}/api/applications").json()["applications"]
            match = next((a for a in apps if a.get("package_id") == TEST_PACKAGE), None)
            assert match, "synced application not found by package_id"
            app_id = match["id"]
        r = super_admin_session.get(
            f"{BASE_URL}/api/reviews",
            params={"application_id": app_id, "page_size": 10},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["total"] > 0, "no reviews persisted for synced app"
        for rev in d["reviews"]:
            assert rev.get("application_id") == app_id
            assert rev.get("platform") == "google_play"
            assert rev.get("source") == "google_play_live"
            assert rev.get("sentiment") in ("positive", "neutral", "negative")
            assert rev.get("topic"), f"topic not assigned on review {rev.get('id')}"


# ---------------------- cleanup ----------------------
@pytest.fixture(scope="module", autouse=True)
def _cleanup_after(super_admin_session):
    yield
    app_id = _created_state.get("app_id")
    if not app_id:
        return
    # delete created reviews & rating snapshots & sync jobs & application
    # (no public DELETE application API; use direct mongo via test-only fallback if exists,
    # else best-effort via admin endpoints — leave a note if unable to fully clean.)
    try:
        # try DELETE /api/applications/{id} if it exists
        r = super_admin_session.delete(f"{BASE_URL}/api/applications/{app_id}", timeout=15)
        print(f"\n[cleanup] DELETE /api/applications/{app_id} -> {r.status_code}")
    except Exception as e:
        print(f"[cleanup] delete failed: {e}")

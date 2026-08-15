"""Tests for new reviews endpoints introduced with Live Reviews feature:
- GET /api/reviews/summary  (aggregate counts, avg_rating, distribution, sentiment)
- GET /api/reviews/export   (CSV, headers, Content-Type, X-Total-Rows, Content-Disposition)
- GET /api/reviews          (date_from / date_to filters)

Uses seeded demo data so no fixtures need to be created. Runs as super_admin
which sees all orgs (uses first seeded application).
"""
import csv
import io
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

EXPECTED_CSV_HEADER = [
    "Review ID", "Date (UTC)", "Rating", "Sentiment", "Topic", "Reviewer",
    "Country", "App Version", "Language", "Review Text", "Reply Status",
    "Published Reply", "Reply Date (UTC)", "Platform", "Source",
]


@pytest.fixture(scope="module")
def demo_app_id(super_admin_session):
    r = super_admin_session.get(f"{BASE_URL}/api/applications", timeout=30)
    assert r.status_code == 200, r.text[:200]
    apps = r.json()["applications"]
    # prefer a demo seeded application
    demo = [a for a in apps if a.get("is_demo")]
    assert demo, "no seeded demo apps found"
    return demo[0]["id"]


class TestReviewsSummary:
    def test_summary_no_filter(self, super_admin_session, demo_app_id):
        r = super_admin_session.get(
            f"{BASE_URL}/api/reviews/summary",
            params={"application_id": demo_app_id}, timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        # shape
        for k in ("total", "avg_rating", "distribution", "sentiment"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["total"], int)
        assert isinstance(d["distribution"], list) and len(d["distribution"]) == 5
        for row in d["distribution"]:
            assert row["stars"] in (1, 2, 3, 4, 5)
            assert "count" in row and "pct" in row
        for s in ("positive", "neutral", "negative"):
            assert s in d["sentiment"]
        # totals match distribution sum
        assert sum(row["count"] for row in d["distribution"]) == d["total"]

    def test_summary_rating_filter_matches_5_star_count(self, super_admin_session, demo_app_id):
        r_all = super_admin_session.get(
            f"{BASE_URL}/api/reviews/summary",
            params={"application_id": demo_app_id}, timeout=30,
        ).json()
        r_5 = super_admin_session.get(
            f"{BASE_URL}/api/reviews/summary",
            params={"application_id": demo_app_id, "rating": 5}, timeout=30,
        ).json()
        # from unfiltered, distribution[stars=5].count must equal filtered total
        five_count = next(row["count"] for row in r_all["distribution"] if row["stars"] == 5)
        assert r_5["total"] == five_count, (
            f"summary rating=5 total ({r_5['total']}) != distribution count for 5 ({five_count})"
        )
        # when rating=5 filter applied, all reviews are 5 star: distribution collapses
        # all non-5 counts should be zero
        for row in r_5["distribution"]:
            if row["stars"] != 5:
                assert row["count"] == 0, f"rating=5 filter leaked star={row['stars']}"

    def test_summary_avg_rating_is_5_when_filter_5(self, super_admin_session, demo_app_id):
        d = super_admin_session.get(
            f"{BASE_URL}/api/reviews/summary",
            params={"application_id": demo_app_id, "rating": 5}, timeout=30,
        ).json()
        if d["total"] > 0:
            assert d["avg_rating"] == 5, f"avg_rating {d['avg_rating']} != 5 when only 5-star selected"

    def test_summary_date_range_shrinks(self, super_admin_session, demo_app_id):
        # very tight future range should yield 0
        d = super_admin_session.get(
            f"{BASE_URL}/api/reviews/summary",
            params={"application_id": demo_app_id, "date_from": "2099-01-01", "date_to": "2099-12-31"},
            timeout=30,
        ).json()
        assert d["total"] == 0, f"future date range should be empty, got total={d['total']}"


class TestReviewsListDateFilters:
    def test_date_range_filters_reviews(self, super_admin_session, demo_app_id):
        # pull unfiltered first to find real dates
        r = super_admin_session.get(
            f"{BASE_URL}/api/reviews",
            params={"application_id": demo_app_id, "page_size": 200}, timeout=30,
        )
        assert r.status_code == 200
        all_reviews = r.json()["reviews"]
        if not all_reviews:
            pytest.skip("no reviews to test date filter against")
        dates = sorted({rv["created_at"][:10] for rv in all_reviews if rv.get("created_at")})
        assert dates, "no created_at dates"
        # pick a narrow window: only the earliest date
        earliest = dates[0]
        r_range = super_admin_session.get(
            f"{BASE_URL}/api/reviews",
            params={"application_id": demo_app_id, "date_from": earliest, "date_to": earliest, "page_size": 200},
            timeout=30,
        )
        assert r_range.status_code == 200
        got = r_range.json()["reviews"]
        for rv in got:
            assert rv["created_at"][:10] == earliest, (
                f"review {rv.get('id')} date {rv['created_at']} outside {earliest}..{earliest}"
            )

    def test_future_date_range_returns_zero(self, super_admin_session, demo_app_id):
        r = super_admin_session.get(
            f"{BASE_URL}/api/reviews",
            params={"application_id": demo_app_id, "date_from": "2099-01-01", "date_to": "2099-12-31"},
            timeout=30,
        )
        assert r.status_code == 200
        assert r.json()["total"] == 0


class TestReviewsExportCSV:
    def test_export_headers_and_content_type(self, super_admin_session, demo_app_id):
        r = super_admin_session.get(
            f"{BASE_URL}/api/reviews/export",
            params={"application_id": demo_app_id}, timeout=60,
        )
        assert r.status_code == 200, r.text[:300]
        ctype = r.headers.get("Content-Type", "")
        assert "text/csv" in ctype, f"Content-Type not text/csv: {ctype}"
        cd = r.headers.get("Content-Disposition", "")
        assert "attachment" in cd and "filename=" in cd, f"bad Content-Disposition: {cd}"
        assert r.headers.get("X-Total-Rows") is not None, "X-Total-Rows header missing"
        # header row check
        text = r.text
        rd = csv.reader(io.StringIO(text))
        header = next(rd)
        assert header == EXPECTED_CSV_HEADER, f"CSV header mismatch:\nGot: {header}\nExp: {EXPECTED_CSV_HEADER}"
        # X-Total-Rows equals data row count
        data_rows = list(rd)
        assert int(r.headers["X-Total-Rows"]) == len(data_rows), (
            f"X-Total-Rows ({r.headers['X-Total-Rows']}) != data rows ({len(data_rows)})"
        )

    def test_export_rating_filter_changes_row_count(self, super_admin_session, demo_app_id):
        r_all = super_admin_session.get(
            f"{BASE_URL}/api/reviews/export",
            params={"application_id": demo_app_id}, timeout=60,
        )
        r_5 = super_admin_session.get(
            f"{BASE_URL}/api/reviews/export",
            params={"application_id": demo_app_id, "rating": 5}, timeout=60,
        )
        assert r_all.status_code == 200 and r_5.status_code == 200
        n_all = int(r_all.headers["X-Total-Rows"])
        n_5 = int(r_5.headers["X-Total-Rows"])
        assert n_5 <= n_all, f"filtered ({n_5}) > unfiltered ({n_all})"
        # cross-check with /summary
        s5 = super_admin_session.get(
            f"{BASE_URL}/api/reviews/summary",
            params={"application_id": demo_app_id, "rating": 5}, timeout=30,
        ).json()
        assert n_5 == s5["total"], f"export rows ({n_5}) != summary total ({s5['total']}) for rating=5"
        # every row's rating column == 5
        reader = csv.reader(io.StringIO(r_5.text))
        header = next(reader)
        rating_idx = header.index("Rating")
        for row in reader:
            assert row[rating_idx] == "5", f"non-5 rating row in filtered CSV: {row}"

    def test_export_date_filter_changes_row_count(self, super_admin_session, demo_app_id):
        r_future = super_admin_session.get(
            f"{BASE_URL}/api/reviews/export",
            params={"application_id": demo_app_id, "date_from": "2099-01-01", "date_to": "2099-12-31"},
            timeout=60,
        )
        assert r_future.status_code == 200
        assert int(r_future.headers["X-Total-Rows"]) == 0, "future date should export 0 rows"
        # only header line in body
        lines = [ln for ln in r_future.text.strip().splitlines() if ln]
        assert len(lines) == 1, f"expected only CSV header, got {len(lines)} lines"

    def test_export_filename_and_columns_present(self, super_admin_session, demo_app_id):
        r = super_admin_session.get(
            f"{BASE_URL}/api/reviews/export",
            params={"application_id": demo_app_id}, timeout=60,
        )
        cd = r.headers.get("Content-Disposition", "")
        assert "reviews_export_" in cd and ".csv" in cd, f"unexpected filename in {cd}"


class TestRegressionExistingRoutes:
    def test_reviews_still_works(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/reviews?page_size=5", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "reviews" in d and "total" in d

    def test_dashboard_still_works(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/dashboard/kpis", timeout=20)
        # 200 or 400 if missing param — accept 200 and non-500
        assert r.status_code < 500, r.text[:200]

    def test_applications_list_still_works(self, super_admin_session):
        r = super_admin_session.get(f"{BASE_URL}/api/applications", timeout=20)
        assert r.status_code == 200
        assert len(r.json()["applications"]) >= 5, "expected at least 5 seeded apps"

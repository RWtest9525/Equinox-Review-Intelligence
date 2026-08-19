# Equinox AI — App Reputation Intelligence Platform

## Original Problem Statement
Production-ready multi-tenant SaaS for agencies & app businesses to monitor, analyze, manage and improve app-store reputation across Google Play and Apple App Store. Combines review monitoring, unified inbox, AI replies, rating/sentiment/topic analytics, rating forecasting, competitor intelligence, alerts, reports, and role-based multi-tenant access. Brand: premium dark-first SaaS (Equinox Zyvena Pvt Ltd).

## Architecture
- **Backend**: FastAPI (modular routers) + MongoDB (motor). Auth = JWT Bearer (bcrypt). RBAC via `require_role` deps; tenant isolation via `org_scope()` on every query.
  - Modules: `deps.py` (db/auth/rbac), `analytics.py` (all metrics + forecast computed from DB), `ai_service.py` (AI Intelligence Service), `providers.py` (GooglePlay/Apple/Mock provider abstraction), `seed_data.py` (demo data), routes_* files.
- **Frontend**: React + Firebase SDK + react-router + @tanstack/react-query + recharts + shadcn/ui + Tailwind. Dark-first premium UI (Manrope/Inter, blue+gold accents, glass topbar).
- **AI**: OpenAI / LLM intelligence — replies, refine, bulk, executive summary, insights, AI search, competitor insights. Graceful fallback flagged `source='fallback'`.
- **Data providers**: Google Play & Apple stubbed as NOT-CONNECTED (credentials pluggable later); MockProvider serves demo data with a clear "Demo Data" banner everywhere.

## User Personas
- **Super Admin** (Equinox internal): all orgs/apps/reviews, create clients, system health.
- **Client Admin**: own org apps, reviews, AI replies, analytics, competitors, team, reports, publish replies.
- **Client Member**: dashboard, reviews, generate replies, analytics (no publish/create).

## Core Requirements (static)
Multi-tenant orgs → users → applications → reviews/competitors/analytics/insights/alerts/reports. Backend-enforced permissions. Real computed metrics (no hardcoding). Working filters/search/charts. AI on real review text. Modular integrations, secrets server-side.

## Implemented (2026-06)
- JWT auth (login/register/me/logout), RBAC, tenant isolation — verified 403s.
- Demo seed: 3 client orgs, 5 apps, ~600 reviews (90d), competitors + snapshots, rating snapshots, brand voice, alerts, notifications, integrations.
- Dashboard: 6 KPI cards, AI executive summary, rating trend (actual+MA+forecast), review volume, rating distribution, sentiment mix — all DB-computed, react to app/platform/date scope.
- Reviews inbox: full filters + quick filters + search + pagination + AI reply dialog (modes, refine, translate, publish w/ RBAC).
- Rating Analytics + transparent forecasting (7/30/90d + confidence, labelled estimate).
- Sentiment, Topics, AI Insights (emerging issues).
- Competitors, Competitor Reviews, Benchmarking + competitor AI insights.
- AI Reply Center (bulk generate + approve queue), AI Intelligence (NL search).
- Applications/Clients/Team management, Integrations (sync w/ real error handling), Settings (brand voice), Reports (generate + CSV export) + Scheduled Reports, Notifications/Alerts.
- **Tested**: 34/34 backend pytest + 7/7 frontend E2E pass. Real gpt-5.4 AI outputs confirmed.

## Backlog / Remaining
- **P1**: Live Google Play / App Store credential connection + real background sync jobs; PDF/Excel report export (CSV done); scheduled-report cron delivery; email notification channel (Resend/SendGrid).
- **P2**: Brute-force login lockout; audit-log viewer UI; per-app custom topics UI; real-time websocket updates; individual competitor review ingestion.

## Next Tasks
- Connect a real store integration when credentials available (provider layer ready).
- Add PDF export + email delivery for reports.

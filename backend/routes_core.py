from fastapi import APIRouter, Depends, HTTPException
from deps import (db, new_id, hash_password, get_current_user, require_role, org_scope,
                  now_iso, log_audit, assert_app_access)
from models import (CreateClientRequest, CreateApplicationRequest, InviteMemberRequest,
                    BrandVoiceRequest, AlertConfigRequest, CreateReportRequest)
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api", tags=["core"])


# -------- Applications --------
@router.get("/applications")
async def list_applications(user: dict = Depends(get_current_user)):
    apps = await db.applications.find(org_scope(user), {"_id": 0}).to_list(500)
    return {"applications": apps}


@router.post("/applications")
async def create_application(body: CreateApplicationRequest,
                             user: dict = Depends(require_role("super_admin", "client_admin"))):
    org_id = body.organization_id if user["role"] == "super_admin" and body.organization_id else user["organization_id"]
    app = {
        "id": new_id(), "organization_id": org_id, "name": body.name,
        "package_id": body.package_id, "app_store_id": body.app_store_id,
        "platform": body.platform, "country": body.country, "category": body.category,
        "logo": body.logo, "current_rating": 0, "review_count": 0, "versions": ["1.0.0"],
        "google_play_status": "not_connected", "app_store_status": "not_connected",
        "last_sync": None, "next_sync": None, "sync_status": "not_connected",
        "is_demo": False, "created_at": now_iso(),
    }
    await db.applications.insert_one(dict(app))
    await log_audit(user, "application.created", "application", app["id"], {"name": body.name})
    return {"application": app}


@router.get("/applications/{app_id}")
async def get_application(app_id: str, user: dict = Depends(get_current_user)):
    app = await assert_app_access(user, app_id)
    bv = await db.brand_voice_settings.find_one({"application_id": app_id}, {"_id": 0})
    integrations = await db.application_integrations.find({"application_id": app_id}, {"_id": 0}).to_list(10)
    return {"application": app, "brand_voice": bv, "integrations": integrations}


@router.delete("/applications/{app_id}")
async def delete_application(app_id: str, user: dict = Depends(require_role("super_admin", "client_admin"))):
    app = await assert_app_access(user, app_id)
    await db.reviews.delete_many({"application_id": app_id})
    await db.rating_snapshots.delete_many({"application_id": app_id})
    await db.sync_jobs.delete_many({"application_id": app_id})
    await db.competitors.delete_many({"application_id": app_id})
    await db.brand_voice_settings.delete_many({"application_id": app_id})
    await db.application_integrations.delete_many({"application_id": app_id})
    await db.applications.delete_one({"id": app_id})
    await log_audit(user, "application.deleted", "application", app_id, {"name": app.get("name")})
    return {"ok": True, "deleted": app_id}


# -------- Clients / Organizations (super admin) --------
@router.get("/clients")
async def list_clients(user: dict = Depends(require_role("super_admin"))):
    orgs = await db.organizations.find({"type": "client"}, {"_id": 0}).to_list(500)
    for o in orgs:
        o["user_count"] = await db.users.count_documents({"organization_id": o["id"]})
        o["app_count"] = await db.applications.count_documents({"organization_id": o["id"]})
    return {"clients": orgs}


@router.post("/clients")
async def create_client(body: CreateClientRequest, user: dict = Depends(require_role("super_admin"))):
    if await db.users.find_one({"email": body.contact_email.lower()}):
        raise HTTPException(status_code=400, detail="Contact email already in use")
    org_id = new_id()
    await db.organizations.insert_one({
        "id": org_id, "name": body.company_name, "type": "client", "plan": body.plan,
        "status": "active", "contact_name": body.contact_name,
        "contact_email": body.contact_email.lower(), "logo": body.logo,
        "is_demo": False, "created_at": now_iso(),
    })
    admin = {"id": new_id(), "name": body.contact_name, "email": body.contact_email.lower(),
             "password_hash": hash_password(body.admin_password), "role": "client_admin",
             "organization_id": org_id, "avatar": None, "status": "active",
             "is_demo": False, "created_at": now_iso()}
    await db.users.insert_one(dict(admin))
    await log_audit(user, "client.created", "organization", org_id, {"name": body.company_name})
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    return {"client": org}


# -------- Team --------
@router.get("/team")
async def list_team(user: dict = Depends(get_current_user)):
    q = {} if user["role"] == "super_admin" else {"organization_id": user["organization_id"]}
    members = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"members": members}


@router.post("/team")
async def invite_member(body: InviteMemberRequest,
                        user: dict = Depends(require_role("super_admin", "client_admin"))):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already in use")
    role = body.role if body.role in ("client_admin", "client_member") else "client_member"
    member = {"id": new_id(), "name": body.name, "email": body.email.lower(),
              "password_hash": hash_password(body.password), "role": role,
              "organization_id": user["organization_id"], "avatar": None, "status": "active",
              "is_demo": False, "created_at": now_iso()}
    await db.users.insert_one(dict(member))
    await log_audit(user, "team.invited", "user", member["id"], {"email": body.email})
    m = dict(member)
    m.pop("password_hash")
    return {"member": m}


# -------- Brand voice --------
@router.get("/brand-voice/{app_id}")
async def get_brand_voice(app_id: str, user: dict = Depends(get_current_user)):
    await assert_app_access(user, app_id)
    bv = await db.brand_voice_settings.find_one({"application_id": app_id}, {"_id": 0})
    return {"brand_voice": bv}


@router.put("/brand-voice")
async def update_brand_voice(body: BrandVoiceRequest,
                             user: dict = Depends(require_role("super_admin", "client_admin"))):
    app = await assert_app_access(user, body.application_id)
    update = body.model_dump()
    update["organization_id"] = app["organization_id"]
    update["updated_at"] = now_iso()
    await db.brand_voice_settings.update_one(
        {"application_id": body.application_id},
        {"$set": update, "$setOnInsert": {"id": new_id(), "created_at": now_iso()}},
        upsert=True,
    )
    await log_audit(user, "settings.changed", "brand_voice", body.application_id)
    bv = await db.brand_voice_settings.find_one({"application_id": body.application_id}, {"_id": 0})
    return {"brand_voice": bv}


# -------- Integrations --------
@router.get("/integrations")
async def list_integrations(user: dict = Depends(get_current_user)):
    integ = await db.application_integrations.find(org_scope(user), {"_id": 0}).to_list(500)
    return {"integrations": integ}


@router.post("/integrations/{integration_id}/sync")
async def sync_now(integration_id: str, user: dict = Depends(require_role("super_admin", "client_admin"))):
    integ = await db.application_integrations.find_one({"id": integration_id}, {"_id": 0})
    if not integ:
        raise HTTPException(status_code=404, detail="Integration not found")
    if not integ.get("connected"):
        raise HTTPException(status_code=400,
                            detail=f"{integ['platform'].replace('_', ' ').title()} connection not configured. Add credentials to enable live sync.")
    job = {"id": new_id(), "organization_id": integ["organization_id"],
           "application_id": integ["application_id"], "platform": integ["platform"],
           "status": "queued", "records_imported": 0, "errors": [], "created_at": now_iso()}
    await db.sync_jobs.insert_one(dict(job))
    await log_audit(user, "sync.triggered", "integration", integration_id)
    return {"sync_job": job}


# -------- Alerts --------
@router.get("/alerts")
async def list_alerts(user: dict = Depends(get_current_user)):
    alerts = await db.alerts.find(org_scope(user), {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"alerts": alerts}


@router.post("/alerts/config")
async def config_alert(body: AlertConfigRequest,
                       user: dict = Depends(require_role("super_admin", "client_admin"))):
    await assert_app_access(user, body.application_id)
    doc = {"id": new_id(), "organization_id": user["organization_id"],
           "application_id": body.application_id, "alert_type": body.alert_type,
           "threshold": body.threshold, "frequency": body.frequency,
           "enabled": body.enabled, "created_at": now_iso()}
    await db.alert_configs.insert_one(dict(doc))
    await log_audit(user, "alert.configured", "alert_config", doc["id"])
    return {"config": doc}


@router.post("/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, user: dict = Depends(get_current_user)):
    await db.alerts.update_one({"id": alert_id, **org_scope(user)}, {"$set": {"status": "dismissed"}})
    return {"ok": True}


# -------- Notifications --------
@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    notes = await db.notifications.find(org_scope(user), {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"notifications": notes}


@router.post("/notifications/{note_id}/read")
async def read_notification(note_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": note_id, **org_scope(user)}, {"$set": {"read": True}})
    return {"ok": True}


# -------- Reports --------
@router.get("/reports")
async def list_reports(user: dict = Depends(get_current_user)):
    reports = await db.reports.find(org_scope(user), {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"reports": reports}


@router.post("/reports")
async def create_report(body: CreateReportRequest,
                        user: dict = Depends(require_role("super_admin", "client_admin"))):
    from analytics import dashboard_kpis, topic_breakdown, forecast_ratings
    app = await assert_app_access(user, body.application_id)
    kpis = await dashboard_kpis([app["id"]], None, 30 if body.report_type != "daily" else 1)
    topics = await topic_breakdown([app["id"]], None, 30)
    forecast = await forecast_ratings([app["id"]])
    report = {"id": new_id(), "organization_id": app["organization_id"],
              "application_id": app["id"],
              "title": body.title or f"{body.report_type.title()} Report - {app['name']}",
              "report_type": body.report_type, "status": "ready",
              "data": {"kpis": kpis, "topics": topics["topics"][:8], "forecast": forecast},
              "created_at": now_iso()}
    await db.reports.insert_one(dict(report))
    await log_audit(user, "report.generated", "report", report["id"])
    return {"report": report}


# -------- Audit logs --------
@router.get("/audit-logs")
async def list_audit(user: dict = Depends(require_role("super_admin", "client_admin"))):
    logs = await db.audit_logs.find(org_scope(user), {"_id": 0}).sort("created_at", -1).to_list(300)
    return {"logs": logs}


# -------- System health (super admin) --------
@router.get("/system/health")
async def system_health(user: dict = Depends(require_role("super_admin"))):
    return {
        "organizations": await db.organizations.count_documents({}),
        "users": await db.users.count_documents({}),
        "applications": await db.applications.count_documents({}),
        "reviews": await db.reviews.count_documents({}),
        "competitors": await db.competitors.count_documents({}),
        "active_alerts": await db.alerts.count_documents({"status": "active"}),
        "database": "healthy",
        "ai_provider": "openai/gpt-5.4 (Emergent Universal Key)",
    }

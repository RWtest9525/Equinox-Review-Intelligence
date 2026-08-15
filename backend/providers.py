"""Data provider abstraction layer.

Real Google Play / Apple App Store providers are stubbed with clear NOT-CONNECTED
status so credentials can be plugged in later WITHOUT rebuilding the app.
The MockProvider serves realistic demo data and is the only active provider until
real store credentials are configured.
"""
from abc import ABC, abstractmethod


class ReviewDataProvider(ABC):
    name = "base"
    is_live = False

    @abstractmethod
    async def fetch_reviews(self, application: dict, since: str = None):
        ...

    @abstractmethod
    async def connection_status(self, application: dict) -> dict:
        ...


class GooglePlayProvider(ReviewDataProvider):
    """Official Google Play Developer API provider (credential-based, review replies).

    Requires a service-account JSON with the Play Developer Reporting/Reviews scope.
    When credentials are absent we fall back to the public live provider for reads.
    """
    name = "google_play"
    is_live = False

    def __init__(self, credentials: dict = None):
        self.credentials = credentials or {}

    async def fetch_reviews(self, application: dict, since: str = None):
        raise NotConnectedError(
            "Google Play Developer API credentials not configured. Public live reads are "
            "available via the Live Reviews sync; add a service account to enable reply publishing."
        )

    async def connection_status(self, application: dict) -> dict:
        connected = bool(self.credentials.get("service_account_json"))
        return {
            "provider": "google_play",
            "connected": connected,
            "live": connected,
            "message": None if connected else "Not connected. Add Google Play service-account credentials.",
        }


class GooglePlayLiveProvider(ReviewDataProvider):
    """Public Google Play live reads (no API key). Read-only — used by Live Reviews sync.

    Normalizes to the same review shape the official API path uses, so switching to
    the credential-based provider requires no changes to the sync/dedupe pipeline.
    """
    name = "google_play_live"
    is_live = True

    async def fetch_reviews(self, application: dict, since: str = None, max_count: int = 200, country: str = "us"):
        import gplay
        pkg = application.get("package_id")
        if not pkg:
            raise NotConnectedError("Application has no Google Play package id.")
        return gplay.fetch_reviews(pkg, since_date=since, max_count=max_count, country=country)

    async def connection_status(self, application: dict) -> dict:
        return {
            "provider": "google_play_live",
            "connected": True,
            "live": True,
            "message": "Live public reads active (read-only). Reply publishing needs the official Developer API.",
        }


class AppleProvider(ReviewDataProvider):
    name = "app_store"
    is_live = False

    def __init__(self, credentials: dict = None):
        self.credentials = credentials or {}

    async def fetch_reviews(self, application: dict, since: str = None):
        raise NotConnectedError(
            "App Store connection not configured. Add App Store Connect API key "
            "(issuer id, key id, private key) in Integrations to enable live sync."
        )

    async def connection_status(self, application: dict) -> dict:
        connected = bool(self.credentials.get("key_id"))
        return {
            "provider": "app_store",
            "connected": connected,
            "live": connected,
            "message": None if connected else "Not connected. Add App Store Connect credentials.",
        }


class MockProvider(ReviewDataProvider):
    """Serves demo data already present in the database. Clearly non-live."""

    name = "mock"
    is_live = False

    async def fetch_reviews(self, application: dict, since: str = None):
        return []

    async def connection_status(self, application: dict) -> dict:
        return {
            "provider": "mock",
            "connected": True,
            "live": False,
            "message": "Demo data provider active. Connect a store integration for live data.",
        }


class NotConnectedError(Exception):
    pass


def get_provider(platform: str, credentials: dict = None) -> ReviewDataProvider:
    if platform == "google_play":
        # Use official credential-based provider when creds exist (enables reply publishing);
        # otherwise the public live provider handles read-only ingestion.
        if credentials and credentials.get("service_account_json"):
            return GooglePlayProvider(credentials)
        return GooglePlayLiveProvider()
    if platform == "app_store":
        return AppleProvider(credentials)
    return MockProvider()

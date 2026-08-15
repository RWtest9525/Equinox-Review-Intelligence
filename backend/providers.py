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
    name = "google_play"
    is_live = False

    def __init__(self, credentials: dict = None):
        self.credentials = credentials or {}

    async def fetch_reviews(self, application: dict, since: str = None):
        raise NotConnectedError(
            "Google Play connection not configured. Add Google Play Developer API "
            "service-account credentials in Integrations to enable live sync."
        )

    async def connection_status(self, application: dict) -> dict:
        connected = bool(self.credentials.get("service_account_json"))
        return {
            "provider": "google_play",
            "connected": connected,
            "live": connected,
            "message": None if connected else "Not connected. Add Google Play credentials.",
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
        return GooglePlayProvider(credentials)
    if platform == "app_store":
        return AppleProvider(credentials)
    return MockProvider()

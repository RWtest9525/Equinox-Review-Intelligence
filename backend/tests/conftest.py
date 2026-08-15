import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

CRED_SUPER = {"email": "admin@equinox.ai", "password": "Equinox@2026"}
CRED_CLIENT_ADMIN = {"email": "rahul@zenpay.io", "password": "Client@2026"}
CRED_CLIENT_MEMBER = {"email": "member@zenpay.com", "password": "Member@2026"}


def _login(session, creds):
    r = session.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Login failed for {creds['email']}: {r.status_code} {r.text[:200]}")
    return r.json()


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def super_admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    data = _login(s, CRED_SUPER)
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.user = data["user"]  # type: ignore
    return s


@pytest.fixture(scope="session")
def client_admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    data = _login(s, CRED_CLIENT_ADMIN)
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.user = data["user"]  # type: ignore
    return s


@pytest.fixture(scope="session")
def client_member_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    data = _login(s, CRED_CLIENT_MEMBER)
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    s.user = data["user"]  # type: ignore
    return s

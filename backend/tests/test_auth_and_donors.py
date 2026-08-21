from uuid import uuid4
import pytest
from backend.app.main import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client

def test_register_and_login_flow(client):
    unique_email = f"phase2_user_{uuid4().hex[:8]}@example.com"
    phone_num = "+91 98400 99999"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "StrongPassword123!",
            "role": "donor",
            "age": 25,
            "phone": phone_num,
            "blood_group": "O+",
            "city": "Coimbatore",
        },
    )

    assert register_response.status_code == 201
    register_payload = register_response.get_json()
    assert register_payload["token_type"] == "bearer"
    assert register_payload["user"]["email"] == unique_email
    assert register_payload["user"]["age"] == 25

    # 1. Login with email
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": unique_email,
            "password": "StrongPassword123!",
        },
    )

    assert login_response.status_code == 200
    login_payload = login_response.get_json()
    assert login_payload["access_token"]
    assert login_payload["user"]["email"] == unique_email

    # 2. Login with phone number
    phone_login_res = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": phone_num,
            "password": "StrongPassword123!",
        },
    )
    assert phone_login_res.status_code == 200
    assert phone_login_res.get_json()["access_token"]


def test_donors_endpoint_returns_seed_data(client):
    test_email = f"donor_list_{uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": "StrongPassword123!",
            "role": "donor",
            "blood_group": "O+",
            "age": 28,
            "city": "Coimbatore",
        },
    )

    response = client.get("/api/v1/donors")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert isinstance(payload["data"], list)
    assert len(payload["data"]) > 0

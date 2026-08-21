from uuid import uuid4
import pytest
from backend.app.main import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client

def test_matching_endpoint_returns_ranked_donors(client):
    test_email = f"donor_match_{uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": "Password123!",
            "role": "donor",
            "blood_group": "O+",
            "city": "Chennai",
            "latitude": 13.0827,
            "longitude": 80.2707,
        },
    )

    response = client.post(
        "/api/v1/matching/rank",
        json={
            "bloodGroup": "O+",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "k": 3,
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert isinstance(payload["data"], list)
    if len(payload["data"]) > 0:
        assert payload["data"][0]["distance_km"] >= 0

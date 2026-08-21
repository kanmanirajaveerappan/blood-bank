import pytest
from uuid import uuid4

from backend.app.main import create_app
from backend.app.services.compatibility_service import (
    check_compatibility,
    get_compatible_candidates,
    validate_blood_group,
)
from backend.app.services.geospatial_service import calculate_distance_km
from backend.app.services.knn_service import rank_candidates_knn
from backend.app.services.agent_service import EmergencyCoordinationAgent
from backend.data.donors import DONORS


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["framework"] == "Flask"


def test_compatibility_engine():
    # O- is universal donor
    assert check_compatibility("O+", "O-") is True
    assert check_compatibility("A+", "O-") is True
    assert check_compatibility("B+", "O-") is True
    assert check_compatibility("AB+", "O-") is True

    # O- can only receive O-
    assert check_compatibility("O-", "O+") is False
    assert check_compatibility("O-", "A-") is False

    # AB+ can receive all
    candidates_ab_pos = get_compatible_candidates("AB+")
    assert len(candidates_ab_pos) == 8

    # O- can only receive from O-
    assert get_compatible_candidates("O-") == ["O-"]


def test_geospatial_haversine():
    # Chennai Central to Chennai Airport is approx 15-20 km
    dist = calculate_distance_km(13.0827, 80.2707, 12.9839, 80.2552)
    assert 10.0 < dist < 20.0


def test_knn_candidate_ranking():
    ranked = rank_candidates_knn(DONORS, k=5, max_distance_km=25.0)
    assert len(ranked) <= 5
    assert all("priority_score" in d for d in ranked)
    assert all("score_breakdown" in d for d in ranked)


def test_agentic_workflow_execution():
    agent = EmergencyCoordinationAgent()
    result = agent.run_full_coordination(
        blood_group="O+",
        hospital_lat=13.0827,
        hospital_lon=80.2707,
        donor_pool=DONORS,
        units_required=2,
        urgency="CRITICAL",
        k=5,
        radius_km=25.0,
    )
    assert result["success"] is True
    assert result["state"] == "MONITORING_RESPONSES"
    assert len(result["agent_logs"]) >= 6
    assert len(result["dispatched_notifications"]) > 0


def test_auth_register_and_login(client):
    unique_email = f"flask_test_{uuid4().hex[:8]}@example.com"

    # Register
    res = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "SecurePassword123!", "role": "hospital"},
    )
    assert res.status_code == 201
    payload = res.get_json()
    assert payload["success"] is True
    assert "access_token" in payload

    # Login
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "SecurePassword123!"},
    )
    assert res_login.status_code == 200
    login_data = res_login.get_json()
    assert login_data["success"] is True
    assert login_data["user"]["email"] == unique_email


def test_matching_endpoint(client):
    test_email = f"matching_test_{uuid4().hex[:8]}@example.com"
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

    res = client.post(
        "/api/v1/matching/rank",
        json={
            "bloodGroup": "O+",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "k": 3,
            "maxDistanceKm": 25,
        },
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    if len(data["data"]) > 0:
        assert data["data"][0]["priority_score"] > 0


def test_inventory_endpoint(client):
    res = client.get("/api/v1/blood-banks/inventory")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["data"]) == 8  # 8 blood groups

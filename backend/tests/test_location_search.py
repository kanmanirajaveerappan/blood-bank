import pytest
import sys, os; sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))); from app.main import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client

def test_search_kmch_coimbatore(client):
    res = client.get("/api/v1/hospitals/search-locations?q=KMCH+Coimbatore")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    top = data["data"][0]
    assert "KMCH" in top["hospital_name"]
    assert top["city"] == "Coimbatore"
    assert "Coimbatore" in top["address"]
    assert top["latitude"] > 10.0 and top["latitude"] < 12.0
    assert top["longitude"] > 76.0 and top["longitude"] < 78.0

def test_search_apollo_chennai(client):
    res = client.get("/api/v1/hospitals/search-locations?q=Apollo+Hospital+Chennai")
    assert res.status_code == 200
    data = res.get_json()
    top = data["data"][0]
    assert "Apollo" in top["hospital_name"]
    assert top["city"] == "Chennai"

def test_search_cmc_vellore(client):
    res = client.get("/api/v1/hospitals/search-locations?q=CMC+Vellore")
    assert res.status_code == 200
    data = res.get_json()
    top = data["data"][0]
    assert "Christian Medical College" in top["hospital_name"] or "CMC" in top["hospital_name"]
    assert top["city"] == "Vellore"

def test_search_peelamedu_coimbatore(client):
    res = client.get("/api/v1/hospitals/search-locations?q=Peelamedu")
    assert res.status_code == 200
    data = res.get_json()
    top = data["data"][0]
    assert top["city"] == "Coimbatore"

def test_search_pincode_641018(client):
    res = client.get("/api/v1/hospitals/search-locations?q=641018")
    assert res.status_code == 200
    data = res.get_json()
    top = data["data"][0]
    assert "641018" in top.get("pincode", "") or "641018" in top.get("address", "")
    assert top["city"] == "Coimbatore"

def test_search_salem_government_hospital(client):
    res = client.get("/api/v1/hospitals/search-locations?q=Salem+Government+Hospital")
    assert res.status_code == 200
    data = res.get_json()
    top = data["data"][0]
    assert top["city"] == "Salem"

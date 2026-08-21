import os
import requests
from typing import Tuple, Dict

from backend.app.core.config import settings

class GoogleMapsClient:
    """Simple wrapper for Google Maps API calls.
    For the purpose of this development environment, we provide lightweight
    fallback implementations that return placeholder data when the API key is
    missing or a request fails. In production, these methods would call the
    actual Google Maps REST endpoints.
    """

    def __init__(self):
        self.api_key = settings.google_maps_api_key
        self.base_url = "https://maps.googleapis.com/maps/api"
        self.session = requests.Session()
        self.session.params = {"key": self.api_key}

    def _handle_response(self, resp: requests.Response) -> dict:
        if resp.status_code == 200:
            return resp.json()
        # Fallback: return empty dict to avoid breaking the application.
        return {}

    def geocode_address(self, address: str) -> Tuple[float, float]:
        """Return (lat, lng) for the given address using the Geocoding API.
        If the request fails, (0.0, 0.0) is returned as a safe default.
        """
        if not self.api_key or self.api_key == "YOUR_API_KEY":
            return 0.0, 0.0
        url = f"{self.base_url}/geocode/json"
        resp = self.session.get(url, params={"address": address})
        data = self._handle_response(resp)
        if data.get("results"):
            location = data["results"][0]["geometry"]["location"]
            return location.get("lat", 0.0), location.get("lng", 0.0)
        return 0.0, 0.0

    def reverse_geocode(self, lat: float, lng: float) -> Dict:
        """Return address components for the given latitude/longitude.
        Returns an empty dict on failure.
        """
        if not self.api_key or self.api_key == "YOUR_API_KEY":
            return {}
        url = f"{self.base_url}/geocode/json"
        resp = self.session.get(url, params={"latlng": f"{lat},{lng}"})
        return self._handle_response(resp)

    def place_details(self, place_id: str) -> Dict:
        """Fetch place details for a given place_id.
        Returns an empty dict on failure.
        """
        if not self.api_key or self.api_key == "YOUR_API_KEY":
            return {}
        url = f"{self.base_url}/place/details/json"
        resp = self.session.get(url, params={"place_id": place_id})
        return self._handle_response(resp)

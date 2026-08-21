import datetime
from typing import Optional

from backend.app.core.config import settings
from backend.app.core.database import get_db_context
from backend.app.models.donor_location import DonorLocation
from backend.app.models.donor import Donor
from backend.app.services.google_maps_client import GoogleMapsClient


def store_current_location(donor_id: str, latitude: float, longitude: float, accuracy: Optional[float] = None, address: Optional[str] = None, source: str = "CURRENT_GPS") -> DonorLocation:
    """Insert or update the donor's current location.
    Only the latest record per donor is kept (UPSERT semantics).
    """
    with get_db_context() as db:
        db.query(DonorLocation).filter(DonorLocation.donor_id == donor_id).delete()
        dl = DonorLocation(
            donor_id=donor_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            address=address,
            source=source,
            updated_at=datetime.datetime.utcnow(),
            confidence=compute_confidence(source, accuracy),
        )
        db.add(dl)
        db.commit()
        db.refresh(dl)
        return dl


def get_last_known_location(donor_id: str) -> Optional[DonorLocation]:
    """Return the most recent DonorLocation record for the donor, if any."""
    with get_db_context() as db:
        return (
            db.query(DonorLocation)
            .filter(DonorLocation.donor_id == donor_id)
            .order_by(DonorLocation.updated_at.desc())
            .first()
        )


def compute_freshness(updated_at: datetime.datetime) -> str:
    """Return freshness enum based on configured thresholds (minutes)."""
    now = datetime.datetime.utcnow()
    diff_minutes = (now - updated_at).total_seconds() / 60
    thresholds = settings.LOCATION_FRESHNESS_THRESHOLDS
    if diff_minutes <= thresholds["LIVE"]:
        return "LIVE"
    if diff_minutes <= thresholds["RECENT"]:
        return "RECENT"
    if diff_minutes <= thresholds["STALE"]:
        return "STALE"
    return "OLD"


def compute_confidence(source: str, accuracy: Optional[float] = None) -> str:
    """Simple heuristic to assign confidence level.
    - CURRENT_GPS is HIGH (if accuracy < 50m)
    - LAST_KNOWN_GPS is MEDIUM
    - MAP_SELECTED is LOW
    - ADMIN_VERIFIED is HIGH
    """
    if source == "CURRENT_GPS":
        if accuracy is not None and accuracy <= 50:
            return "HIGH"
        return "MEDIUM"
    if source == "LAST_KNOWN_GPS":
        return "MEDIUM"
    if source == "MAP_SELECTED":
        return "LOW"
    if source == "ADMIN_VERIFIED":
        return "HIGH"
    return "UNKNOWN"


def best_available_location(donor_id: str) -> Optional[DonorLocation]:
    """Return the best location according to priority order.
    Priority: CURRENT_GPS > LAST_KNOWN_GPS > REGISTERED (as a synthetic DonorLocation).
    """
    loc = get_last_known_location(donor_id)
    if loc:
        return loc
    with get_db_context() as db:
        donor = db.query(Donor).filter(Donor.id == donor_id).first()
        if donor and donor.registered_address:
            client = GoogleMapsClient()
            lat, lng = client.geocode_address(donor.registered_address)
            synthetic = DonorLocation(
                donor_id=donor_id,
                latitude=lat,
                longitude=lng,
                address=donor.registered_address,
                source="ADMIN_VERIFIED",
                confidence="HIGH",
                updated_at=datetime.datetime.utcnow(),
            )
            return synthetic
    return None


def reverse_geocode(lat: float, lng: float) -> dict:
    """Return address components using Google Maps reverse geocoding."""
    client = GoogleMapsClient()
    return client.reverse_geocode(lat, lng)


def validate_destination(place_id: str) -> dict:
    """Validate a destination place (hospital, etc.) and return its details."""
    client = GoogleMapsClient()
    return client.place_details(place_id)

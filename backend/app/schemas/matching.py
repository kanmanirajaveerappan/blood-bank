from typing import List

from pydantic import BaseModel, ConfigDict, Field


class MatchingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    blood_group: str = Field(..., alias="bloodGroup", min_length=2, max_length=6)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    k: int = Field(default=5, ge=1, le=20)
    max_distance_km: float = Field(default=25.0, alias="maxDistanceKm", ge=1.0, le=200.0)


class MatchingCandidate(BaseModel):
    donor_id: str
    name: str
    blood_group: str
    latitude: float
    longitude: float
    distance_km: float


class MatchingResponse(BaseModel):
    success: bool = True
    data: List[MatchingCandidate]

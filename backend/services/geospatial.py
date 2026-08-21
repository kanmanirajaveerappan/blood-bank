import math


def haversine_km(lat1, lon1, lat2, lon2):
    rlat1 = math.radians(lat1)
    rlon1 = math.radians(lon1)
    rlat2 = math.radians(lat2)
    rlon2 = math.radians(lon2)

    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6371.0 * c


def find_nearest_donors(hospital_lat, hospital_lon, donors, k=5):
    if not donors:
        return []

    ranked = []
    for donor in donors:
        distance_km = haversine_km(hospital_lat, hospital_lon, donor["latitude"], donor["longitude"])
        ranked.append({
            "donor_id": donor["donor_id"],
            "name": donor.get("name", donor["donor_id"]),
            "blood_group": donor.get("blood_group"),
            "latitude": donor["latitude"],
            "longitude": donor["longitude"],
            "distance_km": round(distance_km, 2),
        })

    ranked.sort(key=lambda item: item["distance_km"])
    return ranked[:k]

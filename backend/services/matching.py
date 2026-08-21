from backend.services.compatibility import eligible_donor_groups
from backend.services.geospatial import find_nearest_donors


def match_donors(requested_group, hospital_lat, hospital_lon, donors, k=5, max_distance_km=25):
    allowed_groups = eligible_donor_groups(requested_group)
    eligible = []

    for donor in donors:
        if donor.get("availability") is not True:
            continue
        if donor.get("blood_group") not in allowed_groups:
            continue
        if donor.get("latitude") is None or donor.get("longitude") is None:
            continue
        eligible.append(donor)

    ranked = find_nearest_donors(hospital_lat, hospital_lon, eligible, k=k)
    return [entry for entry in ranked if entry["distance_km"] <= max_distance_km]

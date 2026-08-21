from typing import Dict, List, Optional

# Deterministic medical blood compatibility matrix (Red Blood Cells / Whole Blood)
BLOOD_COMPATIBILITY: Dict[str, List[str]] = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
}

# Plasma compatibility (Reverse)
PLASMA_COMPATIBILITY: Dict[str, List[str]] = {
    "AB": ["AB"],
    "A": ["A", "AB"],
    "B": ["B", "AB"],
    "O": ["O", "A", "B", "AB"],
}

VALID_BLOOD_GROUPS = list(BLOOD_COMPATIBILITY.keys())


def validate_blood_group(blood_group: Optional[str]) -> bool:
    """Validates if a blood group is a recognized standard group."""
    if not blood_group:
        return False
    return blood_group.strip().upper() in BLOOD_COMPATIBILITY


def check_compatibility(recipient_group: str, donor_group: str) -> bool:
    """Deterministic check: Can donor_group donate red blood cells to recipient_group?"""
    if not recipient_group or not donor_group:
        return False
    rec = recipient_group.strip().upper()
    don = donor_group.strip().upper()
    if rec not in BLOOD_COMPATIBILITY or don not in BLOOD_COMPATIBILITY:
        return False
    return don in BLOOD_COMPATIBILITY[rec]


def get_compatible_candidates(recipient_group: str) -> List[str]:
    """Returns the list of all compatible donor blood types for a recipient blood group."""
    if not recipient_group:
        return []
    rec = recipient_group.strip().upper()
    return BLOOD_COMPATIBILITY.get(rec, [])


def get_compatibility_matrix() -> Dict[str, List[str]]:
    """Returns the full compatibility matrix for UI visualizer."""
    return BLOOD_COMPATIBILITY

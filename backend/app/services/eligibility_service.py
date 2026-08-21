"""Eligibility Service — calculates donor eligibility based on configurable donation rules.

Provides:
  - get_donation_rules()         → cached rule lookup
  - calculate_eligibility()      → per-donor eligibility dict
  - filter_eligible_donors()     → hard eligibility gate for matching pipeline

IMPORTANT: Waiting periods in donation_rules are operational workflow defaults
used by this blood bank/hospital platform. They do NOT constitute universal
medical advice. Final donor eligibility is determined by the institution's
approved clinical screening procedures and applicable local health regulations.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import threading
import time

from backend.app.models.donation_rules import DEFAULT_DONATION_RULES

# ── Rule Cache ──────────────────────────────────────────────────────────────────
_rules_cache: Dict[str, Any] = {}
_rules_cache_ts: float = 0.0
_CACHE_TTL_SECONDS = 300  # 5 minutes
_cache_lock = threading.Lock()


def get_donation_rules() -> Dict[str, Any]:
    """Returns donation rules from cache (falls back to DEFAULT_DONATION_RULES).
    
    In production with a live DB session, this would query donation_rules table.
    For the current in-memory SQLite architecture it uses the defaults seeded at startup.
    The cache is invalidated when admin updates rules via the API.
    """
    global _rules_cache, _rules_cache_ts
    with _cache_lock:
        now = time.time()
        if _rules_cache and (now - _rules_cache_ts) < _CACHE_TTL_SECONDS:
            return _rules_cache.copy()
        # Reload from defaults (DB layer can be wired here)
        _rules_cache = {k: dict(v) for k, v in DEFAULT_DONATION_RULES.items()}
        _rules_cache_ts = now
        return _rules_cache.copy()


def invalidate_rules_cache() -> None:
    """Call this after an admin updates donation rules to force immediate reload."""
    global _rules_cache_ts
    with _cache_lock:
        _rules_cache_ts = 0.0


def update_rule_in_cache(donation_type: str, waiting_period_days: int) -> None:
    """Directly updates the in-memory cache after an admin rule change."""
    global _rules_cache, _rules_cache_ts
    with _cache_lock:
        if donation_type in _rules_cache:
            _rules_cache[donation_type]["waiting_period_days"] = waiting_period_days
        _rules_cache_ts = time.time()


def calculate_eligibility(
    donor: Dict[str, Any],
    donation_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Calculates complete eligibility status for a single donor.

    Args:
        donor: Dict with at least last_donation_date and last_donation_type.
        donation_type: Override donation type to check eligibility for.
                       If None, uses donor["last_donation_type"].

    Returns:
        {
            eligible: bool,
            eligibility_status: "ELIGIBLE" | "NOT_ELIGIBLE",
            donation_type: str,
            last_donation_date: str | None,
            next_eligible_date: str | None,
            days_remaining: int,           # 0 if eligible
            days_since_donation: int,
            waiting_period_days: int,
            reason: str,                   # human-readable explanation
        }
    """
    rules = get_donation_rules()

    # Resolve donation type to check
    d_type = (
        donation_type
        or donor.get("last_donation_type")
        or "WHOLE_BLOOD"
    ).upper()

    rule = rules.get(d_type, rules["WHOLE_BLOOD"])
    waiting_days = rule["waiting_period_days"]

    # Parse last_donation_date from donor dict (datetime or ISO string)
    last_date_raw = donor.get("last_donation_date")
    if last_date_raw is None:
        # No prior donation recorded → eligible
        return {
            "eligible": True,
            "eligibility_status": "ELIGIBLE",
            "donation_type": d_type,
            "last_donation_date": None,
            "next_eligible_date": None,
            "days_remaining": 0,
            "days_since_donation": 9999,
            "waiting_period_days": waiting_days,
            "reason": "No prior donation recorded. Eligible per operational workflow.",
        }

    # Parse to datetime
    if isinstance(last_date_raw, str):
        try:
            last_date = datetime.fromisoformat(last_date_raw.replace("Z", "+00:00"))
            last_date = last_date.replace(tzinfo=None)  # strip tz for naive comparison
        except ValueError:
            last_date = datetime.strptime(last_date_raw[:10], "%Y-%m-%d")
    elif isinstance(last_date_raw, datetime):
        last_date = last_date_raw.replace(tzinfo=None)
    else:
        last_date = datetime.utcnow() - timedelta(days=9999)

    next_eligible = last_date + timedelta(days=waiting_days)
    now = datetime.utcnow()
    days_since = (now - last_date).days
    days_remaining = max(0, (next_eligible - now).days)
    eligible = now >= next_eligible

    return {
        "eligible": eligible,
        "eligibility_status": "ELIGIBLE" if eligible else "NOT_ELIGIBLE",
        "donation_type": d_type,
        "last_donation_date": last_date.strftime("%d-%b-%Y"),
        "next_eligible_date": next_eligible.strftime("%d-%b-%Y"),
        "next_eligible_date_iso": next_eligible.isoformat(),
        "days_remaining": days_remaining,
        "days_since_donation": days_since,
        "waiting_period_days": waiting_days,
        "reason": (
            "Eligible. Waiting period completed per operational workflow."
            if eligible
            else f"Waiting period not completed. {days_remaining} days remaining until {next_eligible.strftime('%d-%b-%Y')}."
        ),
    }


def check_donor_eligible(donor: Dict[str, Any], donation_type: Optional[str] = None) -> bool:
    """Quick boolean eligibility check. Hard gate for matching pipeline."""
    return calculate_eligibility(donor, donation_type)["eligible"]


def filter_eligible_donors(
    donors: List[Dict[str, Any]],
    donation_type: Optional[str] = None,
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Hard eligibility gate — splits donor pool into eligible and ineligible.

    Returns:
        (eligible_donors, ineligible_donors)
    
    Ineligible donors MUST NOT receive emergency notifications.
    """
    eligible = []
    ineligible = []
    for donor in donors:
        result = calculate_eligibility(donor, donation_type)
        donor_copy = dict(donor)
        donor_copy["_eligibility"] = result
        if result["eligible"]:
            eligible.append(donor_copy)
        else:
            ineligible.append(donor_copy)
    return eligible, ineligible


def build_eligibility_response(donor: Dict[str, Any]) -> Dict[str, Any]:
    """Builds the complete eligibility API response for a donor profile."""
    donation_type = donor.get("last_donation_type", "WHOLE_BLOOD")
    elig = calculate_eligibility(donor, donation_type)
    rules = get_donation_rules()

    return {
        "donor_id": donor.get("id") or donor.get("donor_id"),
        "blood_group": donor.get("blood_group"),
        **elig,
        "all_types_eligibility": {
            dtype: calculate_eligibility(donor, dtype)
            for dtype in rules.keys()
        },
        "disclaimer": (
            "Eligibility status shown is based on this platform's operational workflow defaults. "
            "Final donor eligibility is determined by clinical screening at the blood bank/hospital "
            "and applicable local health regulations."
        ),
    }

import io
from typing import Dict, Any, List
import pandas as pd

from backend.app.services.compatibility_service import VALID_BLOOD_GROUPS


def parse_and_validate_donor_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses and validates uploaded Excel (.xlsx) or CSV donor records.
    Implements workflow: Upload -> Analyze -> Validate -> Clean -> Preview.
    """
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            return {
                "success": False,
                "error": "Unsupported file format. Please upload a .csv or .xlsx file."
            }
    except Exception as exc:
        return {
            "success": False,
            "error": f"Failed to parse file: {str(exc)}"
        }

    # Normalize column names
    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]

    total_records = len(df)
    valid_records = []
    invalid_records = []
    duplicate_count = 0
    missing_value_count = int(df.isnull().sum().sum())

    seen_identifiers = set()

    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        row_num = idx + 2  # 1-indexed header + 1

        # Check blood group
        blood_group = str(row_dict.get("blood_group", row_dict.get("bloodgroup", ""))).strip().upper()
        name = str(row_dict.get("name", row_dict.get("full_name", ""))).strip()
        phone = str(row_dict.get("phone", row_dict.get("phone_number", ""))).strip()
        lat = row_dict.get("latitude", row_dict.get("lat"))
        lon = row_dict.get("longitude", row_dict.get("lon", row_dict.get("lng")))

        errors = []
        if not name or name.lower() == "nan":
            errors.append("Missing donor name")
        if blood_group not in VALID_BLOOD_GROUPS:
            errors.append(f"Invalid blood group '{blood_group}' (must be one of {VALID_BLOOD_GROUPS})")
        if not phone or phone.lower() == "nan":
            errors.append("Missing phone number")

        try:
            lat_val = float(lat) if lat is not None and str(lat).lower() != "nan" else None
            lon_val = float(lon) if lon is not None and str(lon).lower() != "nan" else None
            if lat_val is not None and not (-90 <= lat_val <= 90):
                errors.append("Latitude out of range (-90 to 90)")
            if lon_val is not None and not (-180 <= lon_val <= 180):
                errors.append("Longitude out of range (-180 to 180)")
        except (ValueError, TypeError):
            lat_val, lon_val = None, None
            errors.append("Invalid geographic coordinates format")

        # Duplicate check (by phone or name+blood_group)
        identifier = phone if phone and phone != "nan" else f"{name}:{blood_group}"
        if identifier in seen_identifiers:
            duplicate_count += 1
            errors.append("Duplicate donor record detected")
        else:
            seen_identifiers.add(identifier)

        cleaned_item = {
            "row_number": row_num,
            "name": name if name != "nan" else "Unknown",
            "blood_group": blood_group,
            "phone": phone if phone != "nan" else "N/A",
            "city": str(row_dict.get("city", "Chennai")),
            "latitude": lat_val,
            "longitude": lon_val,
            "availability": bool(row_dict.get("availability", True)),
        }

        if errors:
            cleaned_item["errors"] = errors
            invalid_records.append(cleaned_item)
        else:
            valid_records.append(cleaned_item)

    return {
        "success": True,
        "filename": filename,
        "total_records": total_records,
        "valid_count": len(valid_records),
        "invalid_count": len(invalid_records),
        "duplicate_count": duplicate_count,
        "missing_values_detected": missing_value_count,
        "valid_records_preview": valid_records[:50],  # Preview first 50
        "invalid_records": invalid_records[:50],
        "can_import": len(valid_records) > 0,
        "summary": (
            f"Analyzed {total_records} rows: {len(valid_records)} valid, "
            f"{len(invalid_records)} invalid, {duplicate_count} duplicates."
        )
    }

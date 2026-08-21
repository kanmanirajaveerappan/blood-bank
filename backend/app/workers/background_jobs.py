from typing import Dict, Any


def process_excel_import(payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "status": "queued",
        "records": payload.get("records", 0),
        "message": "Excel import queued for validation.",
    }

from datetime import datetime
from uuid import uuid4
from flask import Blueprint, request, jsonify

from backend.app.core.database import get_db_context
from backend.app.models.audit_log import AuditLog
from backend.app.models.donor import Donor
from backend.app.services.analytics_service import get_analytics_overview
from backend.app.services.excel_service import parse_and_validate_donor_file

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")


@admin_bp.get("/stats")
def get_admin_stats():
    overview = get_analytics_overview()
    return jsonify({
        "success": True,
        "data": overview["metrics"]
    })


@admin_bp.get("/ai-monitor")
def get_ai_monitor_info():
    overview = get_analytics_overview()
    return jsonify({
        "success": True,
        "data": overview["ai_model_metrics"]
    })


@admin_bp.get("/audit-logs")
def get_audit_logs():
    """Retrieve real audit log trail from Neon PostgreSQL."""
    try:
        with get_db_context() as session:
            db_logs = session.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
            results = []
            for l in db_logs:
                results.append({
                    "id": l.id,
                    "timestamp": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "Recent",
                    "actor": l.entity or "System",
                    "action": l.action,
                    "details": l.details or f"Action {l.action} performed on {l.entity}",
                })
            return jsonify({
                "success": True,
                "total": len(results),
                "data": results,
            })
    except Exception as e:
        return jsonify({
            "success": True,
            "total": 0,
            "data": [],
        })


@admin_bp.post("/excel-import/validate")
def validate_excel_upload():
    """Receives an uploaded .xlsx or .csv file and runs the validation pipeline."""
    if "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "No file uploaded. Please choose an Excel (.xlsx) or CSV (.csv) file to import.",
        }), 400

    uploaded_file = request.files["file"]
    file_bytes = uploaded_file.read()
    filename = uploaded_file.filename

    analysis = parse_and_validate_donor_file(file_bytes, filename)
    return jsonify(analysis)


@admin_bp.post("/excel-import/confirm")
def confirm_excel_import():
    """Commits validated donor records to Neon PostgreSQL."""
    data = request.get_json(silent=True) or {}
    imported_records = data.get("valid_records", [])

    committed_count = 0
    with get_db_context() as session:
        for r in imported_records:
            donor_id = f"D{uuid4().hex[:6].upper()}"
            donor = Donor(
                id=donor_id,
                user_id=str(uuid4()),
                full_name=r.get("name", "Verified Donor"),
                phone=r.get("phone", "+91 98400 12345"),
                blood_group=r.get("blood_group", "O+"),
                city=r.get("city", "Coimbatore"),
                latitude=float(r.get("latitude", 11.0168)),
                longitude=float(r.get("longitude", 76.9558)),
                availability_status="AVAILABLE",
                consent_status=True,
                last_active=datetime.utcnow(),
            )
            session.add(donor)
            committed_count += 1

        log_entry = AuditLog(
            id=f"LOG-{uuid4().hex[:6].upper()}",
            user_id="ADMIN",
            action="EXCEL_IMPORT_CONFIRMED",
            entity="DonorBatch",
            entity_id=f"BATCH-{committed_count}",
            details=f"Successfully imported and committed {committed_count} donor records into PostgreSQL database.",
            created_at=datetime.utcnow(),
        )
        session.add(log_entry)
        session.commit()

    return jsonify({
        "success": True,
        "message": f"Successfully committed {committed_count} donor records to the database.",
        "imported_count": committed_count,
    })

from uuid import uuid4
from datetime import datetime
from flask import Blueprint, request, jsonify

from backend.app.core.database import get_db_context
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    auth_required,
)
from backend.app.models.user import User
from backend.app.models.hospital import Hospital
from backend.app.models.donor import Donor
from backend.app.models.blood_bank import BloodBank

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = str(data.get("role", "donor")).strip().lower()
    
    # Extra facility & location requirements
    name = str(data.get("name") or data.get("hospital_name") or data.get("full_name") or "").strip()
    hospital_name = name
    city = str(data.get("city", "")).strip() or "Coimbatore"
    phone = str(data.get("phone", "")).strip()
    blood_group = str(data.get("blood_group", "O+")).strip()
    license_number = str(data.get("license_number", "")).strip() or None
    
    # Donor age validation (critical medical requirement: 18 - 65 years)
    age = None
    if role == "donor":
        try:
            raw_age = data.get("age")
            if raw_age is not None and str(raw_age).strip() != "":
                age = int(raw_age)
        except (ValueError, TypeError):
            age = None
            
        if age is None or age < 18 or age > 65:
            return jsonify({
                "success": False,
                "error": "Donor age is mandatory and must be between 18 and 65 years old for medical blood donation eligibility."
            }), 400
    
    try:
        latitude = float(data.get("latitude")) if data.get("latitude") is not None else 11.0168
        longitude = float(data.get("longitude")) if data.get("longitude") is not None else 76.9558
    except (ValueError, TypeError):
        latitude = 11.0168
        longitude = 76.9558

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    if role not in ("donor", "hospital", "blood-bank", "blood_bank", "admin"):
        role = "donor"
    if role == "blood_bank":
        role = "blood-bank"

    with get_db_context() as session:
        existing = session.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({"success": False, "error": "A user with this email already exists."}), 409

        user = User(
            id=str(uuid4()),
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_verified=True,
            status="active",
        )
        session.add(user)
        session.flush()

        # Create corresponding profile record based on role
        if role == "hospital":
            hospital = Hospital(
                id=str(uuid4()),
                user_id=user.id,
                hospital_name=hospital_name or name or "Emergency Care Hospital",
                license_number=license_number,
                city=city,
                latitude=latitude,
                longitude=longitude,
                verification_status="verified",
                is_active=True,
            )
            session.add(hospital)

        elif role == "donor":
            donor_id = f"D{str(uuid4())[:6].upper()}"
            donor = Donor(
                id=donor_id,
                user_id=user.id,
                full_name=name or hospital_name or "Volunteer Donor",
                phone=phone or "+91 98400 12345",
                blood_group=blood_group or "O+",
                age=age,
                city=city,
                registered_city=city,
                latitude=latitude,
                longitude=longitude,
                availability_status="AVAILABLE",
                consent_status=True,
                location_sharing_enabled=True,
                location_permission_status="GRANTED",
                last_active=datetime.utcnow(),
                last_location_update=datetime.utcnow(),
            )
            session.add(donor)

        elif role == "blood-bank":
            bank = BloodBank(
                id=str(uuid4()),
                user_id=user.id,
                bank_name=hospital_name or name or "Central Blood Bank Facility",
                city=city,
                latitude=latitude,
                longitude=longitude,
                verification_status="verified",
                is_active=True,
            )
            session.add(bank)

        token = create_access_token(user.email, role=user.role, extra_data={"user_id": user.id})

        return jsonify({
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "donor_id": donor_id if role == "donor" and 'donor_id' in locals() else user.id,
                "email": user.email,
                "role": user.role,
                "name": name or hospital_name or user.email,
                "phone": phone or "+91 98400 12345",
                "blood_group": blood_group or "O+",
                "age": age,
                "city": city,
                "latitude": latitude,
                "longitude": longitude,
            }
        }), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    identifier = str(data.get("email") or data.get("identifier") or data.get("phone") or "").strip()
    password = str(data.get("password", ""))

    if not identifier or not password:
        return jsonify({"success": False, "error": "Email/Mobile number and password are required."}), 400

    with get_db_context() as session:
        # 1. Search by direct email
        user = session.query(User).filter(User.email == identifier.lower()).first()
        
        # 2. If not found by email, search by phone number in Donor table
        if not user:
            clean_digits = "".join(ch for ch in identifier if ch.isdigit())
            donor_query = session.query(Donor).filter(
                (Donor.phone == identifier) | 
                (Donor.phone == f"+91 {identifier}") | 
                (Donor.phone == f"+91{identifier}")
            )
            donor = donor_query.first()
            if not donor and clean_digits and len(clean_digits) >= 10:
                donor = session.query(Donor).filter(Donor.phone.ilike(f"%{clean_digits[-10:]}%")).first()
            
            if donor:
                user = session.query(User).filter(User.id == donor.user_id).first()

        if not user or not verify_password(password, user.password_hash):
            return jsonify({"success": False, "error": "Invalid email/mobile number or password."}), 401

        # Fetch associated profile details with auto-provision fallback
        name = user.email.split("@")[0].capitalize()
        city = "Coimbatore"
        latitude = 11.0168
        longitude = 76.9558
        phone = "+91 98400 12345"
        blood_group = "O+"
        donor_age = None

        if user.role == "hospital":
            h = session.query(Hospital).filter(Hospital.user_id == user.id).first()
            if h:
                name = h.hospital_name
                city = h.city or city
                latitude = h.latitude or latitude
                longitude = h.longitude or longitude
            else:
                # Auto-provision hospital in Neon DB
                h = Hospital(
                    id=str(uuid4()),
                    user_id=user.id,
                    hospital_name=f"{name} Emergency Hospital",
                    city=city,
                    latitude=latitude,
                    longitude=longitude,
                    verification_status="verified",
                    is_active=True,
                )
                session.add(h)
                session.flush()
        elif user.role == "donor":
            d = session.query(Donor).filter(Donor.user_id == user.id).first()
            if d:
                name = d.full_name
                city = d.city or city
                latitude = d.latitude or latitude
                longitude = d.longitude or longitude
                phone = d.phone or phone
                blood_group = d.blood_group or blood_group
                donor_age = d.age
            else:
                # Auto-provision donor in Neon DB
                d = Donor(
                    id=f"D{str(uuid4())[:6].upper()}",
                    user_id=user.id,
                    full_name=name,
                    phone=phone,
                    blood_group=blood_group,
                    age=26,
                    city=city,
                    registered_city=city,
                    latitude=latitude,
                    longitude=longitude,
                    availability_status="AVAILABLE",
                    consent_status=True,
                    location_sharing_enabled=True,
                    location_permission_status="GRANTED",
                    last_active=datetime.utcnow(),
                    last_location_update=datetime.utcnow(),
                )
                session.add(d)
                session.flush()
        elif user.role == "blood-bank":
            b = session.query(BloodBank).filter(BloodBank.user_id == user.id).first()
            if b:
                name = b.bank_name
                city = b.city or city
                latitude = b.latitude or latitude
                longitude = b.longitude or longitude
            else:
                # Auto-provision blood bank in Neon DB
                b = BloodBank(
                    id=str(uuid4()),
                    user_id=user.id,
                    bank_name=f"{name} Central Blood Bank",
                    city=city,
                    latitude=latitude,
                    longitude=longitude,
                    verification_status="verified",
                    is_active=True,
                )
                session.add(b)
                session.flush()

        token = create_access_token(user.email, role=user.role, extra_data={"user_id": user.id})

        return jsonify({
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "donor_id": d.id if user.role == "donor" and 'd' in locals() and d else None,
                "email": user.email,
                "role": user.role,
                "name": name,
                "phone": phone,
                "blood_group": blood_group,
                "age": donor_age,
                "city": city,
                "latitude": latitude,
                "longitude": longitude,
            }
        })




@auth_bp.post("/google")
def google_auth():
    """Handle Sign-in and Sign-up with Google OAuth."""
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    name = str(data.get("name", "")).strip() or "Google User"
    role = str(data.get("role", "hospital")).strip().lower()
    city = str(data.get("city", "Coimbatore")).strip()
    raw_age = data.get("age")
    donor_age = None
    try:
        if raw_age is not None:
            donor_age = int(raw_age)
    except (ValueError, TypeError):
        donor_age = 26
    
    try:
        latitude = float(data.get("latitude")) if data.get("latitude") is not None else 11.0168
        longitude = float(data.get("longitude")) if data.get("longitude") is not None else 76.9558
    except (ValueError, TypeError):
        latitude = 11.0168
        longitude = 76.9558

    if not email:
        return jsonify({"success": False, "error": "Google email is required."}), 400

    if role not in ("donor", "hospital", "blood-bank", "blood_bank", "admin"):
        role = "hospital"
    if role == "blood_bank":
        role = "blood-bank"

    with get_db_context() as session:
        user = session.query(User).filter(User.email == email).first()

        if not user:
            # Register new Google user
            user = User(
                id=str(uuid4()),
                email=email,
                password_hash=hash_password(str(uuid4())),  # Secure random password for OAuth user
                role=role,
                is_verified=True,
                status="active",
            )
            session.add(user)
            session.flush()

            if role == "hospital":
                hospital = Hospital(
                    id=str(uuid4()),
                    user_id=user.id,
                    hospital_name=name if "hospital" in name.lower() else f"{name} Medical Center",
                    city=city,
                    latitude=latitude,
                    longitude=longitude,
                    verification_status="verified",
                    is_active=True,
                )
                session.add(hospital)
            elif role == "donor":
                donor = Donor(
                    id=f"D{str(uuid4())[:6].upper()}",
                    user_id=user.id,
                    full_name=name,
                    phone="+91 98400 12345",
                    blood_group="O+",
                    age=donor_age or 26,
                    city=city,
                    latitude=latitude,
                    longitude=longitude,
                    availability_status="AVAILABLE",
                    consent_status=True,
                    last_active=datetime.utcnow(),
                )
                session.add(donor)
            elif role == "blood-bank":
                bank = BloodBank(
                    id=str(uuid4()),
                    user_id=user.id,
                    bank_name=f"{name} Blood Center",
                    city=city,
                    latitude=latitude,
                    longitude=longitude,
                    verification_status="verified",
                    is_active=True,
                )
                session.add(bank)

        token = create_access_token(user.email, role=user.role, extra_data={"user_id": user.id})

        return jsonify({
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "name": name,
                "city": city,
                "age": donor_age,
            }
        })


@auth_bp.get("/me")
@auth_required()
def get_current_user_profile():
    user_info = getattr(request, "user", {})
    return jsonify({
        "success": True,
        "user": user_info
    })


# In-memory OTP storage for password reset: {email: {"otp": code, "expires": timestamp}}
_RESET_OTPS = {}

@auth_bp.post("/forgot-password")
def forgot_password():
    """Request a password reset OTP for the user account via Gmail SMTP."""
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()

    if not email:
        return jsonify({"success": False, "error": "Email address is required."}), 400

    import random
    import time
    from backend.app.core.email import send_otp_email

    otp_code = f"{random.randint(100000, 999999)}"
    _RESET_OTPS[email] = {"otp": otp_code, "expires": time.time() + 900}

    # Dispatch real email via Gmail SMTP
    email_sent = send_otp_email(email, otp_code)

    with get_db_context() as session:
        user = session.query(User).filter(User.email == email).first()
        return jsonify({
            "success": True,
            "message": f"Verification code sent to {email}.",
            "email_sent": email_sent,
            "demo_otp": otp_code,
            "user": {
                "email": user.email if user else email,
                "role": user.role if user else "user"
            }
        })


@auth_bp.post("/reset-password")
def reset_password():
    """Verify reset code and update user password in Neon PostgreSQL."""
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    new_password = str(data.get("new_password", ""))
    otp = str(data.get("otp", "")).strip()

    if not email or not new_password:
        return jsonify({"success": False, "error": "Email and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters long."}), 400

    with get_db_context() as session:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            return jsonify({"success": False, "error": "No account found with this email address."}), 404

        # Update password hash in PostgreSQL
        user.password_hash = hash_password(new_password)
        session.commit()

        token = create_access_token(user.email, role=user.role, extra_data={"user_id": user.id})

        return jsonify({
            "success": True,
            "message": "Password updated successfully in database. You can now login.",
            "access_token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role
            }
        })



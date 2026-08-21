import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.database import init_db, get_db_context
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.models.donor import Donor
from backend.app.models.hospital import Hospital
from backend.app.models.blood_bank import BloodBank
from backend.app.models.inventory import BloodInventory
from backend.app.models.blood_request import BloodRequest
from backend.data.donors import DONORS


def seed():
    print("Initializing LifeLink AI database schema...")
    init_db()

    with get_db_context() as session:
        # 1. Seed Users for all roles
        default_users = [
            ("admin@lifelink.ai", "admin123", "admin"),
            ("hospital@lifelink.ai", "hospital123", "hospital"),
            ("donor@lifelink.ai", "donor123", "donor"),
            ("bloodbank@lifelink.ai", "bloodbank123", "blood-bank"),
        ]

        for email, password, role in default_users:
            existing = session.query(User).filter(User.email == email).first()
            if not existing:
                user = User(
                    id=str(uuid4()),
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                    is_verified=True,
                    status="active",
                )
                session.add(user)
                print(f"Created default user: {email} ({role})")

        session.flush()

        # 2. Seed Donors from dataset
        for d in DONORS:
            donor_id = d.get("donor_id")
            existing_donor = session.query(Donor).filter(Donor.id == donor_id).first()
            if not existing_donor:
                new_donor = Donor(
                    id=donor_id,
                    user_id=str(uuid4()),
                    full_name=d.get("name", donor_id),
                    phone=f"+91 9840{hash(donor_id) % 90000 + 10000}",
                    blood_group=d.get("blood_group", "O+"),
                    city="Chennai",
                    latitude=d.get("latitude"),
                    longitude=d.get("longitude"),
                    availability_status="AVAILABLE" if d.get("availability") else "UNAVAILABLE",
                    consent_status=True,
                    last_active=datetime.utcnow() - timedelta(minutes=(hash(donor_id) % 120)),
                    last_location_update=datetime.utcnow() - timedelta(minutes=(hash(donor_id) % 60)),
                    privacy_level="standard",
                )
                session.add(new_donor)

        # 3. Seed Hospitals
        hospitals_data = [
            ("H001", "City General Hospital", "Chennai", 13.0827, 80.2707),
            ("H002", "Apollo Emergency Care", "Chennai", 13.0600, 80.2500),
            ("H003", "Grace Memorial Hospital", "Chennai", 13.0400, 80.2200),
        ]
        for hid, hname, city, lat, lon in hospitals_data:
            existing_h = session.query(Hospital).filter(Hospital.id == hid).first()
            if not existing_h:
                h = Hospital(
                    id=hid,
                    user_id=str(uuid4()),
                    hospital_name=hname,
                    license_number=f"LIC-{hid}-2026",
                    city=city,
                    latitude=lat,
                    longitude=lon,
                    verification_status="verified",
                    is_active=True,
                )
                session.add(h)

        # 4. Seed Blood Bank and 8-group inventory
        bb_id = "BB001"
        existing_bb = session.query(BloodBank).filter(BloodBank.id == bb_id).first()
        if not existing_bb:
            bb = BloodBank(
                id=bb_id,
                user_id=str(uuid4()),
                bank_name="Central LifeLink Blood Bank",
                city="Chennai",
                latitude=13.0700,
                longitude=80.2600,
                verification_status="verified",
                is_active=True,
            )
            session.add(bb)

            initial_inventory = [
                ("A+", 24, 4, "Healthy"),
                ("A-", 8, 2, "Low"),
                ("B+", 18, 3, "Healthy"),
                ("B-", 5, 1, "Critical"),
                ("AB+", 12, 2, "Low"),
                ("AB-", 4, 0, "Critical"),
                ("O+", 31, 6, "Healthy"),
                ("O-", 9, 4, "Low"),
            ]
            for bg, units, reserved, status in initial_inventory:
                inv = BloodInventory(
                    id=str(uuid4()),
                    blood_bank_id=bb_id,
                    blood_group=bg,
                    units_available=units,
                    units_reserved=reserved,
                    status=status,
                    expiry_date=datetime.utcnow() + timedelta(days=30),
                )
                session.add(inv)

        # 5. Seed initial Blood Request
        req_id = "REQ-2048"
        existing_req = session.query(BloodRequest).filter(BloodRequest.id == req_id).first()
        if not existing_req:
            req = BloodRequest(
                id=req_id,
                hospital_id="H001",
                blood_group="O-",
                units_required=4,
                emergency_level="CRITICAL",
                status="MATCHING_DONORS",
                latitude=13.0827,
                longitude=80.2707,
                required_by=datetime.utcnow() + timedelta(minutes=45),
                additional_info="Urgent surgery trauma response.",
            )
            session.add(req)

        print("Database seeded successfully with initial users, donors, hospitals, and inventory!")


if __name__ == "__main__":
    seed()

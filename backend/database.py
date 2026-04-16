"""
Four MongoDB Databases (same Atlas cluster URI, different database names):
  authDB         -> users collection
  complaintDB    -> complaints collection
  agencyDB       -> DataAgency collection
  verificationDB -> verifications, reports collections
"""
import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client():
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        try:
            _client.admin.command("ping")
            print("[DB] ✅ MongoDB connected")
        except Exception as e:
            print(f"[DB] ⚠️  Connection warning: {e}")
    return _client

# ── Database getters ──────────────────────────────────────────────────
def auth_db():         return get_client()["authDB"]
def complaint_db():    return get_client()["complaintDB"]
def agency_db():       return get_client()["agencyDB"]
def verification_db(): return get_client()["verificationDB"]

# ── Collection shortcuts ──────────────────────────────────────────────
def users_col():         return auth_db()["users"]
def complaints_col():    return complaint_db()["complaints"]
def agency_col():        return agency_db()["DataAgency"]   # exact collection name as specified
def verify_col():        return verification_db()["verifications"]
def reports_col():       return verification_db()["reports"]

# ── Index setup ───────────────────────────────────────────────────────
def setup_indexes():
    try:
        users_col().create_index([("email", ASCENDING)], unique=True)
        complaints_col().create_index([("complaintNumber", DESCENDING)])
        complaints_col().create_index([("userEmail", ASCENDING)])
        complaints_col().create_index([("agencyEmail", ASCENDING)])
        complaints_col().create_index([("status", ASCENDING)])
        complaints_col().create_index([("timestamp", DESCENDING)])
        agency_col().create_index([("pincode", ASCENDING)], unique=True)
        verify_col().create_index([("complaintId", ASCENDING)])
        print("[DB] ✅ Indexes ready")
    except Exception as e:
        print(f"[DB] Index note: {e}")

# ── Complaint number generator ────────────────────────────────────────
def generate_complaint_number() -> str:
    """CMP-YYYYMMDD-XXXX format"""
    from datetime import datetime
    date_str = datetime.utcnow().strftime("%Y%m%d")
    counter = verification_db()["counters"].find_one_and_update(
        {"_id": f"cmp_{date_str}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return f"CMP-{date_str}-{str(counter['seq']).zfill(4)}"

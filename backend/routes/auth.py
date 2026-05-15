from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
import bcrypt, datetime, re, os
from database import users_col

from dotenv import load_dotenv
load_dotenv()


auth_bp     = Blueprint("auth", __name__)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "ADMIN22@gmail.com").lower()
ADMIN_PASS  = os.getenv("ADMIN_PASSWORD", "Admin@2003")

def _hash(pw):        return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def _verify(pw, h):   return bcrypt.checkpw(pw.encode(), h.encode())
def _valid_email(e):  return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", e))
def _clean(doc):
    doc["_id"] = str(doc["_id"]); doc.pop("password", None); return doc

@auth_bp.route("/register", methods=["POST"])
def register():
    d        = request.get_json() or {}
    name     = d.get("name", "").strip()
    email    = d.get("email", "").strip().lower()
    password = d.get("password", "")
    phone    = d.get("phone", "").strip()

    if not all([name, email, password]):
        return jsonify({"error": "Name, email and password are required"}), 400
    if not _valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    if len(password) < 6:    
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if email == ADMIN_EMAIL:
        return jsonify({"error": "This email is reserved"}), 400
    if users_col().find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409
      
    result = users_col().insert_one({
        "name": name, "email": email, "phone": phone,
        "password": _hash(password), "role": "user",
        "createdAt": datetime.datetime.utcnow()       
    })
    token = create_access_token(
        identity=str(result.inserted_id),
        additional_claims={"role": "user", "email": email, "name": name}
    )
    return jsonify({
        "accessToken": token,
        "user": {"id": str(result.inserted_id), "name": name, "email": email, "role": "user"}
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    d        = request.get_json() or {}
    email    = d.get("email", "").strip().lower()
    password = d.get("password", "")
    role_req = d.get("role", "user")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    # ── Admin gate ────────────────────────────────────
    if email == ADMIN_EMAIL:
        if password != ADMIN_PASS:
            return jsonify({"error": "Invalid admin credentials"}), 401
        token = create_access_token(
            identity="admin",
            additional_claims={"role": "admin", "email": email, "name": "Administrator"}
        )
        return jsonify({
            "accessToken": token,
            "user": {"id": "admin", "name": "Administrator", "email": email, "role": "admin"}
        }), 200

    # ── Staff / User ──────────────────────────────────
    user = users_col().find_one({"email": email})
    if not user or not _verify(password, user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    stored_role = user.get("role", "user")
    # If user tries to log in as staff but role is "user", deny
    if role_req == "staff" and stored_role != "staff":
        return jsonify({"error": "No staff account found for this email"}), 403

    token = create_access_token(
        identity=str(user["_id"]),
        additional_claims={"role": stored_role, "email": email, "name": user["name"]}
    )
    return jsonify({
        "accessToken": token,
        "user": {"id": str(user["_id"]), "name": user["name"], "email": email, "role": stored_role}
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    if claims.get("role") == "admin":
        return jsonify({"id":"admin","name":"Administrator","email":ADMIN_EMAIL,"role":"admin"}), 200
    uid  = get_jwt_identity()
    doc  = users_col().find_one({"_id": ObjectId(uid)})
    if not doc: return jsonify({"error": "User not found"}), 404
    return jsonify(_clean(doc)), 200

# backend/routes/auth.py

@auth_bp.route("/staff/create", methods=["POST"])
@jwt_required()
def create_staff():
    if get_jwt().get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    # New fields: pincode range
    pincode_start = data.get("pincodeStart", "").strip()
    pincode_end = data.get("pincodeEnd", "").strip()
    # Optional agency email (if still needed)
    agency_email = data.get("agencyEmail", "").strip()

    if not all([name, email, password]):
        return jsonify({"error": "Name, email and password are required"}), 400
    if not pincode_start or not pincode_end:
        return jsonify({"error": "Pincode start and end are required"}), 400
    if not pincode_start.isdigit() or not pincode_end.isdigit():
        return jsonify({"error": "Pincodes must be numeric"}), 400
    if int(pincode_start) > int(pincode_end):
        return jsonify({"error": "Start pincode cannot be greater than end pincode"}), 400

    if users_col().find_one({"email": email}):
        return jsonify({"error": "Email already in use"}), 409

    users_col().insert_one({
        "name": name,
        "email": email,
        "password": _hash(password),
        "role": "staff",
        "agencyEmail": agency_email,
        "assignedPincodeStart": pincode_start,
        "assignedPincodeEnd": pincode_end,
        "createdAt": datetime.datetime.utcnow()
    })
    return jsonify({"message": f"Staff '{name}' created with pincode range {pincode_start}-{pincode_end}"}), 201

@auth_bp.route("/staff/update/<staff_id>", methods=["PATCH"])
@jwt_required()
def update_staff(staff_id):
    if get_jwt().get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    
    try:
        obj_id = ObjectId(staff_id)
    except:
        return jsonify({"error": "Invalid staff ID"}), 400

    staff = users_col().find_one({"_id": obj_id, "role": "staff"})
    if not staff:
        return jsonify({"error": "Staff not found"}), 404

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    pincode_start = data.get("pincodeStart", "").strip()
    pincode_end = data.get("pincodeEnd", "").strip()
    agency_email = data.get("agencyEmail", "").strip()

    if not all([name, email, pincode_start, pincode_end]):
        return jsonify({"error": "Name, email, and pincodes are required"}), 400

    if not pincode_start.isdigit() or not pincode_end.isdigit():
        return jsonify({"error": "Pincodes must be numeric"}), 400
    if int(pincode_start) > int(pincode_end):
        return jsonify({"error": "Start pincode cannot be greater than end pincode"}), 400

    existing_user = users_col().find_one({"email": email})
    if existing_user and str(existing_user["_id"]) != staff_id:
        return jsonify({"error": "Email already in use"}), 409

    update_fields = {
        "name": name,
        "email": email,
        "agencyEmail": agency_email,
        "assignedPincodeStart": pincode_start,
        "assignedPincodeEnd": pincode_end,
        "updatedAt": datetime.datetime.utcnow()
    }

    if password:
        update_fields["password"] = _hash(password)

    users_col().update_one({"_id": obj_id}, {"$set": update_fields})
    return jsonify({"message": f"Staff '{name}' updated successfully"}), 200

# backend/routes/auth.py
   
@auth_bp.route("/staff/list", methods=["GET"])
@jwt_required()
def list_staff():
    if get_jwt().get("role") != "admin":  
        return jsonify({"error": "Admin only"}), 403
    docs = list(users_col().find({"role": "staff"}, {"password": 0}))
    for d in docs:
        d["_id"] = str(d["_id"])
        # Ensure pincode fields are present (for old staff, set defaults)
        if "assignedPincodeStart" not in d:
            d["assignedPincodeStart"] = ""     
        if "assignedPincodeEnd" not in d:
            d["assignedPincodeEnd"] = ""
    return jsonify(docs), 200

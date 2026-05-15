from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from bson import ObjectId
import datetime, json, os
import cloudinary, cloudinary.uploader
import requests as rq
from database import complaints_col, agency_col, generate_complaint_number
from services.metadata import extract_metadata
from dotenv import load_dotenv; load_dotenv(override=True)
import base64
from services.energy_model import energy_model

from database import users_col

def _build_materials_list(yolo_data):
    """Convert plastics/others arrays into a readable string."""
    items = []
    for p in yolo_data.get("plastics", []):
        if p.get("count", 0) > 0:
            items.append(f"{p['type']}:{p['count']}")
    for o in yolo_data.get("others", []):
        if o.get("count", 0) > 0:
            items.append(f"{o['type']}:{o['count']}")
    if not items:
        return "No items detected"
    return ", ".join(items)




from services.email_service import (
    send_complaint_confirmation,
    send_agency_notification,
    send_staff_assignment_notification
) 

from flask import current_app

# backend/routes/complaints.py

# Add import at top

def _find_staff_by_pincode(pincode: str):
    """Find staff whose pincode range contains the given pincode."""
    if not pincode or not pincode.isdigit():
        return None
    pincode_int = int(pincode)
    staff = users_col().find_one({
        "role": "staff",
        "assignedPincodeStart": {"$exists": True, "$ne": ""},
        "assignedPincodeEnd": {"$exists": True, "$ne": ""},
        "$expr": {
            "$and": [
                {"$lte": [{"$toInt": "$assignedPincodeStart"}, pincode_int]},
                {"$gte": [{"$toInt": "$assignedPincodeEnd"}, pincode_int]}
            ]
        }
    })
    return staff




# --------------------------

complaints_bp = Blueprint("complaints", __name__)

cloudinary.config(
    cloud_name  = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key     = os.getenv("CLOUDINARY_API_KEY"),
    api_secret  = os.getenv("CLOUDINARY_API_SECRET"),
    secure      = True
)

AI_SERVICE = os.getenv("AI_SERVICE_URL", "http://localhost:8000")

def _s(doc):
    doc["_id"] = str(doc.get("_id", "")); return doc 

def _find_agency(pincode: str, lat=None, lng=None):
    """Look up DataAgency collection by pincode. Fallback to reverse-geocode."""
    if pincode:
        rec = agency_col().find_one({"pincode": pincode.strip()}, {"_id": 0})
        if rec:
            return rec.get("email", "agency@municipal.gov.in"), pincode
    # Reverse geocode fallback
    if lat and lng:
        try:
            r = rq.get("https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "addressdetails": 1},
                headers={"User-Agent": "WasteGuard/2.0"}, timeout=6)
            if r.ok:
                pc = r.json().get("address", {}).get("postcode", "").replace(" ", "")
                if pc:
                    rec = agency_col().find_one({"pincode": pc}, {"_id": 0})
                    if rec:
                        return rec.get("email", "agency@municipal.gov.in"), pc
        except Exception as e:
            print(f"[geocode] {e}")
    return "ujjwalvandur03@gmail.com", pincode or "000000"

@complaints_bp.route("/extract-meta", methods=["POST"])
@jwt_required()
def extract_meta():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    img_bytes = request.files["file"].read()
    meta      = extract_metadata(img_bytes)
    agency_email, resolved_pin = _find_agency(meta.get("pincode"), meta.get("latitude"), meta.get("longitude"))
    meta["resolvedPincode"] = resolved_pin
    meta["agencyEmail"]     = agency_email
    return jsonify(meta), 200


# 


@complaints_bp.route("/agency-by-pincode", methods=["POST"])
@jwt_required()
def get_agency_by_pincode():
    """Fetch agency email by pincode"""
    data = request.get_json()
    pincode = data.get('pincode', '').strip()
    
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        return jsonify({"error": "Invalid pincode"}), 400
        
    city_name = "Unknown"
    # Check city via public API, but don't block if not found
    try:
        r = rq.get(f"http://api.zippopotam.us/in/{pincode}", timeout=5)
        if r.status_code == 200:
            data_zip = r.json()
            if "places" in data_zip and len(data_zip["places"]) > 0:
                city_name = data_zip["places"][0].get("place name", "Unknown")
    except Exception as e:
        print(f"Pincode API error: {e}")
        pass # allow fallback if API is down
    
    # Agency database se fetch karo
    agency = agency_col().find_one({"pincode": pincode})
    
    if agency:
        return jsonify({
            "pincode": pincode,
            "agencyEmail": agency.get("email"),
            "agencyName": agency.get("agency"),
            "city": agency.get("city", city_name)
        }), 200
    else:
        return jsonify({
            "pincode": pincode,
            "agencyEmail": "ujjwalvandur03@gmail.com",
            "agencyName": "Default Municipal Agency",
            "city": city_name
        }), 200



# 
# @complaints_bp.route("/submit", methods=["POST"])
# @jwt_required()
# def submit():
#     claims = get_jwt()
#     if "file" not in request.files:
#         return jsonify({"error": "Image required"}), 400

#     img_bytes   = request.files["file"].read()
#     description = request.form.get("description", "").strip()
#     pincode     = request.form.get("pincode", "").strip()
#     lat_str     = request.form.get("latitude", "")
#     lng_str     = request.form.get("longitude", "")
#     yolo_str    = request.form.get("yoloResults", "{}")

#     if not description:
#         return jsonify({"error": "Description is required"}), 400

#     # Upload to Cloudinary
#     upload_res = cloudinary.uploader.upload(
#         img_bytes, folder="wasteguard/before",
#         resource_type="image", quality="auto", fetch_format="auto"
#     )
#     image_url = upload_res["secure_url"]

#     # Parse numbers
#     try:    lat = float(lat_str)
#     except: lat = None
#     try:    lng = float(lng_str)
#     except: lng = None

#     # Resolve agency
#     agency_email, resolved_pin = _find_agency(pincode, lat, lng)

#     # Parse YOLO results
#     try:    yolo = json.loads(yolo_str)
#     except: yolo = {}

#     waste_type   = yolo.get("wasteType", "Unknown")
#     env_impact   = yolo.get("environmentalImpact", "")
#     degradable   = yolo.get("degradable", False)
#     recyclable   = yolo.get("recyclable", "Unknown")

#     doc = {
#         "complaintNumber":    generate_complaint_number(),
#         "userEmail":          claims.get("email"),
#         "userName":           claims.get("name"),
#         "description":        description,
#         "wasteType":          waste_type,
#         "environmentalImpact": env_impact,
#         "degradable":         degradable,
#         "recyclable":         recyclable,
#         "yoloResults":        yolo,
#         "latitude":           lat,
#         "longitude":          lng,
#         "pincode":            resolved_pin,
#         "agencyEmail":        agency_email,
#         "imageURL":           image_url,
#         "afterImageURL":      None,
#         "ssimScore":          None,
#         "status":             "Pending",
#         "adminRemark":        "",
#         "staffRemark":        "",
#         "timestamp":          datetime.datetime.utcnow(),
#         "updatedAt":          datetime.datetime.utcnow(),
#         "resolvedAt":         None
#     }
#     result = complaints_col().insert_one(doc)
#     doc["_id"] = str(result.inserted_id)
   
#     return jsonify({
#         "message":         "Complaint registered successfully",
#         "complaintNumber": doc["complaintNumber"],
#         "complaintId":     str(result.inserted_id),
#         "agencyEmail":     agency_email,
#         "imageURL":        image_url
#     }), 201




# --------------NEw compline t submit 


@complaints_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit():
    claims = get_jwt()
    if "file" not in request.files:
        return jsonify({"error": "Image required"}), 400

    img_bytes   = request.files["file"].read()
    description = request.form.get("description", "").strip()
    pincode     = request.form.get("pincode", "").strip()
    lat_str     = request.form.get("latitude", "")
    lng_str     = request.form.get("longitude", "")
    yolo_str    = request.form.get("yoloResults", "{}")
    
    manual_agency = request.form.get("agencyEmail", "").strip()
    street_addr   = request.form.get("streetAddress", "").strip()
    landmark      = request.form.get("landmark", "").strip()

    if not description:
        return jsonify({"error": "Description is required"}), 400

    # Upload to Cloudinary
    upload_res = cloudinary.uploader.upload(
        img_bytes, folder="wasteguard/before",
        resource_type="image", quality="auto", fetch_format="auto"
    )
    image_url = upload_res["secure_url"]

    # Parse numbers
    try:    lat = float(lat_str)
    except: lat = None
    try:    lng = float(lng_str)
    except: lng = None

    # Use manual agency if provided, otherwise resolve from pincode
    if manual_agency and manual_agency != 'ujjwalvandur03@gmail.com':
        agency_email = manual_agency
        resolved_pin = pincode
        print(f"[Submit] Using manual agency: {agency_email}")
    else:
        agency_email, resolved_pin = _find_agency(pincode, lat, lng)
        print(f"[Submit] Resolved agency from pincode: {agency_email}")  

    # Parse YOLO/LLM results
    # try:    yolo = json.loads(yolo_str)
    # except: yolo = {}

    # waste_type   = yolo.get("wasteType", "Unknown")    
    # env_impact   = yolo.get("environmentalImpact", "")
    # degradable   = yolo.get("degradable", False)
    # recyclable   = yolo.get("recyclable", "Unknown")
    # total_weight = yolo.get("total_weight_kg", 0.5)   # agar LLM se nahi aaya toh 0.5 kg assume

        # Parse YOLO/LLM results
    # Parse YOLO/LLM results
    try:
        yolo = json.loads(yolo_str)
        # --- Upload annotated image to Cloudinary if present ---
        annotated_url = None
        # ✅ JSON ke bajaye direct Form Data se image receive karein
        annotated_base64 = request.form.get("annotatedImageBase64", "")
        if annotated_base64:
            try:
                annotated_bytes = base64.b64decode(annotated_base64)
                upload_res = cloudinary.uploader.upload(
                    annotated_bytes,
                    folder="wasteguard/annotated",
                    resource_type="image",  
                    format="png",   
                    quality="auto"
                )
                annotated_url = upload_res["secure_url"]
                print(f"[Submit] Annotated image uploaded: {annotated_url}")
            except Exception as upload_err:
                print(f"[Submit] Failed to upload annotated image: {upload_err}")
                annotated_url = None
        else:
            annotated_url = None
    except Exception as parse_err:
        print(f"[Submit] Error parsing AI results: {parse_err}")
        yolo = {}
        annotated_url = None

    waste_type = yolo.get("wasteType", "Mixed Waste")
    env_impact = yolo.get("environmentalImpact", "Waste causes environmental damage.")
    total_items = yolo.get("totalItems", 0)          # ← ADD THIS LINE
    total_weight = yolo.get("totalWeightKg", 0.5)

    

    waste_type = yolo.get("wasteType", "Mixed Waste")
    env_impact = yolo.get("environmentalImpact", "Waste causes environmental damage.")
    degradable = False   # you can compute from yolo if needed
    recyclable = "Unknown"
    total_weight = yolo.get("totalWeightKg", 0.5)
    materials_list = _build_materials_list(yolo)   # <-- new

    # ✅ ENERGY CALCULATION – YAHAN PEHLE CALL KARO  
    energy_kwh, co2_saved = energy_model.predict(waste_type, total_weight)
    households = round(energy_kwh / 30, 1) if energy_kwh else 0     
    cars = round(co2_saved / 4.6, 1) if co2_saved else 0


    assigned_staff = _find_staff_by_pincode(resolved_pin)
    staff_email = assigned_staff["email"] if assigned_staff else None


    # Complaint document
    doc = {
        "complaintNumber":    generate_complaint_number(),
        "userEmail":          claims.get("email"),
        "userName":           claims.get("name"),
        "description":        description,
        "wasteType":          waste_type,
        "annotatedImageURL": annotated_url,
        "totalItems": total_items, 
        "environmentalImpact": env_impact,
        "materialsList": materials_list,
        "degradable":         degradable,
        "recyclable":         recyclable,
        "yoloResults":        yolo,
        # "annotatedImageBase64": annotated_base64,
        "latitude":           lat,    
        "longitude":          lng,
        "pincode":            resolved_pin,
        "agencyEmail":        agency_email,
        "streetAddress":      street_addr,
        "landmark":           landmark,
        "imageURL":           image_url,
        "afterImageURL":      None,  
        "ssimScore":          None,
        "status":             "Pending",
        "adminRemark":        "",
        "staffRemark":        "",
        "timestamp":          datetime.datetime.utcnow(),
        "updatedAt":          datetime.datetime.utcnow(),
        "resolvedAt":         None,
        # Energy fields
        "energyKwh":          energy_kwh,
        "co2SavedKg":         co2_saved,
        "householdsPowered":  households,
        "carsOffRoad":        cars,
        "assignedStaffEmail":staff_email,
        
    }
    
    result = complaints_col().insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # --- Email notifications (optional, keep as is) ---
    try:
        complaint_details = {
            'wasteType': waste_type,
            'pincode': resolved_pin,
            'agencyEmail': agency_email
        }
        send_complaint_confirmation(
            user_email=claims.get("email"),
            user_name=claims.get("name", "User"),
            complaint_number=doc["complaintNumber"],
            complaint_details=complaint_details
        )
    except Exception as e:
        print(f"[Email] Error sending confirmation: {e}")

    try:
        send_agency_notification(
            agency_email=agency_email,
            complaint_number=doc["complaintNumber"],
            user_name=claims.get("name", "User"),
            complaint_details=complaint_details
        )
        print("Agency email sent")
    except Exception as e:
        print(f"[Email] Agency email failed: {e}")

    if staff_email:
        try:
            send_staff_assignment_notification(
                staff_email=staff_email,
                complaint_number=doc["complaintNumber"],
                user_name=claims.get("name", "User"),
                complaint_details={
                    'wasteType': waste_type,
                    'pincode': resolved_pin,
                    'description': description
                }
            )
        except Exception as e:
            print(f"[Email] Staff notification failed: {e}")

    # Return response with energy data
    return jsonify({
        "message":         "Complaint registered successfully",
        "complaintNumber": doc["complaintNumber"],
        "complaintId":     str(result.inserted_id),
        "agencyEmail":     agency_email,
        "imageURL":        image_url,
        "energyKwh":       energy_kwh,
        "co2SavedKg":      co2_saved,
        "householdsPowered": households,
        "carsOffRoad":     cars
    }), 201
# ------------


@complaints_bp.route("/my", methods=["GET"])
@jwt_required()
def my_complaints():
    claims = get_jwt()
    docs   = list(complaints_col().find(
        {"userEmail": claims.get("email")},
        sort=[("timestamp", -1)]
    ))
    return jsonify([_s(d) for d in docs]), 200

@complaints_bp.route("/my/stats", methods=["GET"])   
@jwt_required()
def my_stats():
    e = get_jwt().get("email")
    return jsonify({
        "total":       complaints_col().count_documents({"userEmail": e}),
        "pending":     complaints_col().count_documents({"userEmail": e, "status": "Pending"}),
        "cleaned":     complaints_col().count_documents({"userEmail": e, "status": "Cleaned"}),
        "rejected":    complaints_col().count_documents({"userEmail": e, "status": "Rejected"}),
    }), 200

@complaints_bp.route("/<cid>", methods=["GET"])
@jwt_required()
def get_one(cid):
    try:   doc = complaints_col().find_one({"_id": ObjectId(cid)})
    except: return jsonify({"error": "Invalid ID"}), 400
    if not doc: return jsonify({"error": "Not found"}), 404
    return jsonify(_s(doc)), 200

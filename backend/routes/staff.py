from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from bson import ObjectId
import datetime
import os
import requests
import cloudinary, cloudinary.uploader
from database import complaints_col, verify_col
from dotenv import load_dotenv

from services.twin_vision_agent import run_twin_vision_agent

load_dotenv()

staff_bp = Blueprint("staff", __name__)

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# AI Service for Multimodal LLM detection
AI_SERVICE_URL = "http://localhost:8000/api/ai/detect"

def _s(doc):
    doc["_id"] = str(doc.get("_id", ""))
    return doc

def _staff_guard():
    role = get_jwt().get("role")
    if role not in ("staff", "admin"):
        return jsonify({"error": "Staff access required"}), 403
    return None

def detect_waste_from_bytes(image_bytes):
    """Sends the image to the LLM service to count objects"""
    files = {'file': ('image.jpg', image_bytes, 'image/jpeg')}
    try:
        resp = requests.post(AI_SERVICE_URL, files=files, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            if "totalItems" not in data:
                data["totalItems"] = 0
            return data
        else:
            print(f"[AI detect] HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"[AI detect] Exception: {e}")
    return None

# ----------------------------------------------------------------------
# GET routes
# ----------------------------------------------------------------------
@staff_bp.route("/complaints", methods=["GET"])
@jwt_required()
def agency_complaints():
    g = _staff_guard()
    if g: return g
    staff_email = get_jwt().get("email")
    status = request.args.get("status")
    query = {"assignedStaffEmail": staff_email}
    if status:
        query["status"] = status
    docs = list(complaints_col().find(query, sort=[("timestamp", -1)]))
    return jsonify([_s(d) for d in docs]), 200

@staff_bp.route("/complaints/stats", methods=["GET"])
@jwt_required()
def staff_stats():
    g = _staff_guard()
    if g: return g
    staff_email = get_jwt().get("email")
    return jsonify({
        "total": complaints_col().count_documents({"assignedStaffEmail": staff_email}),
        "pending": complaints_col().count_documents({"assignedStaffEmail": staff_email, "status": "Pending"}),
        "cleaned": complaints_col().count_documents({"assignedStaffEmail": staff_email, "status": "Cleaned"}),
        "rejected": complaints_col().count_documents({"assignedStaffEmail": staff_email, "status": "Rejected"}),
    }), 200

# ----------------------------------------------------------------------
# Main verify endpoint with dynamic LLM comparison
# ----------------------------------------------------------------------

# Then replace the existing verify function (or add as optional method)
@staff_bp.route("/complaints/<cid>/verify", methods=["POST"])
@jwt_required()
def verify(cid):
    g = _staff_guard()
    if g:
        return g
    claims = get_jwt()

    if "file" not in request.files:
        return jsonify({"error": "After-image required"}), 400

    try:
        complaint = complaints_col().find_one({"_id": ObjectId(cid)})
    except:
        return jsonify({"error": "Invalid ID"}), 400
    if not complaint:
        return jsonify({"error": "Complaint not found"}), 404

    after_bytes = request.files["file"].read()
    remark = request.form.get("remark", "")

    # Upload after‑image to Cloudinary first (so we have a URL)
    up_res = cloudinary.uploader.upload(
        after_bytes, folder="wasteguard/after",
        resource_type="image", quality="auto", fetch_format="auto"
    )
    after_url = up_res["secure_url"]

    # ------------------------------------------------------------------
    # Run Twin‑Vision Agent
    # ------------------------------------------------------------------
    agent_result = run_twin_vision_agent(
        complaint_id=cid,
        before_image_url=complaint["imageURL"],
        after_image_bytes=after_bytes,
        verified_by_email=claims.get("email"),
        after_image_url=after_url
    )

    if "error" in agent_result:
        # Fallback: mark as pending review
        final_status = "Pending Review"
        agent_reason = agent_result["error"]
        after_items = -1
    else:
        final_status = agent_result["status"]
        agent_reason = agent_result["message"]
        after_items = agent_result["afterItems"]

    # The agent already updated the database, but we still need to return response.
    # However our agent already called process_verification_decision which updated both complaints and verify_col.
    # So we just need to return the result.

    # Optional: if you want to also store staffRemark separately:
    if remark:
        complaints_col().update_one(
            {"_id": ObjectId(cid)},
            {"$set": {"staffRemark": remark + f" | {agent_reason}"}}
        )

    return jsonify({
        "message": agent_reason,
        "similarityScore": None,  # Not used
        "beforeItems": complaint.get("totalItems", 0),
        "afterItems": after_items,
        "status": final_status,
        "afterImageURL": after_url
    }), 200
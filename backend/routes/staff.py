from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from bson import ObjectId
import datetime, os
import cloudinary, cloudinary.uploader
from database import complaints_col, verify_col
from services.ssim_service import run_ssim
from dotenv import load_dotenv; load_dotenv()

staff_bp = Blueprint("staff", __name__)

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key    = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure     = True
)

def _s(doc): doc["_id"] = str(doc.get("_id", "")); return doc

def _staff_guard():
    role = get_jwt().get("role")
    if role not in ("staff", "admin"):
        return jsonify({"error": "Staff access required"}), 403
    return None

@staff_bp.route("/complaints", methods=["GET"])
@jwt_required()
def agency_complaints():
    g = _staff_guard()
    if g: return g
    claims = get_jwt()
    staff_email = claims.get("email")   # staff ka email
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
    # 👇 YAHAN FIX KIYA: staff_email variable define karo
    staff_email = get_jwt().get("email")
    return jsonify({
        "total":    complaints_col().count_documents({"assignedStaffEmail": staff_email}),
        "pending":  complaints_col().count_documents({"assignedStaffEmail": staff_email, "status": "Pending"}),
        "cleaned":  complaints_col().count_documents({"assignedStaffEmail": staff_email, "status": "Cleaned"}),
        "rejected": complaints_col().count_documents({"assignedStaffEmail": staff_email, "status": "Rejected"}),
    }), 200

@staff_bp.route("/complaints/<cid>/verify", methods=["POST"])
@jwt_required()
def verify(cid):
    g = _staff_guard()
    if g: return g
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
    remark      = request.form.get("remark", "")

    # Upload after-image to Cloudinary
    up_res    = cloudinary.uploader.upload(
        after_bytes, folder="wasteguard/after",
        resource_type="image", quality="auto", fetch_format="auto"
    )
    after_url = up_res["secure_url"]

    # Run SSIM comparison
    ssim_result = run_ssim(complaint["imageURL"], after_bytes)

    if "error" in ssim_result:
        return jsonify({"error": ssim_result["error"]}), 500

    now = datetime.datetime.utcnow()
    upd = {
        "afterImageURL": after_url,
        "ssimScore":     ssim_result["ssimScore"],
        "status":        ssim_result["status"],
        "staffRemark":   remark,
        "updatedAt":     now,
    }
    if ssim_result["status"] == "Cleaned":
        upd["resolvedAt"] = now

    complaints_col().update_one({"_id": ObjectId(cid)}, {"$set": upd})

    # Log to verificationDB
    verify_col().insert_one({
        "complaintId":   cid,
        "beforeImageURL": complaint["imageURL"],
        "afterImageURL":  after_url,
        "ssimScore":      ssim_result["ssimScore"],
        "orbRatio":       ssim_result.get("orbRatio"),
        "isCleaned":      ssim_result["isCleaned"],
        "needsReview":    ssim_result["needsReview"],
        "status":         ssim_result["status"],
        "verifiedBy":     claims.get("email"),
        "verifiedAt":     now
    })

    return jsonify({
        "message":      f"Verification complete — status: {ssim_result['status']}",
        "ssimScore":    ssim_result["ssimScore"],
        "isCleaned":    ssim_result["isCleaned"],
        "status":       ssim_result["status"],
        "afterImageURL": after_url
    }), 200
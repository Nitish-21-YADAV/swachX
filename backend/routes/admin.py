from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from bson import ObjectId
import datetime
from database import complaints_col, users_col

admin_bp = Blueprint("admin", __name__)

def _s(doc): doc["_id"] = str(doc.get("_id", "")); return doc

def _admin_guard():
    if get_jwt().get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None

@admin_bp.route("/complaints", methods=["GET"])
@jwt_required()
def all_complaints():   
    g = _admin_guard()
    if g: return g
    status  = request.args.get("status")
    agency  = request.args.get("agency")
    page    = int(request.args.get("page", 1))
    limit   = int(request.args.get("limit", 50))
    skip    = (page - 1) * limit

    query = {}
    if status: query["status"] = status
    if agency: query["agencyEmail"] = agency

    docs  = list(complaints_col().find(query, sort=[("timestamp", -1)], skip=skip, limit=limit))
    total = complaints_col().count_documents(query)
    return jsonify({"complaints": [_s(d) for d in docs], "total": total, "page": page}), 200

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def stats():
    g = _admin_guard()
    if g: return g
    return jsonify({
        "total":    complaints_col().count_documents({}),
        "pending":  complaints_col().count_documents({"status": "Pending"}),
        "cleaned":  complaints_col().count_documents({"status": "Cleaned"}),
        "rejected": complaints_col().count_documents({"status": "Rejected"}),
        "users":    users_col().count_documents({"role": "user"}),
        "staff":    users_col().count_documents({"role": "staff"}),
    }), 200

@admin_bp.route("/complaints/<cid>/status", methods=["PATCH"])
@jwt_required()
def update_status(cid):
    g = _admin_guard()
    if g: return g
    d          = request.get_json() or {}
    new_status = d.get("status")
    remark     = d.get("remark", "")
    if new_status not in ("Pending", "Cleaned", "Rejected"):
        return jsonify({"error": "status must be Pending, Cleaned, or Rejected"}), 400
    upd = {"status": new_status, "adminRemark": remark, "updatedAt": datetime.datetime.utcnow()}
    if new_status == "Cleaned":
        upd["resolvedAt"] = datetime.datetime.utcnow()
    complaints_col().update_one({"_id": ObjectId(cid)}, {"$set": upd})
    return jsonify({"message": f"Status updated to {new_status}"}), 200

@admin_bp.route("/complaints/<cid>", methods=["GET"])
@jwt_required()
def get_one(cid):
    g = _admin_guard()
    if g: return g
    try:   doc = complaints_col().find_one({"_id": ObjectId(cid)})
    except: return jsonify({"error": "Invalid ID"}), 400
    if not doc: return jsonify({"error": "Not found"}), 404
    return jsonify(_s(doc)), 200

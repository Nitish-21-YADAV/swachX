from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from database import recommendations_col

agent_bp = Blueprint("agent", __name__)

@agent_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def get_recommendations():
    """Return all AI‑generated recommendations (bin deployments and resource reports)"""
    if get_jwt().get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    
    # Fetch all recommendations, newest first
    recs = list(recommendations_col().find({}, {"_id": 0}).sort("timestamp", -1))
    return jsonify(recs), 200    
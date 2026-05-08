import os
import json
import datetime
from bson import ObjectId
import google.generativeai as genai
from database import complaints_col, recommendations_col

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# =====================================================================
# ACTUAL EMAIL SENDING USING FLASK-MAIL (NO CIRCULAR IMPORT)
# =====================================================================
def _send_staff_warning_email(staff_email: str, complaint_id: str, hours_pending: float, reason: str):
    """Send real warning email using Flask-Mail extension."""
    from flask import current_app
    from flask_mail import Message
    
    with current_app.app_context():
        mail = current_app.extensions.get('mail')
        if not mail:
            print("[EMAIL] Mail extension not initialized")
            return
        msg = Message(
            subject=f"⚠️ Action Required: Complaint {complaint_id} Delayed",
            recipients=[staff_email],
            body=f"Complaint {complaint_id} pending for {hours_pending:.1f} hours.\n\nReason: {reason}\n\nPlease take immediate action."
        )
        mail.send(msg)
        print(f"[EMAIL] Warning sent to {staff_email}")

def _send_admin_escalation_email(admin_email: str, complaint_id: str, reason: str):
    """Send real escalation email using Flask-Mail extension."""
    from flask import current_app
    from flask_mail import Message
    
    with current_app.app_context():
        mail = current_app.extensions.get('mail')
        if not mail:
            print("[EMAIL] Mail extension not initialized")
            return
        msg = Message(
            subject=f"🚨 Escalated: Complaint {complaint_id} Needs Attention",
            recipients=[admin_email],
            body=f"Complaint {complaint_id} escalated.\n\nReason: {reason}\n\nPlease review and take action."
        )
        mail.send(msg)
        print(f"[EMAIL] Escalation sent to {admin_email}")

def send_warning_to_staff(staff_email: str, complaint_id: str, severity_reason: str):
    """Tool called by Gemini – sends warning email."""
    # Compute actual hours pending (optional improvement)
    try:
        complaint = complaints_col().find_one({"_id": ObjectId(complaint_id)})
        if complaint:
            hours_pending = (datetime.datetime.utcnow() - complaint['timestamp']).total_seconds() / 3600
        else:
            hours_pending = 50
        _send_staff_warning_email(staff_email, complaint_id, hours_pending, severity_reason)
    except Exception as e:
        print(f"[Email] Warning error: {e}")
    return "Staff warning sent successfully."

def escalate_to_admin(admin_email: str, complaint_id: str, escalate_reason: str):
    """Tool called by Gemini – escalates and notifies admin."""
    # Update MongoDB status
    complaints_col().update_one(
        {"_id": ObjectId(complaint_id)},
        {
            "$set": {
                "status": "Escalated",
                "escalationReason": escalate_reason,
                "updatedAt": datetime.datetime.utcnow()
            }
        }
    )
    try:
        _send_admin_escalation_email(admin_email, complaint_id, escalate_reason)
    except Exception as e:
        print(f"[Email] Escalation error: {e}")
    print(f"[ACTION] 🚨 ESCALATED to {admin_email} for Complaint {complaint_id}.")
    return "Complaint escalated."

# =====================================================================
# ESCALATION AGENT
# =====================================================================
def run_escalation_agent():
    print("Running Monitoring & Escalation Agent...")
    # For production use hours=48, for test use minutes=5
    threshold = datetime.datetime.utcnow() - datetime.timedelta(minutes=2)
    stale = list(complaints_col().find({"status": "Pending", "timestamp": {"$lte": threshold}}))
    if not stale:
        print("No stale complaints.")
        return

    model = genai.GenerativeModel(
        model_name='gemini-2.5-flash',
        tools=[send_warning_to_staff, escalate_to_admin]
    )
    for comp in stale:
        hours = (datetime.datetime.utcnow() - comp['timestamp']).total_seconds() / 3600
        comp_id = str(comp['_id'])
        prompt = f"""
        Escalation Manager Agent.
        Complaint: {comp_id}, Waste: {comp.get('wasteType')}, Hours: {hours:.1f}
        Staff: {comp.get('assignedStaffEmail')}
        Rules:
        - 48-72h & non-hazardous → send_warning_to_staff
        - >72h or hazardous → escalate_to_admin
        Admin email: admin@municipal.gov.in
        Call tool with params. Do not return text.
        """
        try:
            response = model.generate_content(prompt)
            for part in response.parts:
                if fn := part.function_call:
                    args = {k: v for k, v in fn.args.items()}
                    if fn.name == "send_warning_to_staff":
                        send_warning_to_staff(**args)
                    elif fn.name == "escalate_to_admin":
                        escalate_to_admin(**args)
        except Exception as e:
            print(f"[Error] {comp_id}: {e}")

# =====================================================================
# PREDICTIVE ANALYTICS AGENT
# =====================================================================
def suggest_new_bin_deployment(pincode: str, bin_type: str, justification: str):
    doc = {
        "type": "bin_deployment",
        "pincode": pincode,
        "bin_type": bin_type,
        "justification": justification,
        "timestamp": datetime.datetime.utcnow(),
        "status": "pending"
    }
    recommendations_col().insert_one(doc)
    print(f"[ACTION] 📊 Bin: {bin_type} at {pincode} – {justification}")
    return "Saved."

def generate_resource_allocation_report(critical_pincodes: list, summary: str):
    doc = {
        "type": "resource_report",
        "critical_pincodes": critical_pincodes,
        "summary": summary,
        "timestamp": datetime.datetime.utcnow(),
        "status": "pending"
    }
    recommendations_col().insert_one(doc)
    print(f"[ACTION] 📑 Report for {critical_pincodes} – {summary}")
    return "Saved."

def run_predictive_agent():
    print("Running Predictive Analytics Agent...")
    threshold = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    pipeline = [
        {"$match": {"timestamp": {"$gte": threshold}}},
        {"$project": {"pincode": 1, "wasteType": 1}},
        {"$group": {
            "_id": {"pincode": "$pincode", "wasteType": "$wasteType"},
            "count": {"$sum": 1}
        }},
        {"$group": {
            "_id": "$_id.pincode",
            "waste_trends": {"$push": {"type": "$_id.wasteType", "count": "$count"}},
            "total_complaints": {"$sum": "$count"}
        }},
        {"$limit": 100}
    ]
    data = list(complaints_col().aggregate(pipeline))
    if not data:
        print("Not enough data.")
        return
    data_json = json.dumps(data, default=str)[:12000]
    model = genai.GenerativeModel(
        model_name='gemini-2.5-flash',
        tools=[suggest_new_bin_deployment, generate_resource_allocation_report]
    )
    prompt = f"""
    Analyze grouped data:
    {data_json}
    Rules:
    - High e-waste/plastics → suggest_new_bin_deployment
    - High total_complaints → generate_resource_allocation_report
    Call tools only.
    """
    try:
        response = model.generate_content(prompt)
        for part in response.parts:
            if fn := part.function_call:
                args = {k: v for k, v in fn.args.items()}
                if fn.name == "suggest_new_bin_deployment":
                    suggest_new_bin_deployment(**args)
                elif fn.name == "generate_resource_allocation_report":
                    generate_resource_allocation_report(**args)
    except Exception as e:
        print(f"[Predictive Error]: {e}")
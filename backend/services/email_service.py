from flask_mail import Message
from flask import current_app
import os
from app import mail

def send_complaint_confirmation(user_email, user_name, complaint_number, complaint_details):
    """
    Send confirmation email to the user who filed the complaint.
    """
    subject = f"🌱 SwachX - Complaint {complaint_number} Registered Successfully"
    
    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #15803d; margin: 0; font-size: 24px;">🌱 SwachX</h1>
            <p style="color: #6b7280; margin-top: 5px; font-size: 14px;">Waste Complaint Registered</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi <strong>{user_name}</strong>,</p>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Thank you for making a difference! Your complaint has been successfully registered and forwarded to the assigned municipal agency.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px; text-transform: uppercase; font-weight: bold;">Complaint Summary</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
                    <tr>
                        <td style="padding: 6px 0; border-bottom: 1px solid #dcfce7; width: 40%;"><strong>ID:</strong></td>
                        <td style="padding: 6px 0; border-bottom: 1px solid #dcfce7; font-family: monospace; color: #15803d; font-size: 16px; word-break: break-all;">{complaint_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; border-bottom: 1px solid #dcfce7;"><strong>Waste Type:</strong></td>
                        <td style="padding: 6px 0; border-bottom: 1px solid #dcfce7;">{complaint_details.get('wasteType', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; border-bottom: 1px solid #dcfce7;"><strong>Pincode:</strong></td>
                        <td style="padding: 6px 0; border-bottom: 1px solid #dcfce7;">{complaint_details.get('pincode', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0;"><strong>Assigned Agency:</strong></td>
                        <td style="padding: 6px 0; word-break: break-all;">{complaint_details.get('agencyEmail', 'N/A')}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">You can track the status of your complaint on your SwachX dashboard.</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated message from SwachX.</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0 0;">Please do not reply to this email.</p>
        </div>
    </div>
    """
    
    try:
        msg = Message(
            subject=subject,
            recipients=[user_email],
            html=html_body
        )
        mail.send(msg)
        print(f"[Email] Confirmation sent to {user_email} for complaint {complaint_number}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send: {e}")
        return False



def send_agency_notification(agency_email, complaint_number, user_name, complaint_details):
    subject = f"🚨 SwachX: New Complaint Assigned [{complaint_number}]"

    lat = complaint_details.get('latitude')
    lng = complaint_details.get('longitude')
    map_link = f"<a href='https://www.google.com/maps?q={lat},{lng}' style='color: #2563eb; text-decoration: none; font-weight: bold;'>📍 View on Map</a>" if lat and lng else "No GPS data"
    
    html_body = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🚨 Action Required</h1>
            <p style="color: #94a3b8; margin-top: 5px; font-size: 14px; margin-bottom: 0;">New Complaint Assigned</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #334155; font-size: 16px; margin-top: 0;">Hello,</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.5;">A new waste complaint has been logged in your jurisdiction and assigned to your agency.</p>
            
            <div style="background-color: #f1f5f9; padding: 16px; margin: 24px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">Complaint Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; width: 35%;"><strong>ID:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 16px; color: #0f172a; word-break: break-all;">{complaint_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Reported By:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{user_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Waste Type:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #b91c1c; font-weight: bold;">{complaint_details.get('wasteType', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Location:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Pincode {complaint_details.get('pincode', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Map Link:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{map_link}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>Description:</strong></td>
                        <td style="padding: 8px 0; word-break: break-word;">{complaint_details.get('description', 'N/A')}</td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Open SwachX Dashboard</a>
            </div>
        </div>
    </div>
    """

    try:
        msg = Message(
            subject=subject,
            recipients=[agency_email],
            html=html_body
        )
        mail.send(msg)
        print(f"[Email] Agency notified: {agency_email}")
        return True
    except Exception as e:
        print(f"[Email] Agency email failed: {e}")
        return False

def send_staff_assignment_notification(staff_email, complaint_number, user_name, complaint_details):
    subject = f"🔔 New Waste Complaint Assigned: {complaint_number}"
    html_body = f"""
    <h3>New Complaint Assigned to You</h3>
    <p><strong>Complaint ID:</strong> {complaint_number}</p>
    <p><strong>Waste Type:</strong> {complaint_details.get('wasteType')}</p>
    <p><strong>Pincode:</strong> {complaint_details.get('pincode')}</p>
    <p><strong>Description:</strong> {complaint_details.get('description')}</p>
    <p>Please login to SwachX staff dashboard to verify and upload after-cleaning image.</p>
    """
    try:
        msg = Message(subject=subject, recipients=[staff_email], html=html_body)
        mail.send(msg)
        print(f"[Email] Staff assigned: {staff_email}")
        return True
    except Exception as e:
        print(f"[Email] Staff email failed: {e}")
        return False


def send_staff_warning_email(staff_email: str, complaint_id: str, hours_pending: float, reason: str):
    """Send warning email to staff for delayed complaint"""
    subject = f"⚠️ Action Required: Complaint {complaint_id} Delayed"
    body = f"""
    Dear Staff,

    Complaint {complaint_id} is pending for {hours_pending:.1f} hours.
    Reason: {reason}
    Please take immediate action to avoid escalation.

    Regards,
    SwachX System
    """
    try:
        msg = Message(subject=subject, recipients=[staff_email], body=body)
        mail.send(msg)
        print(f"[Email] Warning sent to {staff_email}")
        return True
    except Exception as e:
        print(f"[Email] Warning failed: {e}")
        return False

def send_admin_escalation_email(admin_email: str, complaint_id: str, reason: str):
    """Notify admin about escalated complaint"""
    subject = f"🚨 Escalated: Complaint {complaint_id} Needs Attention"
    body = f"""
    Dear Admin,

    Complaint {complaint_id} has been escalated due to: {reason}
    Please review and take necessary action.

    Regards,
    SwachX System
    """
    try:
        msg = Message(subject=subject, recipients=[admin_email], body=body)
        mail.send(msg)
        print(f"[Email] Escalation notification sent to {admin_email}")
        return True
    except Exception as e:
        print(f"[Email] Escalation email failed: {e}")
        return False
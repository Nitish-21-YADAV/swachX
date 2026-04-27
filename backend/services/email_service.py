from flask_mail import Message
from flask import current_app
import os
from app import mail

def send_complaint_confirmation(user_email, user_name, complaint_number, complaint_details):
    """
    Send confirmation email to the user who filed the complaint.
    """
    subject = f"♻️ WasteGuard - Complaint {complaint_number} Registered Successfully"
    
    # HTML email body
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">✅ Complaint Registered</h2>
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>Your waste complaint has been successfully registered with WasteGuard.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Complaint Number:</strong> <span style="font-family: monospace; font-size: 18px;">{complaint_number}</span></p>
            <p><strong>Waste Type:</strong> {complaint_details.get('wasteType', 'N/A')}</p>
            <p><strong>Location Pincode:</strong> {complaint_details.get('pincode', 'N/A')}</p>
            <p><strong>Agency Assigned:</strong> {complaint_details.get('agencyEmail', 'N/A')}</p>
        </div>
        
        <p>You can track the status of your complaint by logging into your WasteGuard dashboard.</p>
        <p>Thank you for helping keep our environment clean!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="color: #666; font-size: 12px;">
            This is an automated message from WasteGuard. Please do not reply to this email.
        </p>
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



def send_agency_notification(agency_email, complaint_number,user_name, complaint_details):
    subject = f"🚛 New Waste Complaint Assigned: {complaint_number}"

    html_body = f"""
    <h3>New Complaint Assigned</h3>
    <p><strong>Complaint ID:</strong> {complaint_number}</p>
    <p><strong>Waste Type:</strong> {complaint_details.get('wasteType')}</p>
    <p><strong>Pincode:</strong> {complaint_details.get('pincode')}</p>
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
    <p>Please login to WasteGuard staff dashboard to verify and upload after-cleaning image.</p>
    """
    try:
        msg = Message(subject=subject, recipients=[staff_email], html=html_body)
        mail.send(msg)
        print(f"[Email] Staff assigned: {staff_email}")
        return True
    except Exception as e:
        print(f"[Email] Staff email failed: {e}")
        return False
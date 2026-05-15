from app import create_app
from services.email_service import send_complaint_confirmation, send_agency_notification

app = create_app()

with app.app_context():
    complaint_details = {
        'wasteType': 'Plastic and Electronic Waste',
        'pincode': '400001',
        'description': 'Large pile of plastic bottles and broken electronics near the corner street.',
        'agencyEmail': 'ujjwalvandur03@gmail.com',
        'latitude': 19.0167,
        'longitude': 72.85
    }

    print("Sending user confirmation...")
    res1 = send_complaint_confirmation(
        user_email='ujjwal.vandur@grexa.ai',
        user_name='Ujjwal Vandur',
        complaint_number='TEST-COMP-12345',
        complaint_details=complaint_details
    )
    print("User email success:", res1)

    print("Sending agency notification...")
    res2 = send_agency_notification(
        agency_email='ujjwalvandur03@gmail.com',
        complaint_number='TEST-COMP-12345',
        user_name='Ujjwal Vandur',
        complaint_details=complaint_details
    )
    print("Agency email success:", res2)

    print("Done")

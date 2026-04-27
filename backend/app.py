"""
WasteGuard Flask Backend — Port 5000
Four separate MongoDB databases: authDB, complaintDB, agencyDB, verificationDB
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from dotenv import load_dotenv
from flask_mail import Mail, Message

load_dotenv()


mail = Mail() 


def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"]          = os.getenv("JWT_SECRET_KEY", "wasteguard-secret-2024")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"]  = timedelta(hours=24)

    CORS(app, resources={r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET","POST","PATCH","DELETE","OPTIONS"],
        "allow_headers": ["Content-Type","Authorization"]
    }}, supports_credentials=True)

    JWTManager(app)

    from routes.auth       import auth_bp
    from routes.complaints import complaints_bp
    from routes.admin      import admin_bp
    from routes.staff      import staff_bp
    from routes.reports    import reports_bp

    app.register_blueprint(auth_bp,       url_prefix="/api/auth")
    app.register_blueprint(complaints_bp, url_prefix="/api/complaints")
    app.register_blueprint(admin_bp,      url_prefix="/api/admin")
    app.register_blueprint(staff_bp,      url_prefix="/api/staff")
    app.register_blueprint(reports_bp,    url_prefix="/api/reports")


    # email 
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

    mail.init_app(app) 


    @app.route("/api/health")
    def health():
        return {"status": "ok", "service": "WasteGuard API v2.0"}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=6050)

# ♻️ SwatchX — Smart Waste Complaint Management System

A full-stack system for Detecting, Classifying, Reporting, Routing, Verifying and Managing waste complaints.

---

## Architecture

```
wasteguard_v2/
├── backend/          Flask API (Port 5000)
│   ├── routes/       auth, complaints, admin, staff, reports
│   ├── services/     metadata (EXIF), ssim_service
│   └── scripts/      seed_agencies.py
│
├── ai_service/       FastAPI YOLOv11 Service (Port 8000)
│   ├── routes/       detection.py
│   └── yolo_service.py
│
└── frontend/         React + Vite (Port 5173)
    └── src/
        ├── pages/    Landing, Login, Register, UserDashboard,
        │             NewComplaint, AdminDashboard, StaffDashboard, Reports
        └── components/
```

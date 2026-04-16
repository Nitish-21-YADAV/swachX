# ♻️ WasteGuard — AI Smart Waste Complaint Management System

A full-stack system for reporting, routing, verifying and managing waste complaints using YOLOv11, SSIM, and MongoDB Atlas.

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

---

## Four MongoDB Databases (same Atlas cluster)

| Database          | Collection    | Purpose                            |
|-------------------|---------------|------------------------------------|
| `authDB`          | `users`       | Citizens and Staff accounts        |
| `complaintDB`     | `complaints`  | All complaint records              |
| `agencyDB`        | `DataAgency`  | Pincode → Agency email mapping     |
| `verificationDB`  | `verifications` / `reports` | SSIM results, counters |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (free M0 tier)
- Cloudinary account (free 25GB)
- YOLOv11 model: `best.pt` trained on waste classes

---

## Setup Guide

### Step 1 — MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user with read/write permissions
3. Whitelist your IP address (or 0.0.0.0/0 for development)
4. Copy the connection string (SRV format)

The four databases (`authDB`, `complaintDB`, `agencyDB`, `verificationDB`) will be created **automatically** by PyMongo when the first document is inserted.

---

### Step 2 — Cloudinary

1. Sign up at https://cloudinary.com
2. From your Dashboard, copy:
   - Cloud name
   - API Key
   - API Secret

---

### Step 3 — Backend Setup

```bash
cd wasteguard_v2/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Mac/Linux
# venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.local  # or edit .env directly
```

Edit `backend/.env`:
```
MONGO_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET_KEY=your-long-random-secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ADMIN_EMAIL=ADMIN22@gmail.com
ADMIN_PASSWORD=Admin@1234
AI_SERVICE_URL=http://localhost:8000
```

```bash
# Seed agency database (run once)
python scripts/seed_agencies.py

# Start Flask API
python app.py
# Runs on http://localhost:5000
```

---

### Step 4 — AI Service Setup

```bash
cd wasteguard_v2/ai_service

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

# Copy your trained YOLOv11 model
mkdir -p models
cp /path/to/best.pt models/best.pt

# Start FastAPI
python main.py
# Runs on http://localhost:8000
```

---

### Step 5 — Frontend Setup

```bash
cd wasteguard_v2/frontend

npm install
npm run dev
# Runs on http://localhost:5173
```

---

## User Roles

### 🟢 Citizen (User)
- Register / Login
- Upload waste photo (EXIF GPS auto-extracted)
- View YOLOv11 classification + environmental impact
- Submit complaint → auto-routed to agency
- View own complaints with before/after images + SSIM score

**Login:** Register at `/register`

### 🔴 Administrator
- Login with `ADMIN22@gmail.com`
- View ALL complaints with full details
- Update status: Pending / Cleaned / Rejected
- Create staff accounts
- Generate PDF and Excel reports (last 10, last 30)

**Login:** `ADMIN22@gmail.com` / `Admin@1234`

### 🔵 Agency Staff
- Login with staff email/password (created by admin)
- See complaints assigned to their agency email
- Upload "after cleaning" photo
- SSIM auto-verifies cleanup (threshold: 0.80)

---

## API Reference

### Flask Backend (Port 5000)

```
POST /api/auth/register          Register citizen
POST /api/auth/login             Login (role: user/staff/admin)
GET  /api/auth/me                Current user info
POST /api/auth/staff/create      Admin: create staff account
GET  /api/auth/staff/list        Admin: list staff

POST /api/complaints/extract-meta  Extract EXIF + resolve agency
POST /api/complaints/submit        Submit complaint (multipart)
GET  /api/complaints/my            User's own complaints
GET  /api/complaints/my/stats      User stats
GET  /api/complaints/:id           Single complaint

GET  /api/admin/complaints         All complaints (filterable)
GET  /api/admin/stats              System-wide stats
PATCH /api/admin/complaints/:id/status  Update status

GET  /api/staff/complaints         Agency's complaints
GET  /api/staff/complaints/stats   Agency stats
POST /api/staff/complaints/:id/verify  SSIM verify with after-image

GET  /api/reports/preview          Report preview
GET  /api/reports/export/excel     Download Excel
GET  /api/reports/export/pdf       Download PDF
```

### FastAPI AI Service (Port 8000)

```
POST /api/ai/detect     YOLOv11 inference on uploaded image
GET  /api/ai/health     Health check
```

---

## SSIM Verification Logic

| SSIM Score    | Decision                |
|---------------|-------------------------|
| `< 0.80`      | ✅ Cleaned              |
| `0.62 – 0.80` | ⏳ Pending Review       |
| `> 0.80`      | ❌ Rejected (area dirty)|

*Low SSIM = images are DIFFERENT = area was cleaned*

---

## Complaint Number Format

`CMP-YYYYMMDD-XXXX` (e.g. `CMP-20240715-0001`)

Generated atomically using MongoDB's `$inc` operator on a counter document.

---

## Manual Agency Data (agencyDB.DataAgency)

The agency collection can be populated two ways:
1. **Run the seed script:** `python scripts/seed_agencies.py`
2. **Insert manually** into MongoDB via Atlas UI or mongosh:

```js
db.DataAgency.insertMany([
  { pincode: "400001", agency: "BMC", city: "Mumbai", email: "info@bmc.gov.in" },
  { pincode: "440001", agency: "NMC Nagpur", city: "Nagpur", email: "mconagpur@gov.in" },
  // add your pincodes here
])
```

---

## Troubleshooting

**AI service unavailable:** System falls back gracefully — complaints can still be submitted with "Unknown" waste type. The YOLO service is optional.

**No GPS in image:** If the image has no EXIF GPS data, the system still accepts the complaint. Pincode can be inferred from GPS coordinates via reverse geocoding (Nominatim), but manual entry can be added to the frontend form.

**SSIM fails:** Ensure `opencv-python-headless` and `scikit-image` are installed. Both images must be valid JPEG/PNG files.

**Excel/PDF export fails:** Install `openpyxl` and `reportlab`:
```bash
pip install openpyxl reportlab
```

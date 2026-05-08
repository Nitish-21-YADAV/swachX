# SwachX – Waste Management with AI Agents

SwachX is a full‑stack waste complaint system where citizens report garbage, staff verify cleaning, and AI agents handle fraud detection, escalation, and infrastructure suggestions. Built with Flask, FastAPI, React, MongoDB, and Gemini 2.5 Flash.

## What works right now

- Citizen uploads waste image → AI detects items, counts them, shows bounding boxes.
- Complaint automatically assigned to staff based on pincode range.
- Staff uploads after‑cleaning image → Twin‑Vision Agent (Gemini) checks location + leftover waste → status becomes Cleaned / Pending Review / Rejected.
- Every 12 hours, an Escalation Agent scans stale pending complaints (>48h) and either warns staff or escalates to admin.
- Every Sunday night, a Predictive Agent analyses complaint trends and saves bin/resource recommendations.
- Admin dashboard shows all complaints, staff management, reports (Excel/PDF), and AI predictions.
- Emails go out for complaint confirmation, staff assignment, warning, escalation.

## Tech stack (what I used)

- **Backend** – Flask (Python 3.13), JWT, Flask‑Mail, APScheduler
- **AI service** – FastAPI, Gemini 2.5 Flash (via `google-genai` SDK)
- **Frontend** – React + Vite, Tailwind CSS (custom theme)
- **Database** – MongoDB (four databases: auth, complaints, agency, verification)
- **Image storage** – Cloudinary
- **Background tasks** – APScheduler (no need for Celery)

## Folder structure

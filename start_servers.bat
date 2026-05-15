@echo off
echo Starting SwachX Services...

:: Start Flask Backend
start "SwachX Backend (Flask)" cmd /k "cd backend && .venv\Scripts\python.exe app.py"

:: Start FastAPI AI Service
start "SwachX AI Service (FastAPI)" cmd /k "cd ai_service && .venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload"

:: Start React Frontend
start "SwachX Frontend (React)" cmd /k "cd frontend && npm run dev"

echo All services started in separate windows!

@echo off
echo ========================================
echo Starting Backend Server (FastAPI)
echo ========================================
echo.
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

@echo off
echo ========================================
echo Starting University Marks Management System
echo ========================================
echo.
echo Starting Backend Server...
start "Backend (Port 8000)" cmd /k "cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/api/docs
echo.
echo Two command windows will open - KEEP THEM OPEN!
echo Press Ctrl+C in those windows to stop the servers.
echo.
echo Waiting 10 seconds for servers to start...
timeout /t 10 /nobreak

echo.
echo Opening browser...
start http://localhost:3000
echo.
echo Done! You should see the login page now.
echo.
pause

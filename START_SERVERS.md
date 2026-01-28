# How to Start Both Servers

## You need TWO separate terminal windows!

### Terminal 1: Backend Server

```bash
cd c:\uni_incourse_webapp\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Wait for this message:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Keep this terminal open!** The backend is now running.

---

### Terminal 2: Frontend Server

Open a NEW terminal window and run:

```bash
cd c:\uni_incourse_webapp\frontend
npm run dev
```

**Wait for this message:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

**Keep this terminal open too!** The frontend is now running.

---

## Now Test Login

1. Open your browser to: **http://localhost:3000**
   - NOT file://
   - NOT the test_frontend_connection.html
   - The actual Next.js app at http://localhost:3000

2. You should see the login page

3. Enter credentials:
   - Email: `admin@university.edu`
   - Password: `admin123`

4. Open Browser DevTools (F12) and check the Console tab

5. You should see logs like:
   ```
   API Client: Attempting login to: http://localhost:8000/api/v1/auth/login
   API Client: Credentials: { email: 'admin@university.edu' }
   API Client: Login successful
   ```

6. If successful, you'll be redirected to `/dashboard/super-admin`

---

## Troubleshooting

### "Port 3000 is already in use"
Another process is using port 3000. Kill it or use a different port:
```bash
npm run dev -- -p 3001
```
Then update frontend/.env.local if needed.

### "Port 8000 is already in use"
Backend is already running in another terminal. Use that one or kill the existing process.

### Still getting "Login failed"
1. Check that BOTH terminals are running
2. Check browser console for detailed error logs
3. Check Network tab in DevTools to see the actual request/response

---

## Quick Start Script (Alternative)

If you want to start both at once, you can use:

### Windows (PowerShell):
```powershell
# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\uni_incourse_webapp\backend; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Start frontend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\uni_incourse_webapp\frontend; npm run dev"
```

This will open two separate PowerShell windows with both servers running.

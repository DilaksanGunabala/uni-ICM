# Login Issue Debugging Steps

## Problem
Frontend shows "Login failed. Please check your credentials." error

## What We Know
- ✅ Backend API is running and responding correctly (tested with curl)
- ✅ Database has test users with correct credentials
- ✅ CORS is configured to allow http://localhost:3000
- ❌ Frontend cannot successfully login

## Debugging Steps

### Step 1: Verify Both Servers are Running

1. **Backend Server** - Should be running on http://localhost:8000
   ```bash
   cd c:\uni_incourse_webapp\backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - Look for: "Uvicorn running on http://0.0.0.0:8000"

2. **Frontend Server** - Should be running on http://localhost:3000
   ```bash
   cd c:\uni_incourse_webapp\frontend
   npm run dev
   ```
   - Look for: "Ready on http://localhost:3000"

### Step 2: Test Backend Directly (Standalone Test)

1. Open the test file in your browser:
   ```
   file:///c:/uni_incourse_webapp/test_frontend_connection.html
   ```

2. Click "Test Login" button

3. **Expected result**: Should show "Login successful!" with user details

4. **If it fails**:
   - Error message will indicate the issue (CORS, connection refused, etc.)
   - Check backend terminal for errors
   - Verify backend is actually running

### Step 3: Check Browser Console (Frontend)

1. Open http://localhost:3000 in your browser

2. Open Developer Tools (F12)

3. Go to Console tab

4. Try to login with `admin@university.edu` / `admin123`

5. Look for these log messages (we just added them):
   ```
   API Client: Attempting login to: http://localhost:8000/api/v1/auth/login
   API Client: Credentials: { email: 'admin@university.edu' }
   ```

6. **Check for errors**:
   - `ERR_CONNECTION_REFUSED` → Backend not running
   - `CORS error` → CORS misconfiguration
   - `Network error` → Check if backend port is correct
   - `401 Unauthorized` → Password issue (unlikely, we tested backend)

### Step 4: Check Network Tab

1. In Browser DevTools, go to "Network" tab

2. Try to login again

3. Look for the POST request to `/api/v1/auth/login`

4. Click on it and check:
   - **Request URL**: Should be `http://localhost:8000/api/v1/auth/login`
   - **Status Code**: Should be 200 (if backend working)
   - **Request Headers**: Should have `Content-Type: application/json`
   - **Request Payload**: Should show your email and password
   - **Response**: Should show access_token and user data

### Step 5: Common Issues and Solutions

#### Issue 1: Backend Not Running
**Symptom**: `ERR_CONNECTION_REFUSED` or `Failed to fetch`
**Solution**: Start the backend server

#### Issue 2: Wrong Port
**Symptom**: Connection timeout or refused
**Solution**: Verify backend is on port 8000, frontend on port 3000

#### Issue 3: CORS Error
**Symptom**: Browser console shows CORS policy error
**Solution**:
- Check backend .env has: `ALLOWED_ORIGINS=http://localhost:3000`
- Restart backend server after .env changes

#### Issue 4: Frontend Environment Variable
**Symptom**: Frontend trying to connect to wrong URL
**Solution**:
- Check `c:\uni_incourse_webapp\frontend\.env.local` has:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000
  ```
- Restart frontend server after .env.local changes

#### Issue 5: Password Hash Mismatch
**Symptom**: Backend returns 401 even though credentials are correct
**Solution**: Re-seed the database with properly hashed passwords

## Test Commands

### Test Backend Directly
```bash
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@university.edu\",\"password\":\"admin123\"}"
```

**Expected response**: JSON with access_token and user object

### Check Backend Health
```bash
curl http://localhost:8000/health
```

**Expected response**: `{"status":"healthy","service":"uni-marks-api"}`

### Test All User Accounts
```bash
# Admin
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@university.edu\",\"password\":\"admin123\"}"

# HOD
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"hod.cse@university.edu\",\"password\":\"admin123\"}"

# Lecturer
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"lecturer1@university.edu\",\"password\":\"admin123\"}"

# Student
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"student1@university.edu\",\"password\":\"admin123\"}"
```

## Next Steps After Identifying the Issue

1. **If it's a CORS issue**:
   - Update backend/.env ALLOWED_ORIGINS
   - Restart backend

2. **If it's a connection issue**:
   - Verify both servers are running
   - Check firewall settings
   - Try 127.0.0.1 instead of localhost

3. **If it's a frontend config issue**:
   - Update frontend/.env.local
   - Restart frontend (Ctrl+C and npm run dev again)

4. **If it's a password issue**:
   - We can re-run the database seeder script

## Report Your Findings

Please run through these steps and let me know:
1. What shows up in the browser console when you try to login?
2. What does the Network tab show for the login request?
3. What does the standalone test (test_frontend_connection.html) show?
4. Any error messages from backend or frontend terminals?

This will help me pinpoint the exact issue!

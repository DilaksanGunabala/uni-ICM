import requests
import json

# Test login endpoint
url = "http://localhost:8000/api/v1/auth/login"
payload = {
    "email": "admin@university.edu",
    "password": "admin123"
}

print(f"Testing login at: {url}")
print(f"Credentials: {payload}")
print("-" * 50)

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body:")
    print(json.dumps(response.json(), indent=2))
except requests.exceptions.ConnectionError as e:
    print(f"ERROR: Could not connect to backend server")
    print(f"Make sure the backend is running at http://localhost:8000")
    print(f"Error details: {e}")
except Exception as e:
    print(f"ERROR: {e}")
    if hasattr(e, 'response'):
        print(f"Response: {e.response.text}")

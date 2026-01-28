"""Quick test to verify password hashing"""
from app.core.security import verify_password, get_password_hash

# The hash from the database
db_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5f9.KN.4xpW7e"
test_password = "admin123"

print("Testing password verification...")
print(f"Password: {test_password}")
print(f"Hash: {db_hash[:20]}...")

result = verify_password(test_password, db_hash)
print(f"Verification result: {result}")

if not result:
    print("\nGenerating new hash for admin123...")
    new_hash = get_password_hash(test_password)
    print(f"New hash: {new_hash}")
    print("\nUpdate SQL:")
    print(f"UPDATE users SET password_hash = '{new_hash}' WHERE email = 'admin@university.edu';")

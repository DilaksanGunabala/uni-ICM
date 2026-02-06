"""
Script to delete a user by email.
Run from backend directory: venv\Scripts\python.exe delete_user_by_email.py <email>
"""

import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.database import sync_engine

def delete_user(email: str):
    """Delete a user by email."""
    with sync_engine.connect() as conn:
        # Check if user exists
        result = conn.execute(text("SELECT id, email, first_name, last_name FROM users WHERE email = :email"), {"email": email})
        user = result.fetchone()

        if not user:
            print(f"No user found with email: {email}")
            return

        print(f"Found user: {user[2]} {user[3]} ({user[1]})")

        # Delete the user
        conn.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
        conn.commit()

        print(f"User deleted successfully. You can now register again with this email.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python delete_user_by_email.py <email>")
        sys.exit(1)

    email = sys.argv[1]
    delete_user(email)

"""Update all user passwords in database"""
import pymysql
from app.core.security import get_password_hash
from app.config import settings

# Parse DATABASE_URL to get connection details
# Format: mysql+pymysql://user:pass@host:port/dbname
db_url = settings.DATABASE_URL.replace("mysql+pymysql://", "")
auth_part, host_part = db_url.split("@")
username, password = auth_part.split(":")
host_db = host_part.split("/")
host_port = host_db[0].split(":")
host = host_port[0]
port = int(host_port[1]) if len(host_port) > 1 else 3306
database = host_db[1]

# URL-decode password if needed (handle %40 for @)
password = password.replace("%40", "@")

print(f"Connecting to database: {database}@{host}:{port}")

# Connect to database
conn = pymysql.connect(
    host=host,
    port=port,
    user=username,
    password=password,
    database=database
)

cursor = conn.cursor()

# Update all users with password "admin123"
users = [
    ("admin@university.edu", "admin123"),
    ("hod.cse@university.edu", "admin123"),
    ("lecturer1@university.edu", "admin123"),
    ("student1@university.edu", "admin123"),
    ("student2@university.edu", "admin123"),
]

print("\nUpdating passwords...")
for email, plain_password in users:
    hashed = get_password_hash(plain_password)
    cursor.execute(
        "UPDATE users SET password_hash = %s WHERE email = %s",
        (hashed, email)
    )
    print(f"[OK] Updated: {email}")

conn.commit()
cursor.close()
conn.close()

print("\n[SUCCESS] All passwords updated successfully!")
print("All users now have password: admin123")

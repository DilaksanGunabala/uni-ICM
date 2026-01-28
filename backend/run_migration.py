"""
Quick script to add avatar_url column to users table.
Run this once: python run_migration.py
"""
from app.database import engine
from sqlalchemy import text

def add_avatar_column():
    with engine.connect() as conn:
        try:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
            """))

            if result.fetchone():
                print("Column 'avatar_url' already exists in users table.")
                return

            # Add the column
            conn.execute(text("""
                ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER student_id
            """))
            conn.commit()
            print("Successfully added 'avatar_url' column to users table!")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_avatar_column()

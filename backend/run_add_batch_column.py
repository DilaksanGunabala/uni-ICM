"""
Migration script to add batch column to users table.
Run from backend directory: venv\Scripts\python.exe run_add_batch_column.py
"""

import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.database import sync_engine

def run_migration():
    """Add batch column to users table."""

    with sync_engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT COUNT(*) as cnt
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'users'
            AND column_name = 'batch'
        """))
        row = result.fetchone()

        if row[0] > 0:
            print("Column 'batch' already exists in users table.")
            return

        # Add the batch column
        print("Adding 'batch' column to users table...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN batch INT NULL AFTER student_id
        """))

        # Add index for better query performance
        print("Adding index on batch column...")
        conn.execute(text("""
            CREATE INDEX ix_users_batch ON users (batch)
        """))

        conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()

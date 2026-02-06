"""
Migration script to add semester_type column to subjects table.
- Adds semester_type ENUM('GENERAL','SPECIAL','GES') column
- Backfills from existing semester values (1-3 -> GENERAL, 4-8 -> SPECIAL)
- Makes semester column nullable (for GES subjects which have no semester number)
- Adds index on semester_type

Run this once: python run_semester_type_migration.py
"""
from app.database import engine
from sqlalchemy import text


def migrate_semester_type():
    with engine.connect() as conn:
        try:
            # Step 1: Check if semester_type column already exists
            result = conn.execute(text("""
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'subjects' AND COLUMN_NAME = 'semester_type'
            """))

            if result.fetchone():
                print("Column 'semester_type' already exists in subjects table. Skipping.")
                return

            print("Step 1/5: Adding semester_type column with DEFAULT 'GENERAL'...")
            conn.execute(text("""
                ALTER TABLE subjects
                ADD COLUMN semester_type ENUM('GENERAL','SPECIAL','GES') NOT NULL DEFAULT 'GENERAL'
                AFTER coordinator_id
            """))
            conn.commit()
            print("  Done.")

            print("Step 2/5: Backfilling semester_type from existing semester values...")
            # Semesters 1-3 -> GENERAL (already default)
            # Semesters 4-8 -> SPECIAL
            result = conn.execute(text("""
                UPDATE subjects SET semester_type = 'SPECIAL'
                WHERE semester IN (4, 5, 6, 7, 8)
            """))
            conn.commit()
            print(f"  Updated {result.rowcount} rows to SPECIAL.")

            print("Step 3/5: Removing DEFAULT from semester_type column...")
            conn.execute(text("""
                ALTER TABLE subjects
                MODIFY COLUMN semester_type ENUM('GENERAL','SPECIAL','GES') NOT NULL
            """))
            conn.commit()
            print("  Done.")

            print("Step 4/5: Making semester column nullable (for GES subjects)...")
            conn.execute(text("""
                ALTER TABLE subjects
                MODIFY COLUMN semester INT NULL
            """))
            conn.commit()
            print("  Done.")

            print("Step 5/5: Adding index on semester_type...")
            conn.execute(text("""
                CREATE INDEX ix_subjects_semester_type ON subjects (semester_type)
            """))
            conn.commit()
            print("  Done.")

            print("\nMigration completed successfully!")
            print("  - semester_type column added (GENERAL/SPECIAL/GES)")
            print("  - Existing data backfilled based on semester numbers")
            print("  - semester column is now nullable (for GES)")

        except Exception as e:
            print(f"Error during migration: {e}")
            raise


if __name__ == "__main__":
    migrate_semester_type()

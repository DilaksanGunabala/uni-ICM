"""
Database setup script for University Marks Management System
"""
import subprocess
import sys
import getpass

def run_mysql_command(password, command, database=None):
    """Run a MySQL command"""
    cmd = ['mysql', '-u', 'root', f'-p{password}']
    if database:
        cmd.append(database)
    cmd.extend(['-e', command])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def import_schema(password, schema_file):
    """Import SQL schema file"""
    cmd = ['mysql', '-u', 'root', f'-p{password}', 'uni_marks_db']

    try:
        with open(schema_file, 'r', encoding='utf-8') as f:
            result = subprocess.run(
                cmd,
                stdin=f,
                capture_output=True,
                text=True,
                check=True
            )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr
    except FileNotFoundError:
        return False, f"Schema file not found: {schema_file}"

def main():
    print("=" * 60)
    print("University Marks Management System - Database Setup")
    print("=" * 60)
    print()

    # Get MySQL password
    password = getpass.getpass("Enter MySQL root password: ")

    if not password:
        print("Error: Password cannot be empty")
        sys.exit(1)

    print("\nStep 1: Testing MySQL connection...")
    success, output = run_mysql_command(password, "SELECT 'Connection successful!' as status;")

    if not success:
        print(f"❌ Failed to connect to MySQL:")
        print(output)
        print("\nPlease check your MySQL password and try again.")
        sys.exit(1)

    print("✅ MySQL connection successful!")

    # Create database
    print("\nStep 2: Creating database 'uni_marks_db'...")
    success, output = run_mysql_command(
        password,
        "CREATE DATABASE IF NOT EXISTS uni_marks_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    )

    if not success:
        print(f"❌ Failed to create database:")
        print(output)
        sys.exit(1)

    print("✅ Database created successfully!")

    # Import schema
    print("\nStep 3: Importing schema and sample data...")
    success, output = import_schema(password, 'schema.sql')

    if not success:
        print(f"❌ Failed to import schema:")
        print(output)
        sys.exit(1)

    print("✅ Schema imported successfully!")

    # Update .env file
    print("\nStep 4: Updating .env file...")
    try:
        with open('.env', 'r') as f:
            env_content = f.read()

        # Update database URL with the correct password
        import re
        env_content = re.sub(
            r'DATABASE_URL=mysql\+pymysql://root:[^@]*@',
            f'DATABASE_URL=mysql+pymysql://root:{password}@',
            env_content
        )

        with open('.env', 'w') as f:
            f.write(env_content)

        print("✅ .env file updated!")
    except Exception as e:
        print(f"⚠️  Warning: Could not update .env file: {e}")
        print(f"Please manually update DATABASE_URL in .env with password: {password}")

    print("\n" + "=" * 60)
    print("✅ Database setup completed successfully!")
    print("=" * 60)
    print("\nDatabase: uni_marks_db")
    print("\nSample users created (all passwords: admin123):")
    print("  • Super Admin: admin@university.edu")
    print("  • HOD: hod.cse@university.edu")
    print("  • Lecturer: lecturer1@university.edu")
    print("  • Student 1: student1@university.edu")
    print("  • Student 2: student2@university.edu")
    print("\nNext steps:")
    print("  1. Install dependencies: pip install -r requirements.txt")
    print("  2. Run server: uvicorn app.main:app --reload")
    print("  3. Open docs: http://localhost:8000/api/docs")
    print()

if __name__ == "__main__":
    main()

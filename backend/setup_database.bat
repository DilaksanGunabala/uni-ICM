@echo off
echo ====================================
echo University Marks System - Database Setup
echo ====================================
echo.

set /p MYSQL_PASSWORD="Enter MySQL root password: "

echo.
echo Creating database...
mysql -u root -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS uni_marks_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create database. Please check your password and try again.
    pause
    exit /b 1
)

echo Database created successfully!
echo.
echo Importing schema and sample data...
mysql -u root -p%MYSQL_PASSWORD% uni_marks_db < schema.sql

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to import schema.
    pause
    exit /b 1
)

echo.
echo ====================================
echo Database setup completed successfully!
echo ====================================
echo.
echo Database: uni_marks_db
echo Sample users created:
echo   - Super Admin: admin@university.edu (password: admin123)
echo   - HOD: hod.cse@university.edu (password: admin123)
echo   - Lecturer: lecturer1@university.edu (password: admin123)
echo   - Student 1: student1@university.edu (password: admin123)
echo   - Student 2: student2@university.edu (password: admin123)
echo.
pause

# University In-Course Marks Management System - Backend

FastAPI backend for managing university in-course assessment marks with role-based access control.

## Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: 4 roles with specific permissions
  - Super Admin: Full system access
  - HOD: Department-level management
  - Lecturer: Marks entry and management
  - Student: View own marks
- **Marks Approval Workflow**: Lecturer → HOD → Student
- **Audit Logging**: Track all mark modifications
- **Pagination & Filtering**: Efficient data retrieval

## Tech Stack

- **Framework**: FastAPI 0.109.0
- **Database**: MySQL with SQLAlchemy ORM
- **Authentication**: JWT with python-jose
- **Password Hashing**: bcrypt via passlib
- **Validation**: Pydantic schemas
- **Migrations**: Alembic (planned)

## Project Structure

```
backend/
├── app/
│   ├── api/v1/          # API route handlers
│   │   ├── auth.py      # Authentication endpoints
│   │   └── marks.py     # Marks management endpoints
│   ├── core/            # Core utilities
│   │   ├── constants.py # Enums and constants
│   │   ├── permissions.py # RBAC definitions
│   │   └── security.py  # JWT & password hashing
│   ├── middleware/      # Request middleware
│   │   ├── auth.py      # JWT authentication
│   │   ├── rbac.py      # Permission checking
│   │   └── audit.py     # Audit helpers
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   │   ├── audit_service.py # Audit logging
│   │   └── mark_service.py  # Marks workflow
│   ├── utils/           # Utility functions
│   │   ├── pagination.py # Pagination helper
│   │   └── filters.py    # Query filters
│   ├── config.py        # Configuration
│   ├── database.py      # Database connection
│   └── main.py          # FastAPI application
├── schema.sql           # MySQL database schema
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Database

1. Create MySQL database:
```sql
CREATE DATABASE uni_marks_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Import schema:
```bash
mysql -u root -p uni_marks_db < schema.sql
```

This will create all tables and seed initial data including:
- Default roles (SUPER_ADMIN, HOD, LECTURER, STUDENT)
- Sample departments
- Test users (admin, HOD, lecturer, students)

### 3. Configure Environment

Update `.env` file with your settings:

```env
# Database
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/uni_marks_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Generate a secure secret key:
```bash
openssl rand -hex 32
```

### 4. Run Development Server

```bash
# From backend directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or run directly:
```bash
python -m app.main
```

The API will be available at:
- API Base: http://localhost:8000
- Interactive Docs: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Default Credentials

All test users have password: `admin123`

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@university.edu | admin123 |
| HOD | hod.cse@university.edu | admin123 |
| Lecturer | lecturer1@university.edu | admin123 |
| Student 1 | student1@university.edu | admin123 |
| Student 2 | student2@university.edu | admin123 |

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info

### Marks Management

- `POST /api/v1/marks` - Create marks (Lecturer)
- `GET /api/v1/marks` - List marks with filters
- `GET /api/v1/marks/{id}` - Get specific mark
- `PUT /api/v1/marks/{id}` - Update marks (Lecturer, if pending/rejected)
- `PUT /api/v1/marks/{id}/approve` - Approve marks (HOD)
- `PUT /api/v1/marks/{id}/reject` - Reject marks (HOD)
- `DELETE /api/v1/marks/{id}` - Delete marks (Lecturer, if pending/rejected)

### Health

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /api/v1` - API info

## Marks Workflow

1. **Lecturer submits marks** → Status: PENDING
2. **HOD reviews**:
   - Approve → Status: APPROVED (visible to students)
   - Reject → Status: REJECTED (lecturer can re-edit)
3. **Approved marks** are read-only

## RBAC Permissions

### Super Admin
- Full system access
- Manage users, departments, subjects
- View all marks and audit logs

### HOD (Head of Department)
- View all marks in department
- Approve/reject marks
- Generate department reports

### Lecturer
- Submit marks for assigned subjects
- Edit marks (only if pending/rejected)
- Delete marks (only if pending/rejected)

### Student
- View own approved marks
- Download own reports

## Security Features

- Password hashing with bcrypt (12+ rounds)
- JWT tokens with 30-minute expiration
- Role-based access control on all endpoints
- Audit logging for all mark modifications
- CORS protection

## Development

### Run Tests

```bash
pytest
```

### Code Style

```bash
# Format code
black app/

# Check linting
flake8 app/
```

## Troubleshooting

### Database Connection Error

- Verify MySQL is running
- Check DATABASE_URL in .env
- Ensure database exists and schema is imported

### Import Errors

- Install all dependencies: `pip install -r requirements.txt`
- Verify Python version: Python 3.11+

### CORS Errors

- Add frontend URL to ALLOWED_ORIGINS in .env
- Restart backend server after changes

## Next Steps

- [ ] Add remaining CRUD endpoints (users, departments, subjects, etc.)
- [ ] Implement report generation (PDF/Excel)
- [ ] Add Alembic migrations
- [ ] Add comprehensive tests
- [ ] Add bulk marks upload
- [ ] Implement email notifications

## License

MIT

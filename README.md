# University In-Course Marks Management System

A comprehensive web application for managing university in-course assessment marks with role-based access control and a marks approval workflow.

## System Overview

This system provides a secure platform for managing in-course assessments with four distinct user roles:
- **Super Admin**: Full system control and user management
- **HOD (Head of Department)**: Marks approval and department oversight
- **Lecturer**: Marks entry and assessment management
- **Student**: View approved marks and generate reports

## Tech Stack

### Backend
- **Framework**: FastAPI 0.109.0
- **Database**: MySQL 8.0
- **ORM**: SQLAlchemy 2.0.25
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt 4.3.0
- **Validation**: Pydantic 2.5.3

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.4.5
- **Styling**: Tailwind CSS 3.4.3
- **HTTP Client**: Axios 1.6.8
- **State**: React Context API
- **Notifications**: React Hot Toast

## Project Structure

```
uni_incourse_webapp/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # API route handlers
│   │   │   ├── auth.py       # Authentication endpoints
│   │   │   ├── users.py      # User management
│   │   │   ├── departments.py
│   │   │   ├── subjects.py
│   │   │   ├── enrollments.py
│   │   │   ├── assessments.py
│   │   │   ├── marks.py      # Marks CRUD & approval
│   │   │   └── audit_logs.py
│   │   ├── core/             # Core functionality
│   │   │   ├── constants.py  # Enums and constants
│   │   │   ├── security.py   # JWT & password hashing
│   │   │   └── permissions.py # RBAC definitions
│   │   ├── middleware/       # Request middleware
│   │   │   ├── auth.py       # JWT authentication
│   │   │   ├── rbac.py       # Permission checking
│   │   │   └── audit.py      # Request metadata
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic
│   │   │   ├── mark_service.py    # Marks workflow
│   │   │   └── audit_service.py   # Audit logging
│   │   ├── utils/            # Helper utilities
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # DB connection
│   │   └── main.py           # FastAPI app
│   ├── schema.sql            # Database schema + seed data
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables
│
└── frontend/
    ├── src/
    │   ├── app/              # Next.js App Router
    │   │   ├── dashboard/    # Role-based dashboards
    │   │   ├── login/        # Login page
    │   │   └── layout.tsx    # Root layout
    │   ├── components/
    │   │   ├── auth/         # Auth components
    │   │   ├── common/       # Reusable UI
    │   │   └── layout/       # Layout components
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── lib/
    │   │   ├── api.ts        # API client
    │   │   └── utils.ts      # Utilities
    │   └── types/
    │       └── index.ts      # TypeScript types
    ├── package.json
    ├── tailwind.config.ts
    └── .env.local
```

## Key Features

### Authentication & Authorization
- JWT-based authentication with 30-minute token expiration
- Bcrypt password hashing (12 rounds)
- Role-based access control (RBAC) on all endpoints
- Permission-level granularity

### Marks Approval Workflow
1. **Lecturer submits marks** → Status: PENDING
2. **HOD reviews**:
   - Approve → Status: APPROVED (visible to students)
   - Reject → Status: REJECTED (lecturer can re-edit)
3. **Approved marks are read-only**

### Audit Logging
- All mark modifications tracked
- Records: who, when, what changed (old/new values)
- IP address and user agent captured
- Viewable by Super Admin

### Database Schema
8 core tables with proper foreign key relationships:
- `roles` (4 roles: SUPER_ADMIN, HOD, LECTURER, STUDENT)
- `departments` (with HOD assignment)
- `users` (linked to role and department)
- `subjects` (linked to department)
- `subject_assignments` (lecturer-to-subject mapping)
- `enrollments` (student-to-subject mapping with status)
- `assessments` (assessment types per subject)
- `marks` (with approval workflow)
- `audit_logs` (complete modification history)

### API Features
- RESTful API design
- Comprehensive CRUD operations
- Pagination on all list endpoints (default 20 per page)
- Search and filtering capabilities
- Input validation with Pydantic
- Descriptive error messages
- OpenAPI documentation at `/api/docs`

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd c:\uni_incourse_webapp\backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**

   Edit `backend/.env`:
   ```
   DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/uni_marks_db
   SECRET_KEY=your-secret-key-here
   ```

5. **Set up database:**
   ```bash
   mysql -u root -p < schema.sql
   ```

6. **Run the server:**
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Backend API: http://localhost:8000
   API Docs: http://localhost:8000/api/docs

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd c:\uni_incourse_webapp\frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**

   The `.env.local` file is already configured:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Frontend: http://localhost:3000

## Test Accounts

All test accounts use password: **admin123**

| Role | Email | Dashboard |
|------|-------|-----------|
| Super Admin | admin@university.edu | /dashboard/super-admin |
| HOD | hod.cse@university.edu | /dashboard/hod |
| Lecturer | lecturer1@university.edu | /dashboard/lecturer |
| Student | student1@university.edu | /dashboard/student |

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login (returns JWT token)

### Users (Super Admin only)
- `GET /api/v1/users/` - List users with filters
- `GET /api/v1/users/{id}` - Get user details
- `POST /api/v1/users/` - Create user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Departments
- `GET /api/v1/departments/` - List departments
- `POST /api/v1/departments/` - Create department (Super Admin)
- `PUT /api/v1/departments/{id}` - Update department (Super Admin)
- `DELETE /api/v1/departments/{id}` - Delete department (Super Admin)

### Subjects
- `GET /api/v1/subjects/` - List subjects
- `POST /api/v1/subjects/` - Create subject (Super Admin)
- `GET /api/v1/subjects/my/assigned` - Lecturer's assigned subjects
- `POST /api/v1/subjects/{id}/lecturers` - Assign lecturer to subject

### Enrollments
- `GET /api/v1/enrollments/` - List enrollments (Admin, HOD)
- `POST /api/v1/enrollments/` - Enroll student (Admin)
- `GET /api/v1/enrollments/my/enrollments` - Student's enrollments
- `POST /api/v1/enrollments/bulk` - Bulk enrollment (Admin)

### Assessments
- `GET /api/v1/assessments/` - List assessments
- `POST /api/v1/assessments/` - Create assessment (Admin, HOD, Lecturer)
- `GET /api/v1/assessments/subject/{id}/list` - Assessments by subject
- `GET /api/v1/assessments/my/assessments` - Lecturer's assessments

### Marks
- `GET /api/v1/marks/` - List marks (role-filtered)
- `POST /api/v1/marks/` - Submit marks (Lecturer)
- `PUT /api/v1/marks/{id}` - Edit marks (Lecturer, only if PENDING/REJECTED)
- `PUT /api/v1/marks/{id}/approve` - Approve marks (HOD)
- `PUT /api/v1/marks/{id}/reject` - Reject marks (HOD)
- `GET /api/v1/marks/my/marks` - Student's marks (only APPROVED)
- `DELETE /api/v1/marks/{id}` - Delete marks (Lecturer)

### Audit Logs (Super Admin only)
- `GET /api/v1/audit-logs/` - List audit logs with filters
- `GET /api/v1/audit-logs/record/{table}/{id}` - Audit trail for specific record
- `GET /api/v1/audit-logs/user/{id}/actions` - User's action history
- `GET /api/v1/audit-logs/stats/summary` - Audit statistics

## Permissions

| Permission | Super Admin | HOD | Lecturer | Student |
|------------|-------------|-----|----------|---------|
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| Manage Departments | ✓ | ✗ | ✗ | ✗ |
| Manage Subjects | ✓ | ✗ | ✗ | ✗ |
| Manage Enrollments | ✓ | ✗ | ✗ | ✗ |
| Manage Assessments | ✓ | ✓ | ✓* | ✗ |
| Enter Marks | ✓ | ✗ | ✓ | ✗ |
| Edit Marks | ✓ | ✗ | ✓* | ✗ |
| Approve Marks | ✓ | ✓ | ✗ | ✗ |
| Reject Marks | ✓ | ✓ | ✗ | ✗ |
| View All Marks | ✓ | ✓** | ✓** | ✗ |
| View Own Marks | ✓ | ✓ | ✓ | ✓ |
| View Audit Logs | ✓ | ✗ | ✗ | ✗ |

\* Only for subjects they teach
\** Only for their department/subjects

## Security Features

- JWT authentication with expiring tokens
- Bcrypt password hashing (cost factor 12)
- RBAC at endpoint level
- SQL injection prevention (parameterized queries)
- CORS protection
- Input validation
- Audit logging of all modifications
- Password reset disabled (admin-managed)

## Error Handling

The API returns consistent error responses:

```json
{
  "detail": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

## Development Notes

### Backend
- FastAPI auto-generates OpenAPI docs at `/api/docs`
- All database operations use SQLAlchemy ORM
- Business logic separated into service layer
- Middleware handles authentication and audit logging
- Comprehensive type hints throughout

### Frontend
- Server-side rendering with Next.js App Router
- Client-side state management with React Context
- Automatic JWT token management
- Toast notifications for user feedback
- Responsive design with Tailwind CSS
- TypeScript for type safety

## Testing

### Backend Testing
```bash
cd backend
# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"admin123"}'

# Use returned token for authenticated requests
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/v1/users/
```

### Frontend Testing
1. Open http://localhost:3000
2. Login with test credentials
3. Navigate through role-specific dashboards
4. Test authentication persistence (refresh page)

## Production Deployment

### Backend
1. Set `DEBUG=False` in .env
2. Use production-grade secret key
3. Configure production database
4. Set up reverse proxy (nginx)
5. Use gunicorn or uvicorn with workers
6. Enable HTTPS

### Frontend
1. Run `npm run build`
2. Set `NODE_ENV=production`
3. Use `npm start` or deploy to Vercel
4. Configure production API URL
5. Enable HTTPS

## Future Enhancements

- [ ] Email notifications for marks approval
- [ ] Report generation (PDF/Excel)
- [ ] Bulk marks import (CSV)
- [ ] Grade calculation engine
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive improvements
- [ ] Dark mode support
- [ ] Password reset functionality
- [ ] Two-factor authentication

## Support & Documentation

- Backend API Documentation: http://localhost:8000/api/docs
- Backend README: [backend/README.md](backend/README.md)
- Frontend README: [frontend/README.md](frontend/README.md)

## License

Proprietary - University In-Course Marks Management System

---

**Built with FastAPI, Next.js, MySQL, TypeScript, and Tailwind CSS**

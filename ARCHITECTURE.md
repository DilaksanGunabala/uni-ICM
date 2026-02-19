# University In-Course Marks Management System - Architecture Document

## 1. System Overview

A full-stack web application for managing university in-course marks with role-based access, approval workflows, and audit logging.

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Frontend  | React 18 + TypeScript + Vite + Tailwind CSS  |
| Backend   | FastAPI (Python) + SQLAlchemy 2.0 (Async)    |
| Database  | MySQL (asyncmy driver)                       |
| Auth      | JWT Bearer Tokens (HS256)                    |
| UI Kit    | shadcn/ui (Radix UI primitives)              |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Pages   │  │Components│  │ Contexts  │  │   API Layer   │  │
│  │          │  │ (shadcn) │  │(Auth/Theme)│  │  (Axios)      │  │
│  └────┬─────┘  └──────────┘  └─────┬─────┘  └───────┬───────┘  │
│       │                            │                 │          │
│       └────────────────────────────┴─────────────────┘          │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP (REST API)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI)                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Middleware Layer                        │   │
│  │   ┌──────────┐   ┌──────────┐   ┌────────────────┐      │   │
│  │   │   Auth   │   │   RBAC   │   │  Audit Logger  │      │   │
│  │   │  (JWT)   │   │(Permissions)│ │  (IP/UA)       │      │   │
│  │   └──────────┘   └──────────┘   └────────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Routers (v1)                        │   │
│  │  auth │ users │ departments │ subjects │ enrollments      │   │
│  │  assessments │ marks │ audit-logs                         │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │                   Services Layer                          │   │
│  │          MarkService  │  AuditService                     │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │               Schemas (Pydantic Validation)               │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │                Models (SQLAlchemy ORM)                     │   │
│  │  User │ Role │ Department │ Subject │ Enrollment          │   │
│  │  Assessment │ Mark │ AuditLog │ SubjectAssignment         │   │
│  └───────────────────────────┬──────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    MySQL Database    │
                    │  (asyncmy driver)   │
                    └─────────────────────┘
```

---

## 3. Database Schema (ER Diagram)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│    roles     │       │  departments │       │  subjects        │
├──────────────┤       ├──────────────┤       ├──────────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)          │
│ name         │◄──┐   │ code         │   ┌──►│ code             │
│ description  │   │   │ name         │   │   │ name             │
└──────────────┘   │   │ hod_id (FK)──┼───┼─┐ │ department_id(FK)│
                   │   │ is_active    │   │ │ │ coordinator_id   │
                   │   └──────────────┘   │ │ │ semester_type    │
                   │          ▲           │ │ │ semester         │
                   │          │           │ │ │ credits          │
              ┌────┴──────────┴───────┐   │ │ │ is_active        │
              │       users           │   │ │ └──────────────────┘
              ├───────────────────────┤   │ │          │
              │ id (PK)              │   │ │          │
              │ email                │   │ │          ▼
              │ password_hash        │   │ │ ┌──────────────────┐
              │ first_name           │   │ │ │subject_assignments│
              │ last_name            │   │ │ ├──────────────────┤
              │ employee_id          │   │ │ │ id (PK)          │
              │ student_id           │   │ │ │ subject_id (FK)  │
              │ batch                │   │ │ │ lecturer_id (FK) │
              │ avatar_url           │   │ │ │ academic_year    │
              │ role_id (FK)─────────┘   │ │ │ is_active        │
              │ department_id (FK)───────┘ │ └──────────────────┘
              │ is_active            │     │
              └──────────┬───────────┘     │ ┌──────────────────┐
                         │                 │ │  assessments     │
                         │                 │ ├──────────────────┤
                         │                 │ │ id (PK)          │
                         │                 │ │ name             │
                         ▼                 │ │ assessment_type  │
              ┌───────────────────────┐    │ │ subject_id (FK)  │
              │    enrollments        │    │ │ max_marks        │
              ├───────────────────────┤    │ │ weightage        │
              │ id (PK)              │    │ │ academic_year    │
              │ student_id (FK)      │    │ │ is_active        │
              │ subject_id (FK)──────┼────┘ └────────┬─────────┘
              │ academic_year        │               │
              │ semester             │               │
              │ status               │               │
              └──────────┬───────────┘               │
                         │                           │
                         ▼                           │
              ┌───────────────────────┐              │
              │       marks           │              │
              ├───────────────────────┤              │
              │ id (PK)              │              │
              │ enrollment_id (FK)   │              │
              │ assessment_id (FK)───┼──────────────┘
              │ marks_obtained       │
              │ is_absent            │     ┌──────────────────┐
              │ status               │     │   audit_logs     │
              │ submitted_by (FK)    │     ├──────────────────┤
              │ reviewed_by (FK)     │     │ id (PK)          │
              │ review_comments      │     │ table_name       │
              └───────────────────────┘     │ record_id        │
                                           │ action           │
                                           │ field_name       │
                                           │ old_value        │
                                           │ new_value        │
                                           │ performed_by(FK) │
                                           │ ip_address       │
                                           │ timestamp        │
                                           └──────────────────┘
```

### Key Constraints

| Table  | Constraint                                                           |
|--------|----------------------------------------------------------------------|
| users  | Must have EITHER `employee_id` OR `student_id` (not both/neither)    |
| marks  | `marks_obtained >= 0`                                                |
| assessments | `max_marks > 0`, `weightage` between 0-100 if set              |
| subjects | GENERAL=sem 1-3 (no dept), SPECIAL=sem 4-8 (dept required), GES=no sem |

---

## 4. User Roles & Permissions

### Role Hierarchy

```
SUPER_ADMIN (Full System Access)
    │
    ├── HOD (Department-Scoped Access)
    │     │
    │     └── LECTURER (Subject-Scoped Access)
    │
    └── STUDENT (Own Data Only)
```

### Permission Matrix

| Permission             | Super Admin | HOD | Lecturer | Student |
|------------------------|:-----------:|:---:|:--------:|:-------:|
| MANAGE_USERS           |      x      |     |          |         |
| VIEW_ALL_USERS         |      x      |     |          |         |
| MANAGE_DEPARTMENTS     |      x      |     |          |         |
| MANAGE_SUBJECTS        |      x      |     |          |         |
| ASSIGN_SUBJECTS        |      x      |     |          |         |
| MANAGE_ENROLLMENTS     |      x      |     |          |         |
| MANAGE_ASSESSMENTS     |      x      |  x  |    x     |         |
| ENTER_MARKS            |      x      |     |    x     |         |
| EDIT_MARKS             |      x      |     |    x     |         |
| DELETE_MARKS           |      x      |     |    x     |         |
| APPROVE_MARKS          |      x      |  x  |          |         |
| REJECT_MARKS           |      x      |  x  |          |         |
| VIEW_ALL_MARKS         |      x      |     |          |         |
| VIEW_DEPARTMENT_MARKS  |      x      |  x  |    x     |         |
| VIEW_OWN_MARKS         |             |     |          |    x    |
| VIEW_AUDIT_LOGS        |      x      |     |          |         |
| GENERATE_REPORTS       |      x      |  x  |          |         |

---

## 5. Marks Approval Workflow

```
  LECTURER submits marks
         │
         ▼
    ┌──────────┐
    │ PENDING  │ ◄──────────────────────────┐
    └────┬─────┘                            │
         │                                  │
    HOD reviews                             │
         │                                  │
    ┌────┴────┐                             │
    │         │                             │
    ▼         ▼                             │
┌────────┐  ┌──────────┐   Lecturer edits   │
│APPROVED│  │ REJECTED │ ──────────────────┘
└────────┘  └──────────┘
    │
    ▼
 Visible to Student
```

**Rules:**
- Only PENDING marks can be approved/rejected
- Only PENDING or REJECTED marks can be edited/deleted by the lecturer
- Editing a REJECTED mark resets status to PENDING
- Students can only see APPROVED marks
- All state changes are audit-logged

---

## 6. Semester Logic

### Categories

| Type      | Semesters | Department Required | Description                              |
|-----------|-----------|:-------------------:|------------------------------------------|
| GENERAL   | 1, 2, 3   |         No          | All students study these subjects        |
| SPECIAL   | 4, 5, 6, 7, 8 |     Yes          | Only students of that department         |
| GES       | None       |         No          | General Elective Subjects (any student)  |

### Enrollment Validation

- **GENERAL subjects**: Any student can enroll
- **SPECIAL subjects**: `student.department_id == subject.department_id` (strict enforcement)
- **GES subjects**: Any student can enroll (department-independent)

---

## 7. Backend Architecture

### Directory Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, routers
│   ├── config.py                # Settings from .env
│   ├── database.py              # SQLAlchemy async engine & session
│   │
│   ├── models/                  # ORM Models
│   │   ├── user.py              # User (12 fields + constraints)
│   │   ├── role.py              # Role (SUPER_ADMIN, HOD, LECTURER, STUDENT)
│   │   ├── department.py        # Department (code, name, HOD)
│   │   ├── subject.py           # Subject + SubjectAssignment
│   │   ├── enrollment.py        # Student-Subject enrollment
│   │   ├── assessment.py        # Assessment definitions
│   │   ├── mark.py              # Marks with approval workflow
│   │   └── audit_log.py         # Audit trail records
│   │
│   ├── api/v1/                  # API Routers
│   │   ├── auth.py              # Login, Register, Profile, Avatar
│   │   ├── users.py             # User CRUD + stats
│   │   ├── departments.py       # Department CRUD
│   │   ├── subjects.py          # Subject CRUD + lecturer assignment
│   │   ├── enrollments.py       # Enrollment CRUD
│   │   ├── assessments.py       # Assessment CRUD
│   │   ├── marks.py             # Marks CRUD + approve/reject + my/marks
│   │   └── audit_logs.py        # Audit log viewer (read-only)
│   │
│   ├── schemas/                 # Pydantic Request/Response Models
│   │   ├── auth.py              # Login, Register, Token, Profile schemas
│   │   ├── user.py              # User CRUD schemas
│   │   ├── department.py        # Department schemas
│   │   ├── subject.py           # Subject + Assignment schemas
│   │   ├── enrollment.py        # Enrollment schemas
│   │   ├── assessment.py        # Assessment schemas
│   │   ├── mark.py              # Mark + Approval schemas
│   │   └── audit_log.py         # Audit log schemas
│   │
│   ├── services/                # Business Logic
│   │   ├── mark_service.py      # Submit, Update, Approve, Reject, Delete
│   │   └── audit_service.py     # Log actions (insert/update/delete/approve/reject)
│   │
│   ├── middleware/              # Auth & RBAC
│   │   ├── auth.py              # JWT validation, get_current_user
│   │   ├── rbac.py              # require_permission, require_role
│   │   └── audit.py             # get_client_ip, get_user_agent
│   │
│   ├── core/                    # Core Utilities
│   │   ├── constants.py         # Enums (Role, MarkStatus, SemesterType, etc.)
│   │   ├── permissions.py       # Permission enum + RBAC role mapping
│   │   └── security.py          # JWT creation/decode, password hashing
│   │
│   └── utils/                   # Utilities
│       ├── pagination.py        # Generic pagination helper
│       └── filters.py           # Dynamic query filters
│
├── .env                         # Environment variables
└── requirements.txt             # Python dependencies
```

### API Endpoints Summary

| Prefix                | Endpoints | Auth   | Description                |
|-----------------------|:---------:|:------:|----------------------------|
| `/api/v1/auth`        |     8     | Mixed  | Auth, Register, Profile    |
| `/api/v1/users`       |     6     | Yes    | User management            |
| `/api/v1/departments` |     5     | Yes    | Department management      |
| `/api/v1/subjects`    |     9     | Yes    | Subject + lecturer assign  |
| `/api/v1/enrollments` |     6     | Yes    | Student enrollments        |
| `/api/v1/assessments` |     5     | Yes    | Assessment definitions     |
| `/api/v1/marks`       |     8     | Yes    | Marks CRUD + workflow      |
| `/api/v1/audit-logs`  |     1     | Yes    | Audit trail (Super Admin)  |
| **Total**             |  **48**   |        |                            |

### Database Configuration

- **Async driver**: `asyncmy` (MySQL async)
- **Pool**: size=50, max_overflow=50, timeout=30s, recycle=3600s
- **Pre-ping**: enabled (connection health check)
- **Session**: autocommit=False, autoflush=False, expire_on_commit=False

---

## 8. Frontend Architecture

### Directory Structure

```
upfrontend/
├── src/
│   ├── App.tsx                    # Router setup, provider stack
│   ├── main.tsx                   # Entry point
│   │
│   ├── pages/                     # Page Components
│   │   ├── LoginPage.tsx          # Login form + test accounts
│   │   ├── RegisterPage.tsx       # Student registration form
│   │   ├── DashboardPage.tsx      # Role-based dashboard router
│   │   ├── MarksPage.tsx          # Marks management (step-based UI)
│   │   ├── MyMarksPage.tsx        # Student's own marks view
│   │   ├── ApprovalsPage.tsx      # HOD mark approvals
│   │   ├── UsersPage.tsx          # User CRUD + CSV export
│   │   ├── SubjectsPage.tsx       # Semester grid → subjects table
│   │   ├── DepartmentsPage.tsx    # Department CRUD
│   │   ├── AuditLogsPage.tsx      # Audit trail viewer
│   │   ├── SettingsPage.tsx       # Profile, password, theme
│   │   ├── NotFound.tsx           # 404 page
│   │   └── dashboard/
│   │       ├── SuperAdminDashboard.tsx
│   │       ├── HODDashboard.tsx
│   │       ├── LecturerDashboard.tsx
│   │       └── StudentDashboard.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx     # Sidebar + TopNav wrapper
│   │   │   ├── Sidebar.tsx        # Role-based navigation menu
│   │   │   └── TopNav.tsx         # Header bar with user profile
│   │   └── ui/                    # shadcn/ui components
│   │       ├── data-table.tsx     # Reusable sortable/paginated table
│   │       ├── page-header.tsx    # Page title + breadcrumbs + actions
│   │       ├── status-badge.tsx   # Mark status visualization
│   │       ├── role-badge.tsx     # Role display badge
│   │       ├── stats-card.tsx     # Dashboard stat card
│   │       ├── global-search.tsx  # Global search component
│   │       └── ...               # Standard shadcn/ui components
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx        # User auth state, login/logout
│   │   └── ThemeContext.tsx       # Light/Dark/System theme
│   │
│   ├── lib/
│   │   └── api.ts                # Axios API client (all endpoints)
│   │
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces & types
│   │
│   └── hooks/
│       └── use-toast.ts          # Toast notification hook
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### Routes

| Path           | Component         | Auth Required | Roles              |
|----------------|-------------------|:-------------:|---------------------|
| `/login`       | LoginPage         |      No       | -                   |
| `/register`    | RegisterPage      |      No       | -                   |
| `/dashboard`   | DashboardPage     |      Yes      | All                 |
| `/marks`       | MarksPage         |      Yes      | Admin, HOD, Lecturer|
| `/my-marks`    | MyMarksPage       |      Yes      | Student             |
| `/approvals`   | ApprovalsPage     |      Yes      | Admin, HOD          |
| `/users`       | UsersPage         |      Yes      | Admin               |
| `/subjects`    | SubjectsPage      |      Yes      | Admin               |
| `/departments` | DepartmentsPage   |      Yes      | Admin               |
| `/audit-logs`  | AuditLogsPage     |      Yes      | Admin               |
| `/settings`    | SettingsPage      |      Yes      | All                 |

### Provider Stack

```
QueryClientProvider (React Query)
  └── ThemeProvider
       └── AuthProvider
            └── TooltipProvider
                 └── BrowserRouter
                      └── Routes
```

### Key Frontend Libraries

| Library              | Purpose                        |
|----------------------|--------------------------------|
| React 18             | UI framework                   |
| React Router v6      | Client-side routing            |
| Axios                | HTTP client                    |
| TanStack React Query | Server state management        |
| Tailwind CSS         | Utility-first styling          |
| Radix UI             | Accessible UI primitives       |
| Lucide React         | Icon library                   |
| Recharts             | Charts and graphs              |
| Sonner               | Toast notifications            |
| Zod                  | Schema validation              |
| date-fns             | Date formatting                |

---

## 9. Authentication Flow

```
┌──────────┐     POST /auth/login      ┌──────────┐
│  Client  │ ────────────────────────►  │  Server  │
│          │  { email, password }       │          │
│          │                            │          │
│          │  ◄──────────────────────── │          │
│          │  { access_token, user }    │          │
│          │                            │          │
│  Store   │                            │          │
│  token + │                            │          │
│  user in │                            │          │
│  localStorage                         │          │
│          │                            │          │
│          │  GET /api/v1/marks         │          │
│          │  Authorization: Bearer xxx │          │
│          │ ────────────────────────►  │          │
│          │                            │ Validate │
│          │                            │   JWT    │
│          │  ◄──────────────────────── │ Check    │
│          │  { data }                  │ Permissions│
└──────────┘                            └──────────┘
```

**Token Details:**
- Algorithm: HS256
- Payload: `{ user_id, role, email, exp }`
- Default expiry: 30 minutes
- Storage: localStorage (`token`, `user`)

---

## 10. Registration Flow

```
Student fills form          POST /auth/register
  (name, email,     ──────►  Validate data
   student_id,                Check email unique
   department,                Check student_id unique
   batch, password)           Get STUDENT role
                              Create user
                              Return token + user
                    ◄──────

  Clear token              Navigate to /login
  (user must sign in)       Show success message
```

---

## 11. Data Flow Patterns

### Frontend Data Fetching

```
useEffect()
  └── setLoading(true)
       └── api.getXxx(params)
            ├── Success → setState(data) → setLoading(false)
            └── Error → toast({ variant: "destructive" }) → setLoading(false)
```

### Backend Request Processing

```
HTTP Request
  └── CORS Middleware
       └── JWT Auth Middleware (get_current_user)
            └── RBAC Check (require_permission)
                 └── Schema Validation (Pydantic)
                      └── Service Layer (business logic)
                           └── ORM Query (SQLAlchemy)
                                └── Database
                                     └── Audit Log
```

---

## 12. Key Design Decisions

| Decision                    | Choice                  | Rationale                                      |
|-----------------------------|-------------------------|-------------------------------------------------|
| Async everywhere            | asyncmy + async SQLAlchemy | Non-blocking I/O for better concurrency       |
| JWT (not sessions)          | Stateless auth          | Scalable, no server-side session storage        |
| RBAC via middleware          | Permission-based        | Fine-grained control, easy to extend            |
| Audit logging               | Every data mutation     | Compliance, traceability, accountability        |
| Semester type enum           | GENERAL/SPECIAL/GES     | Faculty structure: 3 general + 5 dept + elective|
| Marks approval workflow     | PENDING→APPROVED/REJECTED | Quality assurance, HOD oversight               |
| Pydantic schemas             | Separate from ORM models | Clean API contracts, validation                |
| shadcn/ui                    | Copy-paste components   | Full control, no dependency lock-in             |
| Step-based UI (Marks page)  | Drill-down navigation   | Hierarchical data suits progressive disclosure  |

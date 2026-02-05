# University In-Course Webapp - Model Documentation

> **Project:** University Course Management System
> **Backend:** FastAPI (Python) with SQLAlchemy ORM
> **Database:** MySQL (via PyMySQL)
> **Last Updated:** 2026-02-05

---

## Table of Contents

1. [Overview](#1-overview)
2. [Entity-Relationship Diagram](#2-entity-relationship-diagram)
3. [Models](#3-models)
   - 3.1 [Role](#31-role)
   - 3.2 [Department](#32-department)
   - 3.3 [User](#33-user)
   - 3.4 [Subject](#34-subject)
   - 3.5 [SubjectAssignment](#35-subjectassignment)
   - 3.6 [Enrollment](#36-enrollment)
   - 3.7 [Assessment](#37-assessment)
   - 3.8 [Mark](#38-mark)
   - 3.9 [AuditLog](#39-auditlog)
4. [Enumerations](#4-enumerations)
5. [Relationships Summary](#5-relationships-summary)
6. [Data Integrity & Constraints](#6-data-integrity--constraints)
7. [Business Workflows](#7-business-workflows)
8. [Technology Stack](#8-technology-stack)

---

## 1. Overview

This application is a **University Course Management System** designed to handle:

- **User Management** with role-based access control (Super Admin, HOD, Lecturer, Student)
- **Department & Subject Management** across academic years and semesters
- **Student Enrollment** tracking per subject/semester/academic year
- **Assessment Creation** with multiple types (exams, quizzes, assignments, projects, etc.)
- **Marks Entry & Approval Workflow** (Submit -> Review -> Approve/Reject)
- **Full Audit Trail** for compliance and accountability

The system consists of **9 core models** that work together to manage the entire lifecycle of in-course assessments.

---

## 2. Entity-Relationship Diagram

```
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│   Role   │ 1 ──── M │     User     │ M ──── 1 │  Department  │
│          │          │              │          │              │
│  - name  │          │  - email     │          │  - code      │
│          │          │  - password  │    1     │  - name      │
└──────────┘          │  - role_id   │◄─────────│  - hod_id    │
                      │  - dept_id   │          └──────┬───────┘
                      └──────┬───────┘                 │
                             │                         │ 1
            ┌────────────────┼────────────────┐        │
            │                │                │        │ M
            │ M              │ M              │ M  ┌───┴───────┐
   ┌────────┴──────┐  ┌──────┴───────┐  ┌────┴──┐ │  Subject   │
   │  Enrollment   │  │  AuditLog    │  │ Mark  │ │            │
   │               │  │              │  │       │ │  - code    │
   │ - student_id  │  │ - table_name │  │(submit│ │  - name    │
   │ - subject_id  │  │ - action     │  │ review│ │  - credits │
   │ - status      │  │ - old_value  │  │  by)  │ │  - semester│
   └───────┬───────┘  │ - new_value  │  └───────┘ └──┬──┬─────┘
           │          └──────────────┘                │  │
           │ 1                                     1  │  │ 1
           │                                          │  │
           │ M                                     M  │  │ M
      ┌────┴────┐                    ┌─────────────┐  │  ┌──────────────┐
      │  Mark   │ M ──────────── 1   │  Subject    │  │  │  Assessment  │
      │         │                    │  Assignment │  │  │              │
      │ - marks │                    │             │  │  │  - name      │
      │ - status│                    │ - lecturer  │──┘  │  - type      │
      └────┬────┘                    │ - acad_year │     │  - max_marks │
           │ M                       └─────────────┘     │  - weightage │
           │                                             └──────────────┘
           │ 1
      ┌────┴────────┐
      │  Assessment  │
      └──────────────┘
```

---

## 3. Models

### 3.1 Role

**File:** `backend/app/models/role.py`
**Table:** `roles`
**Purpose:** Defines the access control roles for all users in the system.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique role identifier |
| `name` | String(50) | UNIQUE, NOT NULL, INDEXED | Role name |
| `description` | Text | Nullable | Human-readable role description |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**Predefined Role Values:**

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Full system access, manages all entities |
| `HOD` | Head of Department, approves marks, manages department |
| `LECTURER` | Submits marks, manages assigned subjects |
| `STUDENT` | Views own marks and enrollment details |

**Relationships:**
- `users` -> One-to-Many with **User** (A role can have many users)

---

### 3.2 Department

**File:** `backend/app/models/department.py`
**Table:** `departments`
**Purpose:** Represents university departments that organize subjects and users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique department identifier |
| `code` | String(20) | UNIQUE, NOT NULL, INDEXED | Short department code (e.g., "CS", "ENG") |
| `name` | String(255) | NOT NULL | Full department name |
| `hod_id` | Integer | FK -> `users.id`, Nullable, INDEXED | Reference to Head of Department |
| `is_active` | Boolean | Default: True, INDEXED | Whether department is active |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `hod` | Many-to-One | User | The HOD of this department |
| `users` | One-to-Many | User | All users belonging to this department |
| `subjects` | One-to-Many | Subject | All subjects offered by this department (CASCADE delete) |

**Foreign Key Behavior:**
- `hod_id` -> ON DELETE: **SET NULL** (if HOD user is deleted, field becomes null)

---

### 3.3 User

**File:** `backend/app/models/user.py`
**Table:** `users`
**Purpose:** Central entity representing all system users (admins, HODs, lecturers, and students).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique user identifier |
| `email` | String(255) | UNIQUE, NOT NULL, INDEXED | Login email address |
| `password_hash` | String(255) | NOT NULL | Bcrypt-hashed password |
| `first_name` | String(100) | NOT NULL | User's first name |
| `last_name` | String(100) | NOT NULL | User's last name |
| `employee_id` | String(50) | UNIQUE, Nullable, INDEXED | Staff/faculty employee ID |
| `student_id` | String(50) | UNIQUE, Nullable, INDEXED | Student registration ID |
| `avatar_url` | String(500) | Nullable | Profile picture URL |
| `role_id` | Integer | FK -> `roles.id`, NOT NULL, INDEXED | Assigned role |
| `department_id` | Integer | FK -> `departments.id`, Nullable, INDEXED | Department membership |
| `is_active` | Boolean | Default: True, INDEXED | Account active status |
| `last_login` | Timestamp | Nullable | Last successful login time |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**CHECK Constraints:**
- `chk_user_identifier`: A user must have **either** `employee_id` **or** `student_id`, but **not both**. This enforces the distinction between staff and students at the database level.

**Computed Properties:**
| Property | Return Type | Description |
|---|---|---|
| `full_name` | String | Returns `"first_name last_name"` |
| `is_student` | Boolean | `True` if `student_id` is not null |
| `is_staff` | Boolean | `True` if `employee_id` is not null |

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `role` | Many-to-One | Role | User's assigned role |
| `department` | Many-to-One | Department | User's department |
| `headed_department` | One-to-One | Department | Department this user heads (if HOD) |
| `subject_assignments` | One-to-Many | SubjectAssignment | Subjects assigned to teach (lecturers) |
| `enrollments` | One-to-Many | Enrollment | Subject enrollments (students) |
| `submitted_marks` | One-to-Many | Mark | Marks submitted by this user |
| `reviewed_marks` | One-to-Many | Mark | Marks reviewed/approved by this user |
| `audit_logs` | One-to-Many | AuditLog | Actions performed by this user |

**Foreign Key Behavior:**
- `role_id` -> ON DELETE: **RESTRICT** (cannot delete a role that has users)
- `department_id` -> ON DELETE: **SET NULL** (user remains but loses department reference)

---

### 3.4 Subject

**File:** `backend/app/models/subject.py`
**Table:** `subjects`
**Purpose:** Represents university courses/subjects that students enroll in and lecturers teach.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique subject identifier |
| `code` | String(20) | UNIQUE, NOT NULL, INDEXED | Subject code (e.g., "CS101") |
| `name` | String(255) | NOT NULL | Full subject name |
| `department_id` | Integer | FK -> `departments.id`, Nullable, INDEXED | Offering department |
| `coordinator_id` | Integer | FK -> `users.id`, Nullable, INDEXED | Course coordinator (a lecturer) |
| `semester` | Integer | NOT NULL, INDEXED | Semester number (1-8) |
| `credits` | Integer | NOT NULL | Credit hours |
| `is_active` | Boolean | Default: True, INDEXED | Active status |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `department` | Many-to-One | Department | Department offering this subject |
| `coordinator` | Many-to-One | User | Course coordinator |
| `subject_assignments` | One-to-Many | SubjectAssignment | Lecturer assignments (CASCADE) |
| `enrollments` | One-to-Many | Enrollment | Student enrollments (CASCADE) |
| `assessments` | One-to-Many | Assessment | Assessment definitions (CASCADE) |

**Foreign Key Behavior:**
- `department_id` -> ON DELETE: **SET NULL**
- `coordinator_id` -> ON DELETE: **SET NULL**

**Notes:**
- `department_id` can be null for general/common subjects (e.g., semesters 1-3)
- Deleting a subject cascades to assignments, enrollments, and assessments

---

### 3.5 SubjectAssignment

**File:** `backend/app/models/subject.py`
**Table:** `subject_assignments`
**Purpose:** Maps lecturers to subjects they are assigned to teach for specific academic years.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique assignment identifier |
| `subject_id` | Integer | FK -> `subjects.id`, NOT NULL, INDEXED | Subject being assigned |
| `lecturer_id` | Integer | FK -> `users.id`, NOT NULL, INDEXED | Lecturer assigned to teach |
| `academic_year` | String(10) | NOT NULL, INDEXED | Academic year (e.g., "2023-2024") |
| `is_active` | Boolean | Default: True, INDEXED | Active status |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `subject` | Many-to-One | Subject | The subject being taught |
| `lecturer` | Many-to-One | User | The lecturer teaching the subject |

**Foreign Key Behavior:**
- `subject_id` -> ON DELETE: **CASCADE**
- `lecturer_id` -> ON DELETE: **CASCADE**

---

### 3.6 Enrollment

**File:** `backend/app/models/enrollment.py`
**Table:** `enrollments`
**Purpose:** Tracks which students are enrolled in which subjects, including academic year and semester context.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique enrollment identifier |
| `student_id` | Integer | FK -> `users.id`, NOT NULL, INDEXED | Enrolled student |
| `subject_id` | Integer | FK -> `subjects.id`, NOT NULL, INDEXED | Subject enrolled in |
| `academic_year` | String(10) | NOT NULL, INDEXED | Academic year (e.g., "2024-2025") |
| `semester` | Integer | NOT NULL, INDEXED | Semester number |
| `enrollment_date` | Date | NOT NULL | Date of enrollment |
| `status` | Enum(EnrollmentStatus) | Default: ACTIVE, NOT NULL, INDEXED | Current enrollment status |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `student` | Many-to-One | User | The enrolled student |
| `subject` | Many-to-One | Subject | The subject enrolled in |
| `marks` | One-to-Many | Mark | All marks for this enrollment (CASCADE) |

**Foreign Key Behavior:**
- `student_id` -> ON DELETE: **CASCADE**
- `subject_id` -> ON DELETE: **CASCADE**

---

### 3.7 Assessment

**File:** `backend/app/models/assessment.py`
**Table:** `assessments`
**Purpose:** Defines evaluation criteria and assessment types for each subject.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique assessment identifier |
| `name` | String(100) | NOT NULL | Assessment name (e.g., "Midterm Exam") |
| `assessment_type` | Enum(AssessmentType) | NOT NULL, INDEXED | Category of assessment |
| `subject_id` | Integer | FK -> `subjects.id`, NOT NULL, INDEXED | Subject being assessed |
| `max_marks` | Numeric(5,2) | NOT NULL | Maximum possible marks |
| `weightage` | Numeric(5,2) | Nullable | Percentage weight toward final grade |
| `assessment_date` | Date | Nullable, INDEXED | Scheduled assessment date |
| `academic_year` | String(10) | NOT NULL, INDEXED | Academic year |
| `description` | Text | Nullable | Detailed assessment description |
| `is_active` | Boolean | Default: True, INDEXED | Active status |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**CHECK Constraints:**
- `chk_max_marks`: `max_marks > 0` (must be a positive number)
- `chk_weightage`: `weightage IS NULL OR (weightage >= 0 AND weightage <= 100)`

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `subject` | Many-to-One | Subject | The subject this assessment belongs to |
| `marks` | One-to-Many | Mark | Individual student marks (CASCADE) |

**Foreign Key Behavior:**
- `subject_id` -> ON DELETE: **CASCADE**

---

### 3.8 Mark

**File:** `backend/app/models/mark.py`
**Table:** `marks`
**Purpose:** Stores individual student marks with a built-in approval workflow (submit -> review -> approve/reject).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique mark identifier |
| `enrollment_id` | Integer | FK -> `enrollments.id`, NOT NULL, INDEXED | Student's enrollment |
| `assessment_id` | Integer | FK -> `assessments.id`, NOT NULL, INDEXED | Assessment being graded |
| `marks_obtained` | Numeric(5,2) | NOT NULL | Marks scored by student |
| `status` | Enum(MarkStatus) | Default: PENDING, NOT NULL, INDEXED | Approval workflow status |
| `submitted_by` | Integer | FK -> `users.id`, NOT NULL, INDEXED | User who entered the marks |
| `submitted_at` | Timestamp | Default: NOW, INDEXED | When marks were submitted |
| `reviewed_by` | Integer | FK -> `users.id`, Nullable, INDEXED | User who reviewed the marks |
| `reviewed_at` | Timestamp | Nullable | When marks were reviewed |
| `review_comments` | Text | Nullable | Reviewer's feedback/comments |
| `is_absent` | Boolean | Default: False | Whether student was absent |
| `created_at` | Timestamp | Default: NOW | Record creation time |
| `updated_at` | Timestamp | Default: NOW, Auto-update | Last modification time |

**CHECK Constraints:**
- `chk_marks_valid`: `marks_obtained >= 0` (marks cannot be negative)

**Computed Properties:**
| Property | Return Type | Description |
|---|---|---|
| `is_pending` | Boolean | `True` if `status == PENDING` |
| `is_approved` | Boolean | `True` if `status == APPROVED` |
| `is_rejected` | Boolean | `True` if `status == REJECTED` |
| `can_be_edited` | Boolean | `True` if status is `PENDING` or `REJECTED` |

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `enrollment` | Many-to-One | Enrollment | The student's enrollment record |
| `assessment` | Many-to-One | Assessment | The assessment being graded |
| `submitter` | Many-to-One | User | Who submitted the marks |
| `reviewer` | Many-to-One | User | Who reviewed/approved the marks |

**Foreign Key Behavior:**
- `enrollment_id` -> ON DELETE: **CASCADE**
- `assessment_id` -> ON DELETE: **CASCADE**
- `submitted_by` -> ON DELETE: **RESTRICT** (cannot delete user who submitted marks)
- `reviewed_by` -> ON DELETE: **SET NULL**

---

### 3.9 AuditLog

**File:** `backend/app/models/audit_log.py`
**Table:** `audit_logs`
**Purpose:** Immutable log of all data modifications across the system for compliance, security, and accountability.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto Increment | Unique log identifier |
| `table_name` | String(50) | NOT NULL, INDEXED | Name of table modified |
| `record_id` | Integer | NOT NULL | ID of the modified record |
| `action` | Enum(AuditAction) | NOT NULL, INDEXED | Type of action performed |
| `field_name` | String(100) | Nullable | Specific field changed (for UPDATE) |
| `old_value` | Text | Nullable | Value before change |
| `new_value` | Text | Nullable | Value after change |
| `performed_by` | Integer | FK -> `users.id`, NOT NULL, INDEXED | User who performed the action |
| `ip_address` | String(45) | Nullable | Client IP address (supports IPv6) |
| `user_agent` | String(255) | Nullable | Browser/client user agent string |
| `timestamp` | Timestamp | Default: NOW, INDEXED | When the action occurred |

**Relationships:**
| Relationship | Type | Target | Description |
|---|---|---|---|
| `user` | Many-to-One | User | The user who performed the action |

**Foreign Key Behavior:**
- `performed_by` -> ON DELETE: **RESTRICT** (cannot delete user with audit history)

---

## 4. Enumerations

### 4.1 AssessmentType
| Value | Description |
|-------|-------------|
| `INTERNAL` | Internal continuous assessment |
| `ASSIGNMENT` | Written or practical assignment |
| `PROJECT` | Project-based assessment |
| `FINAL_EXAM` | End-of-semester final examination |
| `MIDTERM` | Mid-semester examination |
| `QUIZ` | Short quiz or test |
| `LAB` | Laboratory practical assessment |
| `OTHER` | Any other assessment type |

### 4.2 EnrollmentStatus
| Value | Description |
|-------|-------------|
| `ACTIVE` | Student is currently enrolled |
| `DROPPED` | Student dropped the subject |
| `COMPLETED` | Student completed the subject |

### 4.3 MarkStatus
| Value | Description |
|-------|-------------|
| `PENDING` | Marks submitted, awaiting review |
| `APPROVED` | Marks reviewed and approved by HOD/Admin |
| `REJECTED` | Marks rejected, lecturer must resubmit |

### 4.4 AuditAction
| Value | Description |
|-------|-------------|
| `INSERT` | New record was created |
| `UPDATE` | Existing record was modified |
| `DELETE` | Record was deleted |
| `APPROVE` | Mark was approved |
| `REJECT` | Mark was rejected |

---

## 5. Relationships Summary

| From | To | Type | FK Field | On Delete |
|------|----|------|----------|-----------|
| User | Role | Many-to-One | `role_id` | RESTRICT |
| User | Department | Many-to-One | `department_id` | SET NULL |
| Department | User (HOD) | One-to-One | `hod_id` | SET NULL |
| Subject | Department | Many-to-One | `department_id` | SET NULL |
| Subject | User (Coordinator) | Many-to-One | `coordinator_id` | SET NULL |
| SubjectAssignment | Subject | Many-to-One | `subject_id` | CASCADE |
| SubjectAssignment | User (Lecturer) | Many-to-One | `lecturer_id` | CASCADE |
| Enrollment | User (Student) | Many-to-One | `student_id` | CASCADE |
| Enrollment | Subject | Many-to-One | `subject_id` | CASCADE |
| Assessment | Subject | Many-to-One | `subject_id` | CASCADE |
| Mark | Enrollment | Many-to-One | `enrollment_id` | CASCADE |
| Mark | Assessment | Many-to-One | `assessment_id` | CASCADE |
| Mark | User (Submitter) | Many-to-One | `submitted_by` | RESTRICT |
| Mark | User (Reviewer) | Many-to-One | `reviewed_by` | SET NULL |
| AuditLog | User | Many-to-One | `performed_by` | RESTRICT |

---

## 6. Data Integrity & Constraints

### 6.1 Unique Constraints
| Model | Field(s) | Purpose |
|-------|----------|---------|
| Role | `name` | No duplicate role names |
| Department | `code` | No duplicate department codes |
| User | `email` | No duplicate email addresses |
| User | `employee_id` | No duplicate employee IDs |
| User | `student_id` | No duplicate student IDs |
| Subject | `code` | No duplicate subject codes |

### 6.2 CHECK Constraints
| Model | Constraint | Rule |
|-------|-----------|------|
| User | `chk_user_identifier` | Must have `employee_id` OR `student_id` (not both, not neither) |
| Assessment | `chk_max_marks` | `max_marks > 0` |
| Assessment | `chk_weightage` | `weightage IS NULL OR (0 <= weightage <= 100)` |
| Mark | `chk_marks_valid` | `marks_obtained >= 0` |

### 6.3 Cascade Delete Chain
When a **Subject** is deleted, the following chain occurs:
```
Subject (DELETED)
  ├── SubjectAssignment (CASCADE -> DELETED)
  ├── Enrollment (CASCADE -> DELETED)
  │     └── Mark (CASCADE -> DELETED)
  └── Assessment (CASCADE -> DELETED)
        └── Mark (CASCADE -> DELETED)
```

### 6.4 Protected Entities
The following deletions are **blocked** (RESTRICT):
- Cannot delete a **Role** if any users are assigned to it
- Cannot delete a **User** who has submitted marks (`submitted_by` in Mark)
- Cannot delete a **User** who has audit log entries (`performed_by` in AuditLog)

---

## 7. Business Workflows

### 7.1 Mark Approval Workflow
```
Lecturer submits marks
        │
        v
   ┌──────────┐
   │  PENDING  │ <─── Initial state
   └─────┬─────┘
         │
    HOD Reviews
         │
    ┌────┴────┐
    │         │
    v         v
┌────────┐ ┌────────┐
│APPROVED│ │REJECTED│
└────────┘ └───┬────┘
               │
          Lecturer fixes
          & resubmits
               │
               v
          ┌──────────┐
          │  PENDING  │ (cycle repeats)
          └──────────┘
```

**Rules:**
- Only **Lecturers** can submit marks
- Only **HOD** or **Super Admin** can approve/reject marks
- Marks can only be edited when status is `PENDING` or `REJECTED`
- Review comments are captured for feedback on rejections

### 7.2 Enrollment Lifecycle
```
Student enrolls
      │
      v
  ┌────────┐
  │ ACTIVE │ ── Initial state
  └───┬────┘
      │
  ┌───┴───┐
  │       │
  v       v
┌───────┐ ┌─────────┐
│DROPPED│ │COMPLETED│
└───────┘ └─────────┘
```

### 7.3 User Classification
```
                    User
                   /    \
                  /      \
        has employee_id?  has student_id?
              │                 │
              v                 v
          ┌───────┐        ┌─────────┐
          │ Staff │        │ Student │
          └───┬───┘        └─────────┘
              │
    ┌─────────┼──────────┐
    │         │          │
    v         v          v
SUPER_ADMIN  HOD     LECTURER
```

---

## 8. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend Framework | FastAPI | 0.109.0 |
| ORM | SQLAlchemy | 2.0.25 |
| Database Driver | PyMySQL | 1.1.0 |
| Data Validation | Pydantic | 2.5.3+ |
| Authentication | python-jose (JWT) | with cryptography |
| Password Hashing | passlib | with bcrypt |
| DB Migrations | Alembic | 1.13.1 |
| Web Server | Uvicorn | 0.25.0 |
| Database | MySQL | - |

---

> *This document is auto-generated based on the SQLAlchemy model definitions in the project codebase.*

from enum import Enum


class Role(str, Enum):
    """User roles in the system"""
    SUPER_ADMIN = "SUPER_ADMIN"
    DEAN = "DEAN"
    HOD = "HOD"
    LECTURER = "LECTURER"
    INSTRUCTOR = "INSTRUCTOR"
    STUDENT = "STUDENT"


class MarkStatus(str, Enum):
    """Status of marks in the approval workflow"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class EnrollmentStatus(str, Enum):
    """Status of student enrollment"""
    ACTIVE = "ACTIVE"
    DROPPED = "DROPPED"
    COMPLETED = "COMPLETED"


class AssessmentType(str, Enum):
    """Types of assessments"""
    INTERNAL = "INTERNAL"
    ASSIGNMENT = "ASSIGNMENT"
    PROJECT = "PROJECT"
    FINAL_EXAM = "FINAL_EXAM"
    MIDTERM = "MIDTERM"
    QUIZ = "QUIZ"
    LAB = "LAB"
    OTHER = "OTHER"


class SemesterType(str, Enum):
    """Types of semesters in the faculty"""
    GENERAL = "GENERAL"       # Semester 1, 2, 3 — department-independent, all students
    SPECIAL = "SPECIAL"       # Semester 4, 5, 6, 7, 8 — department-specific
    GES = "GES"               # General Elective Subjects — department-independent, no numbered semester


# Semester number sets for validation
GENERAL_SEMESTERS = {1, 2, 3}
SPECIAL_SEMESTERS = {4, 5, 6, 7, 8}
VALID_SEMESTERS = GENERAL_SEMESTERS | SPECIAL_SEMESTERS


class AuditAction(str, Enum):
    """Actions tracked in audit logs"""
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    APPROVE = "APPROVE"
    REJECT = "REJECT"

from enum import Enum


class Role(str, Enum):
    """User roles in the system"""
    SUPER_ADMIN = "SUPER_ADMIN"
    HOD = "HOD"
    LECTURER = "LECTURER"
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


class AuditAction(str, Enum):
    """Actions tracked in audit logs"""
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    APPROVE = "APPROVE"
    REJECT = "REJECT"

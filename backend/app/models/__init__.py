"""
Database models package.
Import all models here to ensure SQLAlchemy recognizes relationships.
"""

from app.models.role import Role
from app.models.department import Department
from app.models.user import User
from app.models.subject import Subject, SubjectAssignment
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.mark import Mark
from app.models.audit_log import AuditLog

__all__ = [
    "Role",
    "Department",
    "User",
    "Subject",
    "SubjectAssignment",
    "Enrollment",
    "Assessment",
    "Mark",
    "AuditLog",
]

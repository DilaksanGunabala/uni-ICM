"""
Pydantic schemas package for request/response validation.
"""

from app.schemas.auth import LoginRequest, TokenResponse, TokenData, UserResponse
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserInDB, UserWithRole
from app.schemas.department import DepartmentBase, DepartmentCreate, DepartmentUpdate, DepartmentInDB, DepartmentResponse
from app.schemas.subject import SubjectBase, SubjectCreate, SubjectUpdate, SubjectResponse, SubjectWithDetails, LecturerAssignmentCreate, LecturerAssignmentResponse
from app.schemas.enrollment import EnrollmentBase, EnrollmentCreate, EnrollmentUpdate, EnrollmentResponse, EnrollmentWithDetails
from app.schemas.assessment import AssessmentBase, AssessmentCreate, AssessmentUpdate, AssessmentInDB, AssessmentResponse, AssessmentWithDetails
from app.schemas.mark import MarkBase, MarkCreate, MarkUpdate, MarkApproval, MarkInDB, MarkResponse, MarkFilter
from app.schemas.audit_log import AuditLogBase, AuditLogResponse, AuditLogWithDetails

__all__ = [
    # Auth
    "LoginRequest", "TokenResponse", "TokenData", "UserResponse",
    # User
    "UserBase", "UserCreate", "UserUpdate", "UserInDB", "UserWithRole",
    # Department
    "DepartmentBase", "DepartmentCreate", "DepartmentUpdate", "DepartmentInDB", "DepartmentResponse",
    # Subject
    "SubjectBase", "SubjectCreate", "SubjectUpdate", "SubjectInDB", "SubjectResponse",
    "SubjectAssignmentCreate", "SubjectAssignmentInDB",
    # Enrollment
    "EnrollmentBase", "EnrollmentCreate", "EnrollmentUpdate", "EnrollmentInDB", "EnrollmentResponse",
    # Assessment
    "AssessmentBase", "AssessmentCreate", "AssessmentUpdate", "AssessmentInDB", "AssessmentResponse",
    # Mark
    "MarkBase", "MarkCreate", "MarkUpdate", "MarkApproval", "MarkInDB", "MarkResponse", "MarkFilter",
    # Audit Log
    "AuditLogBase", "AuditLogInDB", "AuditLogResponse", "AuditLogFilter",
]

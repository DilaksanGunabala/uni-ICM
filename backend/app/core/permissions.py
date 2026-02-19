from enum import Enum
from typing import List, Dict
from app.core.constants import Role


class Permission(str, Enum):
    """System permissions"""

    # User management
    MANAGE_USERS = "manage_users"
    VIEW_ALL_USERS = "view_all_users"

    # Department management
    MANAGE_DEPARTMENTS = "manage_departments"
    VIEW_DEPARTMENT = "view_department"

    # Subject management
    MANAGE_SUBJECTS = "manage_subjects"
    VIEW_SUBJECTS = "view_subjects"
    VIEW_OWN_SUBJECTS = "view_own_subjects"
    ASSIGN_SUBJECTS = "assign_subjects"

    # Marks management
    ENTER_MARKS = "enter_marks"
    EDIT_MARKS = "edit_marks"
    DELETE_MARKS = "delete_marks"
    APPROVE_MARKS = "approve_marks"
    REJECT_MARKS = "reject_marks"
    VIEW_ALL_MARKS = "view_all_marks"
    VIEW_OWN_MARKS = "view_own_marks"
    VIEW_DEPARTMENT_MARKS = "view_department_marks"

    # Reports
    GENERATE_REPORTS = "generate_reports"
    VIEW_OWN_REPORTS = "view_own_reports"
    VIEW_DEPARTMENT_REPORTS = "view_department_reports"

    # Audit
    VIEW_AUDIT_LOGS = "view_audit_logs"

    # Enrollment management
    MANAGE_ENROLLMENTS = "manage_enrollments"
    VIEW_ALL_ENROLLMENTS = "view_all_enrollments"
    VIEW_OWN_ENROLLMENTS = "view_own_enrollments"

    # Assessment management
    MANAGE_ASSESSMENTS = "manage_assessments"


# Role-Permission mapping
ROLE_PERMISSIONS: Dict[Role, List[Permission]] = {
    Role.SUPER_ADMIN: [
        # Full system access
        Permission.MANAGE_USERS,
        Permission.VIEW_ALL_USERS,
        Permission.MANAGE_DEPARTMENTS,
        Permission.MANAGE_SUBJECTS,
        Permission.ASSIGN_SUBJECTS,
        Permission.VIEW_SUBJECTS,
        Permission.MANAGE_ENROLLMENTS,
        Permission.VIEW_ALL_ENROLLMENTS,
        Permission.MANAGE_ASSESSMENTS,
        Permission.ENTER_MARKS,
        Permission.EDIT_MARKS,
        Permission.DELETE_MARKS,
        Permission.VIEW_ALL_MARKS,
        Permission.APPROVE_MARKS,
        Permission.REJECT_MARKS,
        Permission.GENERATE_REPORTS,
        Permission.VIEW_AUDIT_LOGS,
    ],
    Role.DEAN: [
        # Faculty-level oversight
        Permission.VIEW_ALL_USERS,
        Permission.VIEW_DEPARTMENT,
        Permission.VIEW_SUBJECTS,
        Permission.VIEW_ALL_ENROLLMENTS,
        Permission.VIEW_ALL_MARKS,
        Permission.VIEW_DEPARTMENT_MARKS,
        Permission.APPROVE_MARKS,
        Permission.REJECT_MARKS,
        Permission.GENERATE_REPORTS,
        Permission.VIEW_DEPARTMENT_REPORTS,
        Permission.VIEW_AUDIT_LOGS,
    ],
    Role.HOD: [
        # Department-level authority
        Permission.VIEW_DEPARTMENT,
        Permission.VIEW_SUBJECTS,
        Permission.VIEW_ALL_ENROLLMENTS,
        Permission.VIEW_DEPARTMENT_MARKS,
        Permission.APPROVE_MARKS,
        Permission.REJECT_MARKS,
        Permission.GENERATE_REPORTS,
        Permission.VIEW_DEPARTMENT_REPORTS,
    ],
    Role.LECTURER: [
        # Marks entry role
        Permission.VIEW_SUBJECTS,
        Permission.VIEW_OWN_SUBJECTS,
        Permission.ENTER_MARKS,
        Permission.EDIT_MARKS,
        Permission.DELETE_MARKS,
        Permission.VIEW_DEPARTMENT_MARKS,
        Permission.MANAGE_ASSESSMENTS,  # For subjects they teach
    ],
    Role.INSTRUCTOR: [
        # Lab/tutorial instructor — same access as Lecturer
        Permission.VIEW_SUBJECTS,
        Permission.VIEW_OWN_SUBJECTS,
        Permission.ENTER_MARKS,
        Permission.EDIT_MARKS,
        Permission.DELETE_MARKS,
        Permission.VIEW_DEPARTMENT_MARKS,
        Permission.MANAGE_ASSESSMENTS,
    ],
    Role.STUDENT: [
        # View-only role
        Permission.VIEW_OWN_MARKS,
        Permission.VIEW_OWN_REPORTS,
        Permission.VIEW_OWN_ENROLLMENTS,
    ],
}


def has_permission(user_role: str, permission: Permission) -> bool:
    """
    Check if a role has a specific permission.

    Args:
        user_role: The user's role as string
        permission: The permission to check

    Returns:
        True if role has permission, False otherwise
    """
    try:
        role = Role(user_role)
        return permission in ROLE_PERMISSIONS.get(role, [])
    except ValueError:
        return False


def get_role_permissions(user_role: str) -> List[Permission]:
    """
    Get all permissions for a specific role.

    Args:
        user_role: The user's role as string

    Returns:
        List of permissions for the role
    """
    try:
        role = Role(user_role)
        return ROLE_PERMISSIONS.get(role, [])
    except ValueError:
        return []

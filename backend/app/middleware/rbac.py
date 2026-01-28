from fastapi import HTTPException, status, Depends
from typing import List, Callable
from app.models.user import User
from app.core.permissions import Permission, has_permission
from app.middleware.auth import get_current_user


def require_permission(permission: Permission) -> Callable:
    """
    Dependency factory to check if user has a specific permission.

    Usage:
        @router.get("/admin/users")
        def get_users(
            current_user: User = Depends(require_permission(Permission.VIEW_ALL_USERS))
        ):
            ...

    Args:
        permission: The required permission

    Returns:
        Dependency function that validates permission
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        # Get user's role name
        role_name = current_user.role.name

        # Check if user has the required permission
        if not has_permission(role_name, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission.value}"
            )

        return current_user

    return permission_checker


def require_any_permission(permissions: List[Permission]) -> Callable:
    """
    Dependency factory to check if user has ANY of the specified permissions.

    Usage:
        @router.get("/marks")
        def get_marks(
            current_user: User = Depends(require_any_permission([
                Permission.VIEW_ALL_MARKS,
                Permission.VIEW_DEPARTMENT_MARKS,
                Permission.VIEW_OWN_MARKS
            ]))
        ):
            ...

    Args:
        permissions: List of acceptable permissions

    Returns:
        Dependency function that validates permissions
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        # Get user's role name
        role_name = current_user.role.name

        # Check if user has any of the required permissions
        has_any = any(has_permission(role_name, perm) for perm in permissions)

        if not has_any:
            required_perms = ", ".join([p.value for p in permissions])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required (any of): {required_perms}"
            )

        return current_user

    return permission_checker


def require_all_permissions(permissions: List[Permission]) -> Callable:
    """
    Dependency factory to check if user has ALL of the specified permissions.

    Usage:
        @router.post("/marks/bulk-approve")
        def bulk_approve(
            current_user: User = Depends(require_all_permissions([
                Permission.APPROVE_MARKS,
                Permission.VIEW_DEPARTMENT_MARKS
            ]))
        ):
            ...

    Args:
        permissions: List of required permissions

    Returns:
        Dependency function that validates permissions
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        # Get user's role name
        role_name = current_user.role.name

        # Check if user has all required permissions
        has_all = all(has_permission(role_name, perm) for perm in permissions)

        if not has_all:
            required_perms = ", ".join([p.value for p in permissions])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required (all of): {required_perms}"
            )

        return current_user

    return permission_checker


def require_role(role_name: str) -> Callable:
    """
    Dependency factory to check if user has a specific role.

    Usage:
        @router.get("/admin/dashboard")
        def admin_dashboard(
            current_user: User = Depends(require_role("SUPER_ADMIN"))
        ):
            ...

    Args:
        role_name: The required role name

    Returns:
        Dependency function that validates role
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role.name != role_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {role_name}"
            )

        return current_user

    return role_checker

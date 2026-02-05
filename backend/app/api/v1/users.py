from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.schemas.user import UserCreate, UserUpdate, UserWithRole
from app.core.permissions import Permission
from app.core.security import get_password_hash
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/", response_model=dict)
async def get_users(
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    department_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    batch: Optional[str] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ALL_USERS))
):
    """
    Get all users with filtering and pagination (Super Admin only).

    Requires: VIEW_ALL_USERS permission

    Parameters:
    - batch: Filter students by batch (e.g., "E20", "E21"). Matches student_id patterns like "E/20/xxx" or "E20/xxx".
    """
    stmt = select(User).options(
        selectinload(User.role),
        selectinload(User.department)
    )

    # Apply filters
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            (User.email.like(search_term)) |
            (User.first_name.like(search_term)) |
            (User.last_name.like(search_term)) |
            (User.employee_id.like(search_term)) |
            (User.student_id.like(search_term))
        )

    if role_id:
        stmt = stmt.where(User.role_id == role_id)

    if department_id:
        stmt = stmt.where(User.department_id == department_id)

    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    # Filter by batch (e.g., "E20" matches "E/20/xxx", "E20/xxx", "E.20.xxx", "E-20-xxx")
    if batch:
        import re
        match = re.match(r'([A-Z]+)(\d{2})', batch, re.IGNORECASE)
        if match:
            prefix = match.group(1).upper()
            year = match.group(2)
            batch_pattern = f"{prefix}%{year}%"
            stmt = stmt.where(User.student_id.ilike(batch_pattern))

    # Order by most recent first
    stmt = stmt.order_by(User.created_at.desc())

    # Paginate
    paginated = await paginate(db, stmt, page, page_size)

    # Build response
    items = []
    for user in paginated["items"]:
        user_data = UserWithRole(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            employee_id=user.employee_id,
            student_id=user.student_id,
            role_id=user.role_id,
            department_id=user.department_id,
            is_active=user.is_active,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
            role_name=user.role.name if user.role else None,
            department_name=user.department.name if user.department else None
        )
        items.append(user_data)

    paginated["items"] = items
    return paginated


@router.get("/stats/counts", response_model=dict)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ALL_USERS))
):
    """
    Get user statistics including counts by role (Super Admin only).

    Requires: VIEW_ALL_USERS permission

    Returns:
    - total_users: Total number of users
    - total_active: Number of active users
    - by_role: Count of users per role
    """
    # Total users count
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar()

    # Active users count
    result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    total_active = result.scalar()

    # Count by role
    result = await db.execute(
        select(Role.name, func.count(User.id).label('count'))
        .join(User, User.role_id == Role.id)
        .group_by(Role.name)
    )
    role_counts = result.all()

    by_role = {role_name: count for role_name, count in role_counts}

    return {
        "total_users": total_users,
        "total_active": total_active,
        "by_role": by_role,
        "total_students": by_role.get("STUDENT", 0),
        "total_lecturers": by_role.get("LECTURER", 0),
        "total_hods": by_role.get("HOD", 0),
        "total_super_admins": by_role.get("SUPER_ADMIN", 0),
    }


@router.get("/{user_id}", response_model=UserWithRole)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ALL_USERS))
):
    """
    Get a specific user by ID (Super Admin only).

    Requires: VIEW_ALL_USERS permission
    """
    result = await db.execute(
        select(User).options(
            selectinload(User.role),
            selectinload(User.department)
        ).where(User.id == user_id)
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserWithRole(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        employee_id=user.employee_id,
        student_id=user.student_id,
        role_id=user.role_id,
        department_id=user.department_id,
        is_active=user.is_active,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
        role_name=user.role.name if user.role else None,
        department_name=user.department.name if user.department else None
    )


@router.post("/", response_model=UserWithRole, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS))
):
    """
    Create a new user (Super Admin only).

    Requires: MANAGE_USERS permission
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Check if employee_id already exists (if provided)
    if user_data.employee_id:
        result = await db.execute(select(User).where(User.employee_id == user_data.employee_id))
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee ID already exists"
            )

    # Check if student_id already exists (if provided)
    if user_data.student_id:
        result = await db.execute(select(User).where(User.student_id == user_data.student_id))
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student ID already exists"
            )

    # Verify role exists
    result = await db.execute(select(Role).where(Role.id == user_data.role_id))
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Verify department exists (if provided)
    if user_data.department_id:
        result = await db.execute(select(Department).where(Department.id == user_data.department_id))
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

    # Hash password
    password_hash = get_password_hash(user_data.password)

    # Create user
    new_user = User(
        email=user_data.email,
        password_hash=password_hash,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        employee_id=user_data.employee_id,
        student_id=user_data.student_id,
        role_id=user_data.role_id,
        department_id=user_data.department_id,
        is_active=user_data.is_active
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Reload with relationships
    result = await db.execute(
        select(User).options(
            selectinload(User.role),
            selectinload(User.department)
        ).where(User.id == new_user.id)
    )
    new_user = result.scalars().first()

    return UserWithRole(
        id=new_user.id,
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        employee_id=new_user.employee_id,
        student_id=new_user.student_id,
        role_id=new_user.role_id,
        department_id=new_user.department_id,
        is_active=new_user.is_active,
        last_login=new_user.last_login,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at,
        role_name=new_user.role.name if new_user.role else None,
        department_name=new_user.department.name if new_user.department else None
    )


@router.put("/{user_id}", response_model=UserWithRole)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS))
):
    """
    Update a user (Super Admin only).

    Requires: MANAGE_USERS permission
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update fields if provided
    if user_data.email is not None:
        result = await db.execute(
            select(User).where(User.email == user_data.email, User.id != user_id)
        )
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        user.email = user_data.email

    if user_data.first_name is not None:
        user.first_name = user_data.first_name

    if user_data.last_name is not None:
        user.last_name = user_data.last_name

    if user_data.employee_id is not None:
        result = await db.execute(
            select(User).where(User.employee_id == user_data.employee_id, User.id != user_id)
        )
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee ID already exists"
            )
        user.employee_id = user_data.employee_id

    if user_data.student_id is not None:
        result = await db.execute(
            select(User).where(User.student_id == user_data.student_id, User.id != user_id)
        )
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student ID already exists"
            )
        user.student_id = user_data.student_id

    if user_data.role_id is not None:
        result = await db.execute(select(Role).where(Role.id == user_data.role_id))
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        user.role_id = user_data.role_id

    if user_data.department_id is not None:
        result = await db.execute(select(Department).where(Department.id == user_data.department_id))
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        user.department_id = user_data.department_id

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    if user_data.password is not None:
        user.password_hash = get_password_hash(user_data.password)

    await db.commit()
    await db.refresh(user)

    # Reload with relationships
    result = await db.execute(
        select(User).options(
            selectinload(User.role),
            selectinload(User.department)
        ).where(User.id == user.id)
    )
    user = result.scalars().first()

    return UserWithRole(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        employee_id=user.employee_id,
        student_id=user.student_id,
        role_id=user.role_id,
        department_id=user.department_id,
        is_active=user.is_active,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
        role_name=user.role.name if user.role else None,
        department_name=user.department.name if user.department else None
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS))
):
    """
    Delete a user (Super Admin only).

    Requires: MANAGE_USERS permission
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    await db.delete(user)
    await db.commit()

    return None

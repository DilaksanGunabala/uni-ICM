from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.core.permissions import Permission
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/", response_model=dict)
async def get_departments(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all departments with filtering and pagination."""
    stmt = select(Department).options(selectinload(Department.hod))

    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            (Department.code.like(search_term)) |
            (Department.name.like(search_term))
        )

    if is_active is not None:
        stmt = stmt.where(Department.is_active == is_active)

    stmt = stmt.order_by(Department.code)
    paginated = await paginate(db, stmt, page, page_size)

    items = []
    for dept in paginated["items"]:
        dept_data = DepartmentResponse(
            id=dept.id, code=dept.code, name=dept.name,
            hod_id=dept.hod_id, is_active=dept.is_active,
            created_at=dept.created_at, updated_at=dept.updated_at,
            hod_name=dept.hod.full_name if dept.hod else None
        )
        items.append(dept_data)

    paginated["items"] = items
    return paginated


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific department by ID."""
    result = await db.execute(
        select(Department).options(selectinload(Department.hod)).where(Department.id == department_id)
    )
    department = result.scalars().first()

    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    return DepartmentResponse(
        id=department.id, code=department.code, name=department.name,
        hod_id=department.hod_id, is_active=department.is_active,
        created_at=department.created_at, updated_at=department.updated_at,
        hod_name=department.hod.full_name if department.hod else None
    )


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept_data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS))
):
    """Create a new department (Super Admin only)."""
    result = await db.execute(select(Department).where(Department.code == dept_data.code))
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Department code '{dept_data.code}' already exists")

    if dept_data.hod_id:
        result = await db.execute(select(User).where(User.id == dept_data.hod_id))
        if not result.scalars().first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD user not found")

    new_dept = Department(code=dept_data.code, name=dept_data.name, hod_id=dept_data.hod_id, is_active=dept_data.is_active)
    db.add(new_dept)
    await db.commit()
    await db.refresh(new_dept)

    return DepartmentResponse(
        id=new_dept.id, code=new_dept.code, name=new_dept.name,
        hod_id=new_dept.hod_id, is_active=new_dept.is_active,
        created_at=new_dept.created_at, updated_at=new_dept.updated_at,
        hod_name=new_dept.hod.full_name if new_dept.hod else None
    )


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    dept_data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS))
):
    """Update a department (Super Admin only)."""
    result = await db.execute(select(Department).where(Department.id == department_id))
    department = result.scalars().first()

    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if dept_data.code is not None:
        result = await db.execute(select(Department).where(Department.code == dept_data.code, Department.id != department_id))
        if result.scalars().first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Department code '{dept_data.code}' already exists")
        department.code = dept_data.code

    if dept_data.name is not None:
        department.name = dept_data.name

    if dept_data.hod_id is not None:
        result = await db.execute(select(User).where(User.id == dept_data.hod_id))
        if not result.scalars().first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD user not found")
        department.hod_id = dept_data.hod_id

    if dept_data.is_active is not None:
        department.is_active = dept_data.is_active

    await db.commit()
    await db.refresh(department)

    return DepartmentResponse(
        id=department.id, code=department.code, name=department.name,
        hod_id=department.hod_id, is_active=department.is_active,
        created_at=department.created_at, updated_at=department.updated_at,
        hod_name=department.hod.full_name if department.hod else None
    )


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS))
):
    """Delete a department (Super Admin only)."""
    result = await db.execute(select(Department).where(Department.id == department_id))
    department = result.scalars().first()

    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    await db.delete(department)
    await db.commit()
    return None

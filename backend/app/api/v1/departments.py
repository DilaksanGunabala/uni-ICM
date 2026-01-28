from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.orm import Session, joinedload
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
def get_departments(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all departments with filtering and pagination.

    Accessible to all authenticated users.
    """
    query = db.query(Department).options(joinedload(Department.hod))

    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Department.code.like(search_term)) |
            (Department.name.like(search_term))
        )

    if is_active is not None:
        query = query.filter(Department.is_active == is_active)

    # Order by code
    query = query.order_by(Department.code)

    # Paginate
    paginated = paginate(query, page, page_size)

    # Build response
    items = []
    for dept in paginated["items"]:
        dept_data = DepartmentResponse(
            id=dept.id,
            code=dept.code,
            name=dept.name,
            hod_id=dept.hod_id,
            is_active=dept.is_active,
            created_at=dept.created_at,
            updated_at=dept.updated_at,
            hod_name=dept.hod.full_name if dept.hod else None
        )
        items.append(dept_data)

    paginated["items"] = items
    return paginated


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific department by ID.

    Accessible to all authenticated users.
    """
    department = db.query(Department).options(
        joinedload(Department.hod)
    ).filter(Department.id == department_id).first()

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    return DepartmentResponse(
        id=department.id,
        code=department.code,
        name=department.name,
        hod_id=department.hod_id,
        is_active=department.is_active,
        created_at=department.created_at,
        updated_at=department.updated_at,
        hod_name=department.hod.full_name if department.hod else None
    )


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS))
):
    """
    Create a new department (Super Admin only).

    Requires: MANAGE_DEPARTMENTS permission
    """
    # Check if code already exists
    existing = db.query(Department).filter(Department.code == dept_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department code '{dept_data.code}' already exists"
        )

    # Verify HOD exists if provided
    if dept_data.hod_id:
        hod = db.query(User).filter(User.id == dept_data.hod_id).first()
        if not hod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD user not found"
            )

    # Create department
    new_dept = Department(
        code=dept_data.code,
        name=dept_data.name,
        hod_id=dept_data.hod_id,
        is_active=dept_data.is_active
    )

    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)

    return DepartmentResponse(
        id=new_dept.id,
        code=new_dept.code,
        name=new_dept.name,
        hod_id=new_dept.hod_id,
        is_active=new_dept.is_active,
        created_at=new_dept.created_at,
        updated_at=new_dept.updated_at,
        hod_name=new_dept.hod.full_name if new_dept.hod else None
    )


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    dept_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS))
):
    """
    Update a department (Super Admin only).

    Requires: MANAGE_DEPARTMENTS permission
    """
    department = db.query(Department).filter(Department.id == department_id).first()

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Update fields if provided
    if dept_data.code is not None:
        # Check if code is already taken
        existing = db.query(Department).filter(
            Department.code == dept_data.code,
            Department.id != department_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Department code '{dept_data.code}' already exists"
            )
        department.code = dept_data.code

    if dept_data.name is not None:
        department.name = dept_data.name

    if dept_data.hod_id is not None:
        hod = db.query(User).filter(User.id == dept_data.hod_id).first()
        if not hod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD user not found"
            )
        department.hod_id = dept_data.hod_id

    if dept_data.is_active is not None:
        department.is_active = dept_data.is_active

    db.commit()
    db.refresh(department)

    return DepartmentResponse(
        id=department.id,
        code=department.code,
        name=department.name,
        hod_id=department.hod_id,
        is_active=department.is_active,
        created_at=department.created_at,
        updated_at=department.updated_at,
        hod_name=department.hod.full_name if department.hod else None
    )


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS))
):
    """
    Delete a department (Super Admin only).

    Requires: MANAGE_DEPARTMENTS permission
    Note: This will cascade delete all related subjects, enrollments, etc.
    """
    department = db.query(Department).filter(Department.id == department_id).first()

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    db.delete(department)
    db.commit()

    return None

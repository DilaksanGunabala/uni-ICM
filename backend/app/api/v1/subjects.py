from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.models.department import Department
from app.models.subject import Subject, SubjectAssignment
from app.schemas.subject import (
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    SubjectWithDetails,
    LecturerAssignmentCreate,
    LecturerAssignmentResponse
)
from app.core.permissions import Permission
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/", response_model=dict)
async def get_subjects(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    semester: Optional[int] = None,
    academic_year: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all subjects with filtering and pagination.

    Accessible to all authenticated users.
    """
    stmt = select(Subject).options(
        selectinload(Subject.department),
        selectinload(Subject.coordinator)
    )

    # Apply filters
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            (Subject.code.like(search_term)) |
            (Subject.name.like(search_term))
        )

    if department_id is not None:
        stmt = stmt.where(Subject.department_id == department_id)

    if semester is not None:
        stmt = stmt.where(Subject.semester == semester)

    if is_active is not None:
        stmt = stmt.where(Subject.is_active == is_active)

    # Order by code
    stmt = stmt.order_by(Subject.code)

    # Paginate
    paginated = await paginate(db, stmt, page, page_size)

    # Build response
    items = []
    for subject in paginated["items"]:
        subject_data = SubjectWithDetails(
            id=subject.id,
            code=subject.code,
            name=subject.name,
            department_id=subject.department_id,
            coordinator_id=subject.coordinator_id,
            semester=subject.semester,
            credits=subject.credits,
            is_active=subject.is_active,
            created_at=subject.created_at,
            updated_at=subject.updated_at,
            department_name=subject.department.name if subject.department else None,
            department_code=subject.department.code if subject.department else None,
            coordinator_name=subject.coordinator.full_name if subject.coordinator else None
        )
        items.append(subject_data)

    paginated["items"] = items
    return paginated


@router.get("/{subject_id}", response_model=SubjectWithDetails)
async def get_subject(
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific subject by ID.

    Accessible to all authenticated users.
    """
    result = await db.execute(
        select(Subject).options(
            selectinload(Subject.department),
            selectinload(Subject.coordinator)
        ).where(Subject.id == subject_id)
    )
    subject = result.scalars().first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    return SubjectWithDetails(
        id=subject.id,
        code=subject.code,
        name=subject.name,
        department_id=subject.department_id,
        coordinator_id=subject.coordinator_id,
        semester=subject.semester,
        credits=subject.credits,
        is_active=subject.is_active,
        created_at=subject.created_at,
        updated_at=subject.updated_at,
        department_name=subject.department.name if subject.department else None,
        department_code=subject.department.code if subject.department else None,
        coordinator_name=subject.coordinator.full_name if subject.coordinator else None
    )


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_data: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SUBJECTS))
):
    """
    Create a new subject (Super Admin only).

    Requires: MANAGE_SUBJECTS permission
    """
    # Check if code already exists
    result = await db.execute(select(Subject).where(Subject.code == subject_data.code))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subject code '{subject_data.code}' already exists"
        )

    # Verify department exists (only if department_id is provided)
    if subject_data.department_id is not None:
        result = await db.execute(select(Department).where(Department.id == subject_data.department_id))
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

    # Verify coordinator exists (only if coordinator_id is provided)
    if subject_data.coordinator_id is not None:
        result = await db.execute(select(User).where(User.id == subject_data.coordinator_id))
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coordinator not found"
            )

    # Create subject
    new_subject = Subject(
        code=subject_data.code,
        name=subject_data.name,
        department_id=subject_data.department_id,
        coordinator_id=subject_data.coordinator_id,
        semester=subject_data.semester,
        credits=subject_data.credits,
        is_active=subject_data.is_active
    )

    db.add(new_subject)
    await db.commit()
    await db.refresh(new_subject)

    return SubjectResponse(
        id=new_subject.id,
        code=new_subject.code,
        name=new_subject.name,
        department_id=new_subject.department_id,
        coordinator_id=new_subject.coordinator_id,
        semester=new_subject.semester,
        credits=new_subject.credits,
        is_active=new_subject.is_active,
        created_at=new_subject.created_at,
        updated_at=new_subject.updated_at
    )


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SUBJECTS))
):
    """
    Update a subject (Super Admin only).

    Requires: MANAGE_SUBJECTS permission
    """
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalars().first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Update fields if provided
    if subject_data.code is not None:
        result = await db.execute(
            select(Subject).where(Subject.code == subject_data.code, Subject.id != subject_id)
        )
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subject code '{subject_data.code}' already exists"
            )
        subject.code = subject_data.code

    if subject_data.name is not None:
        subject.name = subject_data.name

    # Handle department_id update
    if 'department_id' in subject_data.model_fields_set:
        if subject_data.department_id is not None:
            result = await db.execute(select(Department).where(Department.id == subject_data.department_id))
            if not result.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Department not found"
                )
        subject.department_id = subject_data.department_id

    # Handle coordinator_id update
    if 'coordinator_id' in subject_data.model_fields_set:
        if subject_data.coordinator_id is not None:
            result = await db.execute(select(User).where(User.id == subject_data.coordinator_id))
            if not result.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Coordinator not found"
                )
        subject.coordinator_id = subject_data.coordinator_id

    if subject_data.semester is not None:
        subject.semester = subject_data.semester

    if subject_data.credits is not None:
        subject.credits = subject_data.credits

    if subject_data.is_active is not None:
        subject.is_active = subject_data.is_active

    await db.commit()
    await db.refresh(subject)

    return SubjectResponse(
        id=subject.id,
        code=subject.code,
        name=subject.name,
        department_id=subject.department_id,
        coordinator_id=subject.coordinator_id,
        semester=subject.semester,
        credits=subject.credits,
        is_active=subject.is_active,
        created_at=subject.created_at,
        updated_at=subject.updated_at
    )


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SUBJECTS))
):
    """
    Delete a subject (Super Admin only).

    Requires: MANAGE_SUBJECTS permission
    Note: This will cascade delete all related enrollments, assessments, marks, etc.
    """
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalars().first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    await db.delete(subject)
    await db.commit()

    return None


# ============================================================================
# LECTURER ASSIGNMENTS
# ============================================================================

@router.get("/{subject_id}/lecturers", response_model=List[LecturerAssignmentResponse])
async def get_subject_lecturers(
    subject_id: int,
    academic_year: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all lecturers assigned to a subject.

    Accessible to all authenticated users.
    Optionally filter by academic year.
    """
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    stmt = select(SubjectAssignment).options(
        selectinload(SubjectAssignment.lecturer),
        selectinload(SubjectAssignment.subject)
    ).where(SubjectAssignment.subject_id == subject_id)

    if academic_year:
        stmt = stmt.where(SubjectAssignment.academic_year == academic_year)

    stmt = stmt.order_by(SubjectAssignment.academic_year.desc())
    result = await db.execute(stmt)
    assignments = result.scalars().unique().all()

    results = []
    for assignment in assignments:
        results.append(LecturerAssignmentResponse(
            id=assignment.id,
            subject_id=assignment.subject_id,
            lecturer_id=assignment.lecturer_id,
            academic_year=assignment.academic_year,
            created_at=assignment.created_at,
            lecturer_name=assignment.lecturer.full_name if assignment.lecturer else None,
            lecturer_email=assignment.lecturer.email if assignment.lecturer else None,
            subject_code=assignment.subject.code if assignment.subject else None,
            subject_name=assignment.subject.name if assignment.subject else None
        ))

    return results


@router.post(
    "/{subject_id}/lecturers",
    response_model=LecturerAssignmentResponse,
    status_code=status.HTTP_201_CREATED
)
async def assign_lecturer_to_subject(
    subject_id: int,
    assignment_data: LecturerAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SUBJECTS))
):
    """
    Assign a lecturer to a subject for a specific academic year (Super Admin only).

    Requires: MANAGE_SUBJECTS permission
    """
    # Verify subject exists
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Verify lecturer exists and is a lecturer
    from app.models.role import Role
    result = await db.execute(
        select(User).join(Role).where(
            User.id == assignment_data.lecturer_id,
            Role.name == "LECTURER"
        )
    )
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecturer not found or user is not a lecturer"
        )

    # Check if assignment already exists
    result = await db.execute(
        select(SubjectAssignment).where(
            SubjectAssignment.subject_id == subject_id,
            SubjectAssignment.lecturer_id == assignment_data.lecturer_id,
            SubjectAssignment.academic_year == assignment_data.academic_year
        )
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lecturer already assigned to this subject for academic year {assignment_data.academic_year}"
        )

    # Create assignment
    new_assignment = SubjectAssignment(
        subject_id=subject_id,
        lecturer_id=assignment_data.lecturer_id,
        academic_year=assignment_data.academic_year
    )

    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)

    # Reload with relationships
    result = await db.execute(
        select(SubjectAssignment).options(
            selectinload(SubjectAssignment.lecturer),
            selectinload(SubjectAssignment.subject)
        ).where(SubjectAssignment.id == new_assignment.id)
    )
    assignment = result.scalars().first()

    return LecturerAssignmentResponse(
        id=assignment.id,
        subject_id=assignment.subject_id,
        lecturer_id=assignment.lecturer_id,
        academic_year=assignment.academic_year,
        created_at=assignment.created_at,
        lecturer_name=assignment.lecturer.full_name if assignment.lecturer else None,
        lecturer_email=assignment.lecturer.email if assignment.lecturer else None,
        subject_code=assignment.subject.code if assignment.subject else None,
        subject_name=assignment.subject.name if assignment.subject else None
    )


@router.delete("/{subject_id}/lecturers/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_lecturer_assignment(
    subject_id: int,
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_SUBJECTS))
):
    """
    Remove a lecturer assignment from a subject (Super Admin only).

    Requires: MANAGE_SUBJECTS permission
    """
    result = await db.execute(
        select(SubjectAssignment).where(
            SubjectAssignment.id == assignment_id,
            SubjectAssignment.subject_id == subject_id
        )
    )
    assignment = result.scalars().first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecturer assignment not found"
        )

    await db.delete(assignment)
    await db.commit()

    return None


# ============================================================================
# LECTURER'S OWN SUBJECTS
# ============================================================================

@router.get("/my/assigned", response_model=List[SubjectWithDetails])
async def get_my_assigned_subjects(
    academic_year: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_OWN_SUBJECTS))
):
    """
    Get subjects assigned to the current lecturer.

    Requires: VIEW_OWN_SUBJECTS permission (Lecturer only)
    """
    stmt = select(Subject).join(SubjectAssignment).options(
        selectinload(Subject.department),
        selectinload(Subject.coordinator)
    ).where(
        SubjectAssignment.lecturer_id == current_user.id
    )

    if academic_year:
        stmt = stmt.where(SubjectAssignment.academic_year == academic_year)

    stmt = stmt.order_by(Subject.code)
    result = await db.execute(stmt)
    subjects = result.scalars().unique().all()

    results = []
    for subject in subjects:
        results.append(SubjectWithDetails(
            id=subject.id,
            code=subject.code,
            name=subject.name,
            department_id=subject.department_id,
            coordinator_id=subject.coordinator_id,
            semester=subject.semester,
            credits=subject.credits,
            is_active=subject.is_active,
            created_at=subject.created_at,
            updated_at=subject.updated_at,
            department_name=subject.department.name if subject.department else None,
            department_code=subject.department.code if subject.department else None,
            coordinator_name=subject.coordinator.full_name if subject.coordinator else None
        ))

    return results

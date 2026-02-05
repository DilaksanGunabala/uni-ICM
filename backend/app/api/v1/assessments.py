from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import date

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.models.subject import Subject, SubjectAssignment
from app.models.assessment import Assessment, AssessmentType
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    AssessmentWithDetails
)
from app.core.permissions import Permission
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/", response_model=dict)
async def get_assessments(
    subject_id: Optional[int] = None,
    assessment_type: Optional[AssessmentType] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all assessments with filtering and pagination.

    Accessible to all authenticated users.
    """
    stmt = select(Assessment).options(
        selectinload(Assessment.subject).selectinload(Subject.department)
    )

    # Apply filters
    if subject_id is not None:
        stmt = stmt.where(Assessment.subject_id == subject_id)

    if assessment_type is not None:
        stmt = stmt.where(Assessment.assessment_type == assessment_type)

    # Order by subject_id and assessment_date
    stmt = stmt.order_by(Assessment.subject_id, Assessment.assessment_date)

    # Paginate
    paginated = await paginate(db, stmt, page, page_size)

    # Build response
    items = []
    for assessment in paginated["items"]:
        items.append(_build_assessment_with_details(assessment))

    paginated["items"] = items
    return paginated


@router.get("/{assessment_id}", response_model=AssessmentWithDetails)
async def get_assessment(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific assessment by ID.

    Accessible to all authenticated users.
    """
    result = await db.execute(
        select(Assessment).options(
            selectinload(Assessment.subject).selectinload(Subject.department)
        ).where(Assessment.id == assessment_id)
    )
    assessment = result.scalars().first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )

    return _build_assessment_with_details(assessment)


@router.post("/", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    assessment_data: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ASSESSMENTS))
):
    """
    Create a new assessment.

    Requires: MANAGE_ASSESSMENTS permission (Super Admin, HOD)
    Lecturers can also create assessments for their assigned subjects.
    """
    # Verify subject exists
    result = await db.execute(select(Subject).where(Subject.id == assessment_data.subject_id))
    subject = result.scalars().first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Check if lecturer has permission for this specific subject
    from app.models.role import Role
    result = await db.execute(select(Role).where(Role.id == current_user.role_id))
    user_role = result.scalars().first()

    if user_role.name == "LECTURER":
        # Verify lecturer is assigned to this subject
        result = await db.execute(
            select(SubjectAssignment).where(
                SubjectAssignment.subject_id == assessment_data.subject_id,
                SubjectAssignment.lecturer_id == current_user.id
            )
        )
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this subject"
            )

    # Create assessment
    new_assessment = Assessment(
        subject_id=assessment_data.subject_id,
        name=assessment_data.name,
        assessment_type=assessment_data.assessment_type,
        max_marks=assessment_data.max_marks,
        weightage=assessment_data.weightage,
        assessment_date=assessment_data.assessment_date,
        academic_year=assessment_data.academic_year,
        description=assessment_data.description
    )

    db.add(new_assessment)
    await db.commit()
    await db.refresh(new_assessment)

    return AssessmentResponse(
        id=new_assessment.id,
        subject_id=new_assessment.subject_id,
        name=new_assessment.name,
        assessment_type=new_assessment.assessment_type,
        max_marks=new_assessment.max_marks,
        weightage=new_assessment.weightage,
        assessment_date=new_assessment.assessment_date,
        academic_year=new_assessment.academic_year,
        description=new_assessment.description,
        is_active=new_assessment.is_active,
        created_at=new_assessment.created_at,
        updated_at=new_assessment.updated_at
    )


@router.put("/{assessment_id}", response_model=AssessmentResponse)
async def update_assessment(
    assessment_id: int,
    assessment_data: AssessmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ASSESSMENTS))
):
    """
    Update an assessment.

    Requires: MANAGE_ASSESSMENTS permission (Super Admin, HOD)
    Lecturers can update assessments for their assigned subjects.
    """
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalars().first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )

    # Check if lecturer has permission for this specific subject
    from app.models.role import Role
    result = await db.execute(select(Role).where(Role.id == current_user.role_id))
    user_role = result.scalars().first()

    if user_role.name == "LECTURER":
        result = await db.execute(
            select(SubjectAssignment).where(
                SubjectAssignment.subject_id == assessment.subject_id,
                SubjectAssignment.lecturer_id == current_user.id
            )
        )
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this subject"
            )

    # Update fields if provided
    if assessment_data.name is not None:
        assessment.name = assessment_data.name

    if assessment_data.assessment_type is not None:
        assessment.assessment_type = assessment_data.assessment_type

    if assessment_data.max_marks is not None:
        assessment.max_marks = assessment_data.max_marks

    if assessment_data.weightage is not None:
        assessment.weightage = assessment_data.weightage

    if assessment_data.assessment_date is not None:
        assessment.assessment_date = assessment_data.assessment_date

    if assessment_data.description is not None:
        assessment.description = assessment_data.description

    if assessment_data.is_active is not None:
        assessment.is_active = assessment_data.is_active

    await db.commit()
    await db.refresh(assessment)

    return AssessmentResponse(
        id=assessment.id,
        subject_id=assessment.subject_id,
        name=assessment.name,
        assessment_type=assessment.assessment_type,
        max_marks=assessment.max_marks,
        weightage=assessment.weightage,
        assessment_date=assessment.assessment_date,
        academic_year=assessment.academic_year,
        description=assessment.description,
        is_active=assessment.is_active,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at
    )


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assessment(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ASSESSMENTS))
):
    """
    Delete an assessment.

    Requires: MANAGE_ASSESSMENTS permission (Super Admin, HOD)
    Lecturers can delete assessments for their assigned subjects.
    Note: This will cascade delete all related marks.
    """
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalars().first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )

    # Check if lecturer has permission for this specific subject
    from app.models.role import Role
    result = await db.execute(select(Role).where(Role.id == current_user.role_id))
    user_role = result.scalars().first()

    if user_role.name == "LECTURER":
        result = await db.execute(
            select(SubjectAssignment).where(
                SubjectAssignment.subject_id == assessment.subject_id,
                SubjectAssignment.lecturer_id == current_user.id
            )
        )
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this subject"
            )

    await db.delete(assessment)
    await db.commit()

    return None


# ============================================================================
# ASSESSMENTS BY SUBJECT
# ============================================================================

@router.get("/subject/{subject_id}/list", response_model=List[AssessmentWithDetails])
async def get_assessments_by_subject(
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all assessments for a specific subject.

    Accessible to all authenticated users.
    Useful for lecturers and students to see all assessments for a subject.
    """
    # Verify subject exists
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    result = await db.execute(
        select(Assessment).options(
            selectinload(Assessment.subject).selectinload(Subject.department)
        ).where(
            Assessment.subject_id == subject_id
        ).order_by(Assessment.assessment_date)
    )
    assessments = result.scalars().unique().all()

    results = []
    for assessment in assessments:
        results.append(_build_assessment_with_details(assessment))

    return results


# ============================================================================
# LECTURER'S ASSESSMENTS
# ============================================================================

@router.get("/my/assessments", response_model=List[AssessmentWithDetails])
async def get_my_assessments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_OWN_SUBJECTS))
):
    """
    Get all assessments for subjects assigned to the current lecturer.

    Requires: VIEW_OWN_SUBJECTS permission (Lecturer only)
    """
    # Get all subjects assigned to this lecturer
    result = await db.execute(
        select(SubjectAssignment.subject_id).where(
            SubjectAssignment.lecturer_id == current_user.id
        )
    )
    subject_ids = [row[0] for row in result.all()]

    if not subject_ids:
        return []

    result = await db.execute(
        select(Assessment).options(
            selectinload(Assessment.subject).selectinload(Subject.department)
        ).where(
            Assessment.subject_id.in_(subject_ids)
        ).order_by(Assessment.subject_id, Assessment.assessment_date)
    )
    assessments = result.scalars().unique().all()

    results = []
    for assessment in assessments:
        results.append(_build_assessment_with_details(assessment))

    return results


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _build_assessment_with_details(assessment: Assessment) -> AssessmentWithDetails:
    """Build AssessmentWithDetails response from Assessment model."""
    return AssessmentWithDetails(
        id=assessment.id,
        subject_id=assessment.subject_id,
        name=assessment.name,
        assessment_type=assessment.assessment_type,
        max_marks=assessment.max_marks,
        weightage=assessment.weightage,
        assessment_date=assessment.assessment_date,
        academic_year=assessment.academic_year,
        description=assessment.description,
        is_active=assessment.is_active,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
        subject_code=assessment.subject.code if assessment.subject else None,
        subject_name=assessment.subject.name if assessment.subject else None,
        subject_semester=assessment.subject.semester if assessment.subject else None,
        department_name=assessment.subject.department.name if assessment.subject and assessment.subject.department else None
    )

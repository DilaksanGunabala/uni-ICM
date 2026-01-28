from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.orm import Session, joinedload
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
def get_assessments(
    subject_id: Optional[int] = None,
    assessment_type: Optional[AssessmentType] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all assessments with filtering and pagination.

    Accessible to all authenticated users.
    """
    query = db.query(Assessment).options(
        joinedload(Assessment.subject).joinedload(Subject.department)
    )

    # Apply filters
    if subject_id is not None:
        query = query.filter(Assessment.subject_id == subject_id)

    if assessment_type is not None:
        query = query.filter(Assessment.assessment_type == assessment_type)

    # Order by subject_id and due_date
    query = query.order_by(Assessment.subject_id, Assessment.due_date)

    # Paginate
    paginated = paginate(query, page, page_size)

    # Build response
    items = []
    for assessment in paginated["items"]:
        items.append(_build_assessment_with_details(assessment))

    paginated["items"] = items
    return paginated


@router.get("/{assessment_id}", response_model=AssessmentWithDetails)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific assessment by ID.

    Accessible to all authenticated users.
    """
    assessment = db.query(Assessment).options(
        joinedload(Assessment.subject).joinedload(Subject.department)
    ).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )

    return _build_assessment_with_details(assessment)


@router.post("/", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    assessment_data: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ASSESSMENTS))
):
    """
    Create a new assessment.

    Requires: MANAGE_ASSESSMENTS permission (Super Admin, HOD)
    Lecturers can also create assessments for their assigned subjects.
    """
    # Verify subject exists
    subject = db.query(Subject).filter(
        Subject.id == assessment_data.subject_id
    ).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Check if lecturer has permission for this specific subject
    from app.models.role import Role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    if user_role.name == "LECTURER":
        # Verify lecturer is assigned to this subject
        assignment = db.query(SubjectAssignment).filter(
            SubjectAssignment.subject_id == assessment_data.subject_id,
            SubjectAssignment.lecturer_id == current_user.id
        ).first()
        if not assignment:
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
        due_date=assessment_data.due_date
    )

    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    return AssessmentResponse(
        id=new_assessment.id,
        subject_id=new_assessment.subject_id,
        name=new_assessment.name,
        assessment_type=new_assessment.assessment_type,
        max_marks=new_assessment.max_marks,
        weightage=new_assessment.weightage,
        due_date=new_assessment.due_date,
        created_at=new_assessment.created_at,
        updated_at=new_assessment.updated_at
    )


@router.put("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: int,
    assessment_data: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ASSESSMENTS))
):
    """
    Update an assessment.

    Requires: MANAGE_ASSESSMENTS permission (Super Admin, HOD)
    Lecturers can update assessments for their assigned subjects.
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )

    # Check if lecturer has permission for this specific subject
    from app.models.role import Role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    if user_role.name == "LECTURER":
        # Verify lecturer is assigned to this subject
        assignment = db.query(SubjectAssignment).filter(
            SubjectAssignment.subject_id == assessment.subject_id,
            SubjectAssignment.lecturer_id == current_user.id
        ).first()
        if not assignment:
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

    if assessment_data.due_date is not None:
        assessment.due_date = assessment_data.due_date

    db.commit()
    db.refresh(assessment)

    return AssessmentResponse(
        id=assessment.id,
        subject_id=assessment.subject_id,
        name=assessment.name,
        assessment_type=assessment.assessment_type,
        max_marks=assessment.max_marks,
        weightage=assessment.weightage,
        due_date=assessment.due_date,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at
    )


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ASSESSMENTS))
):
    """
    Delete an assessment.

    Requires: MANAGE_ASSESSMENTS permission (Super Admin, HOD)
    Lecturers can delete assessments for their assigned subjects.
    Note: This will cascade delete all related marks.
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )

    # Check if lecturer has permission for this specific subject
    from app.models.role import Role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    if user_role.name == "LECTURER":
        # Verify lecturer is assigned to this subject
        assignment = db.query(SubjectAssignment).filter(
            SubjectAssignment.subject_id == assessment.subject_id,
            SubjectAssignment.lecturer_id == current_user.id
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this subject"
            )

    db.delete(assessment)
    db.commit()

    return None


# ============================================================================
# ASSESSMENTS BY SUBJECT
# ============================================================================

@router.get("/subject/{subject_id}/list", response_model=List[AssessmentWithDetails])
def get_assessments_by_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all assessments for a specific subject.

    Accessible to all authenticated users.
    Useful for lecturers and students to see all assessments for a subject.
    """
    # Verify subject exists
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    assessments = db.query(Assessment).options(
        joinedload(Assessment.subject).joinedload(Subject.department)
    ).filter(
        Assessment.subject_id == subject_id
    ).order_by(Assessment.due_date).all()

    results = []
    for assessment in assessments:
        results.append(_build_assessment_with_details(assessment))

    return results


# ============================================================================
# LECTURER'S ASSESSMENTS
# ============================================================================

@router.get("/my/assessments", response_model=List[AssessmentWithDetails])
def get_my_assessments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_OWN_SUBJECTS))
):
    """
    Get all assessments for subjects assigned to the current lecturer.

    Requires: VIEW_OWN_SUBJECTS permission (Lecturer only)
    """
    # Get all subjects assigned to this lecturer
    subject_ids = db.query(SubjectAssignment.subject_id).filter(
        SubjectAssignment.lecturer_id == current_user.id
    ).all()
    subject_ids = [sid[0] for sid in subject_ids]

    if not subject_ids:
        return []

    assessments = db.query(Assessment).options(
        joinedload(Assessment.subject).joinedload(Subject.department)
    ).filter(
        Assessment.subject_id.in_(subject_ids)
    ).order_by(Assessment.subject_id, Assessment.due_date).all()

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
        due_date=assessment.due_date,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
        subject_code=assessment.subject.code if assessment.subject else None,
        subject_name=assessment.subject.name if assessment.subject else None,
        subject_semester=assessment.subject.semester if assessment.subject else None,
        department_name=assessment.subject.department.name if assessment.subject and assessment.subject.department else None
    )

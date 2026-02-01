from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rbac import require_permission, require_any_permission
from app.middleware.audit import get_client_ip, get_user_agent
from app.models.user import User
from app.models.mark import Mark
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.subject import Subject
from app.schemas.mark import MarkCreate, MarkUpdate, MarkApproval, MarkResponse
from app.core.permissions import Permission
from app.core.constants import MarkStatus
from app.services.mark_service import MarkService
from app.utils.pagination import paginate

router = APIRouter()


@router.post("/", response_model=MarkResponse, status_code=status.HTTP_201_CREATED)
def create_marks(
    mark_data: MarkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ENTER_MARKS))
):
    """
    Create new marks entry (Lecturer only).

    Requires: ENTER_MARKS permission
    Status: PENDING (awaiting HOD approval)
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    mark = MarkService.submit_marks(
        db=db,
        enrollment_id=mark_data.enrollment_id,
        assessment_id=mark_data.assessment_id,
        marks_obtained=float(mark_data.marks_obtained),
        is_absent=mark_data.is_absent,
        lecturer=current_user,
        ip_address=ip_address,
        user_agent=user_agent
    )

    # Load relationships for response
    db.refresh(mark)
    return _build_mark_response(db, mark)


@router.get("/", response_model=dict)
def get_marks(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    semester: Optional[int] = None,
    assessment_type: Optional[str] = None,
    status_filter: Optional[MarkStatus] = QueryParam(None, alias="status"),
    academic_year: Optional[str] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get marks with filtering and pagination.

    Access control:
    - SUPER_ADMIN: See all marks
    - HOD: See all marks in their department
    - LECTURER: See marks they submitted
    - STUDENT: See only their own approved marks
    """
    # Start with base query
    query = db.query(Mark).options(
        joinedload(Mark.enrollment).joinedload(Enrollment.student),
        joinedload(Mark.enrollment).joinedload(Enrollment.subject),
        joinedload(Mark.assessment),
        joinedload(Mark.submitter),
        joinedload(Mark.reviewer)
    )

    # Apply role-based filtering
    role_name = current_user.role.name

    if role_name == "STUDENT":
        # Students see only their own approved marks
        query = query.filter(
            Mark.enrollment.has(Enrollment.student_id == current_user.id),
            Mark.status == MarkStatus.APPROVED
        )
    elif role_name == "LECTURER":
        # Lecturers see marks they submitted
        query = query.filter(Mark.submitted_by == current_user.id)
    elif role_name == "HOD":
        # HOD sees all marks in their department
        query = query.filter(
            Mark.enrollment.has(
                Enrollment.subject.has(Subject.department_id == current_user.department_id)
            )
        )
    # SUPER_ADMIN sees all marks (no additional filter)

    # Apply additional filters using .has() to avoid multiple joins
    if student_id:
        query = query.filter(Mark.enrollment.has(Enrollment.student_id == student_id))
    if subject_id:
        query = query.filter(Mark.assessment.has(Assessment.subject_id == subject_id))
    if semester:
        query = query.filter(Mark.enrollment.has(Enrollment.semester == semester))
    if assessment_type:
        query = query.filter(Mark.assessment.has(Assessment.assessment_type == assessment_type))
    if status_filter:
        query = query.filter(Mark.status == status_filter)
    if academic_year:
        query = query.filter(Mark.enrollment.has(Enrollment.academic_year == academic_year))

    # Order by most recent first
    query = query.order_by(Mark.submitted_at.desc())

    # Paginate
    paginated = paginate(query, page, page_size)

    # Build response items
    items = [_build_mark_response(db, mark) for mark in paginated["items"]]
    paginated["items"] = items

    return paginated


@router.get("/{mark_id}", response_model=MarkResponse)
def get_mark_by_id(
    mark_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific mark by ID.

    Access control:
    - Users can only see marks they have permission to view based on their role
    """
    mark = db.query(Mark).options(
        joinedload(Mark.enrollment).joinedload(Enrollment.student),
        joinedload(Mark.enrollment).joinedload(Enrollment.subject),
        joinedload(Mark.assessment),
        joinedload(Mark.submitter),
        joinedload(Mark.reviewer)
    ).filter(Mark.id == mark_id).first()

    if not mark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mark not found"
        )

    # Check access permissions
    role_name = current_user.role.name
    enrollment = mark.enrollment

    if role_name == "STUDENT":
        if enrollment.student_id != current_user.id or mark.status != MarkStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif role_name == "LECTURER":
        if mark.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif role_name == "HOD":
        subject = enrollment.subject
        if subject.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    return _build_mark_response(db, mark)


@router.put("/{mark_id}", response_model=MarkResponse)
def update_marks(
    mark_id: int,
    mark_update: MarkUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.EDIT_MARKS))
):
    """
    Update marks (Lecturer only, only if PENDING or REJECTED).

    Requires: EDIT_MARKS permission
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    mark = MarkService.update_marks(
        db=db,
        mark_id=mark_id,
        marks_obtained=float(mark_update.marks_obtained),
        is_absent=mark_update.is_absent,
        lecturer=current_user,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return _build_mark_response(db, mark)


@router.put("/{mark_id}/approve", response_model=MarkResponse)
def approve_marks(
    mark_id: int,
    approval: MarkApproval,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.APPROVE_MARKS))
):
    """
    Approve marks (HOD only).

    Requires: APPROVE_MARKS permission
    Makes marks visible to students
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    mark = MarkService.approve_marks(
        db=db,
        mark_id=mark_id,
        hod=current_user,
        comments=approval.comments,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return _build_mark_response(db, mark)


@router.put("/{mark_id}/reject", response_model=MarkResponse)
def reject_marks(
    mark_id: int,
    rejection: MarkApproval,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REJECT_MARKS))
):
    """
    Reject marks (HOD only).

    Requires: REJECT_MARKS permission
    Allows lecturer to re-edit
    """
    if not rejection.comments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection comments are required"
        )

    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    mark = MarkService.reject_marks(
        db=db,
        mark_id=mark_id,
        hod=current_user,
        comments=rejection.comments,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return _build_mark_response(db, mark)


@router.delete("/{mark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_marks(
    mark_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DELETE_MARKS))
):
    """
    Delete marks (Lecturer only, only if PENDING or REJECTED).

    Requires: DELETE_MARKS permission
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    MarkService.delete_marks(
        db=db,
        mark_id=mark_id,
        lecturer=current_user,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return None


def _build_mark_response(db: Session, mark: Mark) -> MarkResponse:
    """Helper function to build mark response with additional info"""
    enrollment = mark.enrollment
    student = enrollment.student
    subject = enrollment.subject
    assessment = mark.assessment
    submitter = mark.submitter
    reviewer = mark.reviewer

    return MarkResponse(
        id=mark.id,
        enrollment_id=mark.enrollment_id,
        assessment_id=mark.assessment_id,
        marks_obtained=mark.marks_obtained,
        is_absent=mark.is_absent,
        status=mark.status,
        submitted_by=mark.submitted_by,
        submitted_at=mark.submitted_at,
        reviewed_by=mark.reviewed_by,
        reviewed_at=mark.reviewed_at,
        review_comments=mark.review_comments,
        created_at=mark.created_at,
        updated_at=mark.updated_at,
        student_name=student.full_name,
        student_id=student.student_id,
        subject_name=subject.name,
        subject_code=subject.code,
        assessment_name=assessment.name,
        assessment_type=assessment.assessment_type.value,
        max_marks=assessment.max_marks,
        semester=enrollment.semester,
        submitted_by_name=submitter.full_name,
        reviewed_by_name=reviewer.full_name if reviewer else None
    )

from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import date

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.models.subject import Subject
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.schemas.enrollment import (
    EnrollmentCreate,
    EnrollmentUpdate,
    EnrollmentResponse,
    EnrollmentWithDetails
)
from app.core.permissions import Permission
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/", response_model=dict)
def get_enrollments(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    status_filter: Optional[EnrollmentStatus] = QueryParam(None, alias="status"),
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ALL_ENROLLMENTS))
):
    """
    Get all enrollments with filtering and pagination.

    Requires: VIEW_ALL_ENROLLMENTS permission (Super Admin, HOD)
    """
    query = db.query(Enrollment).options(
        joinedload(Enrollment.student),
        joinedload(Enrollment.subject).joinedload(Subject.department)
    )

    # Apply filters
    if student_id is not None:
        query = query.filter(Enrollment.student_id == student_id)

    if subject_id is not None:
        query = query.filter(Enrollment.subject_id == subject_id)

    if academic_year is not None:
        query = query.filter(Enrollment.academic_year == academic_year)

    if status_filter is not None:
        query = query.filter(Enrollment.status == status_filter)

    # Order by enrollment date (most recent first)
    query = query.order_by(Enrollment.enrollment_date.desc())

    # Paginate
    paginated = paginate(query, page, page_size)

    # Build response
    items = []
    for enrollment in paginated["items"]:
        items.append(_build_enrollment_with_details(enrollment))

    paginated["items"] = items
    return paginated


@router.get("/{enrollment_id}", response_model=EnrollmentWithDetails)
def get_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_ALL_ENROLLMENTS))
):
    """
    Get a specific enrollment by ID.

    Requires: VIEW_ALL_ENROLLMENTS permission (Super Admin, HOD)
    """
    enrollment = db.query(Enrollment).options(
        joinedload(Enrollment.student),
        joinedload(Enrollment.subject).joinedload(Subject.department)
    ).filter(Enrollment.id == enrollment_id).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )

    return _build_enrollment_with_details(enrollment)


@router.post("/", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ENROLLMENTS))
):
    """
    Create a new enrollment (Super Admin only).

    Requires: MANAGE_ENROLLMENTS permission
    """
    # Verify student exists
    from app.models.role import Role
    student = db.query(User).join(Role).filter(
        User.id == enrollment_data.student_id,
        Role.name == "STUDENT"
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found or user is not a student"
        )

    # Verify subject exists
    subject = db.query(Subject).filter(
        Subject.id == enrollment_data.subject_id
    ).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Check if enrollment already exists
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == enrollment_data.student_id,
        Enrollment.subject_id == enrollment_data.subject_id,
        Enrollment.academic_year == enrollment_data.academic_year
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student already enrolled in this subject for academic year {enrollment_data.academic_year}"
        )

    # Create enrollment
    new_enrollment = Enrollment(
        student_id=enrollment_data.student_id,
        subject_id=enrollment_data.subject_id,
        academic_year=enrollment_data.academic_year,
        enrollment_date=enrollment_data.enrollment_date or date.today(),
        status=enrollment_data.status or EnrollmentStatus.ACTIVE
    )

    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)

    return EnrollmentResponse(
        id=new_enrollment.id,
        student_id=new_enrollment.student_id,
        subject_id=new_enrollment.subject_id,
        academic_year=new_enrollment.academic_year,
        enrollment_date=new_enrollment.enrollment_date,
        status=new_enrollment.status,
        created_at=new_enrollment.created_at,
        updated_at=new_enrollment.updated_at
    )


@router.put("/{enrollment_id}", response_model=EnrollmentResponse)
def update_enrollment(
    enrollment_id: int,
    enrollment_data: EnrollmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ENROLLMENTS))
):
    """
    Update an enrollment (Super Admin only).

    Typically used to change enrollment status (ACTIVE, DROPPED, COMPLETED).
    Requires: MANAGE_ENROLLMENTS permission
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )

    # Update fields if provided
    if enrollment_data.status is not None:
        enrollment.status = enrollment_data.status

    if enrollment_data.enrollment_date is not None:
        enrollment.enrollment_date = enrollment_data.enrollment_date

    if enrollment_data.academic_year is not None:
        # Check if new academic year would create duplicate
        existing = db.query(Enrollment).filter(
            Enrollment.student_id == enrollment.student_id,
            Enrollment.subject_id == enrollment.subject_id,
            Enrollment.academic_year == enrollment_data.academic_year,
            Enrollment.id != enrollment_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Student already enrolled in this subject for academic year {enrollment_data.academic_year}"
            )
        enrollment.academic_year = enrollment_data.academic_year

    db.commit()
    db.refresh(enrollment)

    return EnrollmentResponse(
        id=enrollment.id,
        student_id=enrollment.student_id,
        subject_id=enrollment.subject_id,
        academic_year=enrollment.academic_year,
        enrollment_date=enrollment.enrollment_date,
        status=enrollment.status,
        created_at=enrollment.created_at,
        updated_at=enrollment.updated_at
    )


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ENROLLMENTS))
):
    """
    Delete an enrollment (Super Admin only).

    Requires: MANAGE_ENROLLMENTS permission
    Note: This will cascade delete all related marks for this enrollment.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )

    db.delete(enrollment)
    db.commit()

    return None


# ============================================================================
# STUDENT'S OWN ENROLLMENTS
# ============================================================================

@router.get("/my/enrollments", response_model=List[EnrollmentWithDetails])
def get_my_enrollments(
    academic_year: Optional[str] = None,
    status_filter: Optional[EnrollmentStatus] = QueryParam(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_OWN_ENROLLMENTS))
):
    """
    Get enrollments for the current student.

    Requires: VIEW_OWN_ENROLLMENTS permission (Student only)
    """
    query = db.query(Enrollment).options(
        joinedload(Enrollment.subject).joinedload(Subject.department)
    ).filter(Enrollment.student_id == current_user.id)

    if academic_year:
        query = query.filter(Enrollment.academic_year == academic_year)

    if status_filter is not None:
        query = query.filter(Enrollment.status == status_filter)

    enrollments = query.order_by(Enrollment.enrollment_date.desc()).all()

    results = []
    for enrollment in enrollments:
        results.append(_build_enrollment_with_details(enrollment))

    return results


# ============================================================================
# BULK ENROLLMENT
# ============================================================================

@router.post("/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
def bulk_enroll_students(
    enrollments_data: List[EnrollmentCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.MANAGE_ENROLLMENTS))
):
    """
    Bulk enroll multiple students (Super Admin only).

    Creates multiple enrollments in a single transaction.
    Returns success count and any errors encountered.

    Requires: MANAGE_ENROLLMENTS permission
    """
    from app.models.role import Role

    created = []
    errors = []

    for i, enrollment_data in enumerate(enrollments_data):
        try:
            # Verify student exists
            student = db.query(User).join(Role).filter(
                User.id == enrollment_data.student_id,
                Role.name == "STUDENT"
            ).first()
            if not student:
                errors.append({
                    "index": i,
                    "student_id": enrollment_data.student_id,
                    "error": "Student not found or user is not a student"
                })
                continue

            # Verify subject exists
            subject = db.query(Subject).filter(
                Subject.id == enrollment_data.subject_id
            ).first()
            if not subject:
                errors.append({
                    "index": i,
                    "subject_id": enrollment_data.subject_id,
                    "error": "Subject not found"
                })
                continue

            # Check if enrollment already exists
            existing = db.query(Enrollment).filter(
                Enrollment.student_id == enrollment_data.student_id,
                Enrollment.subject_id == enrollment_data.subject_id,
                Enrollment.academic_year == enrollment_data.academic_year
            ).first()

            if existing:
                errors.append({
                    "index": i,
                    "student_id": enrollment_data.student_id,
                    "subject_id": enrollment_data.subject_id,
                    "error": f"Already enrolled for academic year {enrollment_data.academic_year}"
                })
                continue

            # Create enrollment
            new_enrollment = Enrollment(
                student_id=enrollment_data.student_id,
                subject_id=enrollment_data.subject_id,
                academic_year=enrollment_data.academic_year,
                enrollment_date=enrollment_data.enrollment_date or date.today(),
                status=enrollment_data.status or EnrollmentStatus.ACTIVE
            )

            db.add(new_enrollment)
            created.append({
                "student_id": enrollment_data.student_id,
                "subject_id": enrollment_data.subject_id,
                "academic_year": enrollment_data.academic_year
            })

        except Exception as e:
            errors.append({
                "index": i,
                "error": str(e)
            })

    # Commit all successful enrollments
    db.commit()

    return {
        "message": f"Bulk enrollment completed",
        "created_count": len(created),
        "error_count": len(errors),
        "created": created,
        "errors": errors
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _build_enrollment_with_details(enrollment: Enrollment) -> EnrollmentWithDetails:
    """Build EnrollmentWithDetails response from Enrollment model."""
    return EnrollmentWithDetails(
        id=enrollment.id,
        student_id=enrollment.student_id,
        subject_id=enrollment.subject_id,
        academic_year=enrollment.academic_year,
        enrollment_date=enrollment.enrollment_date,
        status=enrollment.status,
        created_at=enrollment.created_at,
        updated_at=enrollment.updated_at,
        student_name=enrollment.student.full_name if enrollment.student else None,
        student_email=enrollment.student.email if enrollment.student else None,
        student_student_id=enrollment.student.student_id if enrollment.student else None,
        subject_code=enrollment.subject.code if enrollment.subject else None,
        subject_name=enrollment.subject.name if enrollment.subject else None,
        subject_credits=enrollment.subject.credits if enrollment.subject else None,
        department_name=enrollment.subject.department.name if enrollment.subject and enrollment.subject.department else None
    )

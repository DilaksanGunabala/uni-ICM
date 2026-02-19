from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from typing import Optional
from datetime import datetime

from app.models.mark import Mark
from app.models.user import User
from app.models.assessment import Assessment
from app.models.enrollment import Enrollment
from app.models.subject import Subject
from app.core.constants import MarkStatus, EnrollmentStatus
from app.services.audit_service import AuditService


class MarkService:
    """Service for marks management and workflow"""

    @staticmethod
    async def submit_marks(
        db: AsyncSession,
        enrollment_id: int,
        assessment_id: int,
        marks_obtained: float,
        is_absent: bool,
        lecturer: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Mark:
        """
        Lecturer submits marks - status = PENDING

        Args:
            db: Database session
            enrollment_id: Student enrollment ID
            assessment_id: Assessment ID
            marks_obtained: Marks obtained by student
            is_absent: Whether student was absent
            lecturer: Lecturer submitting the marks
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Mark: The created mark entry

        Raises:
            HTTPException: If validation fails
        """
        # Get assessment to check max marks
        result = await db.execute(
            select(Assessment).where(Assessment.id == assessment_id)
        )
        assessment = result.scalars().first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found"
            )

        # Validate marks are within range (unless absent)
        if not is_absent and marks_obtained > assessment.max_marks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Marks obtained ({marks_obtained}) cannot exceed max marks ({assessment.max_marks})"
            )

        # Verify enrollment exists and student is actively enrolled
        enrollment_result = await db.execute(
            select(Enrollment).where(Enrollment.id == enrollment_id)
        )
        enrollment = enrollment_result.scalars().first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found"
            )
        if enrollment.status != EnrollmentStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit marks: student enrollment status is '{enrollment.status}'. Student must be actively enrolled."
            )

        # Check if marks already exist for this enrollment and assessment
        result = await db.execute(
            select(Mark).where(
                Mark.enrollment_id == enrollment_id,
                Mark.assessment_id == assessment_id
            )
        )
        existing_mark = result.scalars().first()

        if existing_mark:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Marks already exist for this student and assessment. Use update endpoint instead."
            )

        # Create new mark entry
        mark = Mark(
            enrollment_id=enrollment_id,
            assessment_id=assessment_id,
            marks_obtained=marks_obtained,
            is_absent=is_absent,
            status=MarkStatus.PENDING,
            submitted_by=lecturer.id
        )

        db.add(mark)
        await db.commit()
        await db.refresh(mark)

        # Log audit trail
        await AuditService.log_insert(
            db=db,
            table_name="marks",
            record_id=mark.id,
            performed_by=lecturer.id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        return mark

    @staticmethod
    async def update_marks(
        db: AsyncSession,
        mark_id: int,
        marks_obtained: float,
        lecturer: User,
        is_absent: Optional[bool] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Mark:
        """
        Lecturer updates marks - only if status is PENDING or REJECTED

        Args:
            db: Database session
            mark_id: Mark ID to update
            marks_obtained: New marks obtained
            lecturer: Lecturer updating the marks
            is_absent: New absent status (optional)
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Mark: The updated mark entry

        Raises:
            HTTPException: If mark not found or cannot be edited
        """
        result = await db.execute(
            select(Mark).where(Mark.id == mark_id)
        )
        mark = result.scalars().first()

        if not mark:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mark not found"
            )

        # Check if marks can be edited
        if mark.status == MarkStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot edit approved marks. Please contact HOD for changes."
            )

        # Verify lecturer owns these marks
        if mark.submitted_by != lecturer.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit marks you submitted"
            )

        # Get assessment to validate marks
        result = await db.execute(
            select(Assessment).where(Assessment.id == mark.assessment_id)
        )
        assessment = result.scalars().first()
        if not is_absent and marks_obtained > assessment.max_marks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Marks obtained ({marks_obtained}) cannot exceed max marks ({assessment.max_marks})"
            )

        # Store old values for audit
        old_marks = mark.marks_obtained
        old_absent = mark.is_absent

        # Update marks
        mark.marks_obtained = marks_obtained
        if is_absent is not None:
            mark.is_absent = is_absent
        mark.status = MarkStatus.PENDING  # Reset to pending after edit

        await db.commit()
        await db.refresh(mark)

        # Log audit trail
        await AuditService.log_update(
            db=db,
            table_name="marks",
            record_id=mark.id,
            performed_by=lecturer.id,
            field_name="marks_obtained",
            old_value=old_marks,
            new_value=marks_obtained,
            ip_address=ip_address,
            user_agent=user_agent
        )

        return mark

    @staticmethod
    async def _check_hod_department_access(
        db: AsyncSession,
        mark: Mark,
        hod: User
    ) -> None:
        """
        Verify that a HOD can only approve/reject marks from their own department.
        SUPER_ADMIN bypasses this check.

        Raises:
            HTTPException 403 if HOD tries to act on another department's marks.
        """
        # SUPER_ADMIN has unrestricted access
        if hod.role and hod.role.name != "HOD":
            return

        enrollment_result = await db.execute(
            select(Enrollment).where(Enrollment.id == mark.enrollment_id)
        )
        enrollment = enrollment_result.scalars().first()
        if not enrollment:
            return

        subject_result = await db.execute(
            select(Subject).where(Subject.id == enrollment.subject_id)
        )
        subject = subject_result.scalars().first()
        if not subject:
            return

        # GES/General subjects have no department — accessible to all HODs
        if subject.department_id is None:
            return

        if subject.department_id != hod.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only approve/reject marks for your own department's subjects"
            )

    @staticmethod
    async def approve_marks(
        db: AsyncSession,
        mark_id: int,
        hod: User,
        comments: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Mark:
        """
        HOD approves marks - makes them visible to students

        Args:
            db: Database session
            mark_id: Mark ID to approve
            hod: HOD approving the marks
            comments: Optional approval comments
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Mark: The approved mark entry

        Raises:
            HTTPException: If mark not found or cannot be approved
        """
        result = await db.execute(
            select(Mark).where(Mark.id == mark_id)
        )
        mark = result.scalars().first()

        if not mark:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mark not found"
            )

        if mark.status != MarkStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only pending marks can be approved. Current status: {mark.status}"
            )

        # Verify HOD has department access to this mark
        await MarkService._check_hod_department_access(db, mark, hod)

        # Update mark status
        old_status = mark.status
        mark.status = MarkStatus.APPROVED
        mark.reviewed_by = hod.id
        mark.reviewed_at = datetime.utcnow()
        mark.review_comments = comments

        await db.commit()
        await db.refresh(mark)

        # Log audit trail
        await AuditService.log_approve(
            db=db,
            table_name="marks",
            record_id=mark.id,
            performed_by=hod.id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        return mark

    @staticmethod
    async def reject_marks(
        db: AsyncSession,
        mark_id: int,
        hod: User,
        comments: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Mark:
        """
        HOD rejects marks - lecturer can re-edit

        Args:
            db: Database session
            mark_id: Mark ID to reject
            hod: HOD rejecting the marks
            comments: Required rejection reason
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Mark: The rejected mark entry

        Raises:
            HTTPException: If mark not found, comments missing, or cannot be rejected
        """
        result = await db.execute(
            select(Mark).where(Mark.id == mark_id)
        )
        mark = result.scalars().first()

        if not mark:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mark not found"
            )

        if mark.status != MarkStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only pending marks can be rejected. Current status: {mark.status}"
            )

        if not comments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection comments are required"
            )

        # Verify HOD has department access to this mark
        await MarkService._check_hod_department_access(db, mark, hod)

        # Update mark status
        old_status = mark.status
        mark.status = MarkStatus.REJECTED
        mark.reviewed_by = hod.id
        mark.reviewed_at = datetime.utcnow()
        mark.review_comments = comments

        await db.commit()
        await db.refresh(mark)

        # Log audit trail
        await AuditService.log_reject(
            db=db,
            table_name="marks",
            record_id=mark.id,
            performed_by=hod.id,
            comments=comments,
            ip_address=ip_address,
            user_agent=user_agent
        )

        return mark

    @staticmethod
    async def delete_marks(
        db: AsyncSession,
        mark_id: int,
        lecturer: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Lecturer deletes marks - only if PENDING or REJECTED

        Args:
            db: Database session
            mark_id: Mark ID to delete
            lecturer: Lecturer deleting the marks
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            bool: True if deleted successfully

        Raises:
            HTTPException: If mark not found or cannot be deleted
        """
        result = await db.execute(
            select(Mark).where(Mark.id == mark_id)
        )
        mark = result.scalars().first()

        if not mark:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mark not found"
            )

        # Check if marks can be deleted
        if mark.status == MarkStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete approved marks. Please contact HOD."
            )

        # Verify lecturer owns these marks
        if mark.submitted_by != lecturer.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete marks you submitted"
            )

        # Log audit trail before deletion
        await AuditService.log_delete(
            db=db,
            table_name="marks",
            record_id=mark.id,
            performed_by=lecturer.id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Delete mark
        await db.delete(mark)
        await db.commit()

        return True

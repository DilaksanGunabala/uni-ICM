from sqlalchemy import Column, Integer, Text, Numeric, Boolean, Enum, TIMESTAMP, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.core.constants import MarkStatus


class Mark(Base):
    """Mark model for storing student marks with approval workflow"""

    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained = Column(Numeric(5, 2), nullable=False)
    status = Column(
        Enum(MarkStatus),
        default=MarkStatus.PENDING,
        nullable=False,
        index=True
    )
    submitted_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    submitted_at = Column(TIMESTAMP, server_default=func.current_timestamp(), index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reviewed_at = Column(TIMESTAMP, nullable=True)
    review_comments = Column(Text, nullable=True)
    is_absent = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Check constraint
    __table_args__ = (
        CheckConstraint("marks_obtained >= 0", name="chk_marks_valid"),
    )

    # Relationships
    enrollment = relationship("Enrollment", back_populates="marks")
    assessment = relationship("Assessment", back_populates="marks")
    submitter = relationship("User", foreign_keys=[submitted_by], back_populates="submitted_marks")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_marks")

    @property
    def is_pending(self):
        """Check if mark is pending approval"""
        return self.status == MarkStatus.PENDING

    @property
    def is_approved(self):
        """Check if mark is approved"""
        return self.status == MarkStatus.APPROVED

    @property
    def is_rejected(self):
        """Check if mark is rejected"""
        return self.status == MarkStatus.REJECTED

    @property
    def can_be_edited(self):
        """Check if mark can be edited (only pending or rejected marks)"""
        return self.status in [MarkStatus.PENDING, MarkStatus.REJECTED]

    def __repr__(self):
        return f"<Mark(id={self.id}, enrollment_id={self.enrollment_id}, marks={self.marks_obtained}, status='{self.status}')>"

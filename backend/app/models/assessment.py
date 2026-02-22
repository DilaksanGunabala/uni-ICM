from sqlalchemy import Column, Integer, String, Text, Date, Numeric, Boolean, Enum, TIMESTAMP, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.core.constants import AssessmentType


class Assessment(Base):
    """Assessment model for defining assessment types and details"""

    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    assessment_type = Column(
        Enum(AssessmentType),
        nullable=False,
        index=True
    )
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    max_marks = Column(Numeric(5, 2), nullable=False)
    weightage = Column(Numeric(5, 2), nullable=True)  # Percentage contribution
    assessment_date = Column(Date, nullable=True, index=True)
    academic_year = Column(String(10), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Check constraints
    __table_args__ = (
        CheckConstraint("max_marks > 0", name="chk_max_marks"),
        CheckConstraint(
            "weightage IS NULL OR (weightage >= 0 AND weightage <= 100)",
            name="chk_weightage"
        ),
    )

    # Relationships
    subject = relationship("Subject", back_populates="assessments")
    creator = relationship("User", foreign_keys=[created_by])
    marks = relationship("Mark", back_populates="assessment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Assessment(id={self.id}, name='{self.name}', type='{self.assessment_type}', max_marks={self.max_marks})>"

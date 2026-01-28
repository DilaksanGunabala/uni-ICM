from sqlalchemy import Column, Integer, String, Date, Enum, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.core.constants import EnrollmentStatus


class Enrollment(Base):
    """Student-to-Subject enrollment model"""

    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year = Column(String(10), nullable=False, index=True)
    semester = Column(Integer, nullable=False, index=True)
    enrollment_date = Column(Date, nullable=False)
    status = Column(
        Enum(EnrollmentStatus),
        default=EnrollmentStatus.ACTIVE,
        nullable=False,
        index=True
    )
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Relationships
    student = relationship("User", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")
    marks = relationship("Mark", back_populates="enrollment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Enrollment(id={self.id}, student_id={self.student_id}, subject_id={self.subject_id}, year='{self.academic_year}')>"

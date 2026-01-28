from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Subject(Base):
    """Subject model for university subjects/courses"""

    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    # department_id is nullable for general subjects (semester 1-3)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    # Course coordinator (lecturer responsible for this subject)
    coordinator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    semester = Column(Integer, nullable=False, index=True)
    credits = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Relationships
    department = relationship("Department", back_populates="subjects")
    coordinator = relationship("User", foreign_keys=[coordinator_id], backref="coordinated_subjects")
    subject_assignments = relationship("SubjectAssignment", back_populates="subject", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="subject", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="subject", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Subject(id={self.id}, code='{self.code}', name='{self.name}')>"


class SubjectAssignment(Base):
    """Lecturer-to-Subject assignment model"""

    __tablename__ = "subject_assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    lecturer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year = Column(String(10), nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Relationships
    subject = relationship("Subject", back_populates="subject_assignments")
    lecturer = relationship("User", back_populates="subject_assignments")

    def __repr__(self):
        return f"<SubjectAssignment(id={self.id}, subject_id={self.subject_id}, lecturer_id={self.lecturer_id}, year='{self.academic_year}')>"

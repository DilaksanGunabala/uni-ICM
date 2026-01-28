from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model for all system users (Admin, HOD, Lecturer, Student)"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=True, index=True)
    student_id = Column(String(50), unique=True, nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)  # Profile picture URL
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    last_login = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Check constraint: user must have either employee_id OR student_id
    __table_args__ = (
        CheckConstraint(
            "(employee_id IS NOT NULL AND student_id IS NULL) OR (employee_id IS NULL AND student_id IS NOT NULL)",
            name="chk_user_identifier"
        ),
    )

    # Relationships
    role = relationship("Role", back_populates="users")
    department = relationship("Department", foreign_keys=[department_id], back_populates="users")
    headed_department = relationship("Department", foreign_keys="[Department.hod_id]", back_populates="hod", uselist=False)

    # Marks relationships
    submitted_marks = relationship("Mark", foreign_keys="[Mark.submitted_by]", back_populates="submitter")
    reviewed_marks = relationship("Mark", foreign_keys="[Mark.reviewed_by]", back_populates="reviewer")

    # Subject assignments (for lecturers)
    subject_assignments = relationship("SubjectAssignment", back_populates="lecturer")

    # Enrollments (for students)
    enrollments = relationship("Enrollment", back_populates="student")

    # Audit logs
    audit_logs = relationship("AuditLog", back_populates="user")

    @property
    def full_name(self):
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"

    @property
    def is_student(self):
        """Check if user is a student"""
        return self.student_id is not None

    @property
    def is_staff(self):
        """Check if user is staff (not a student)"""
        return self.employee_id is not None

    def __repr__(self):
        identifier = self.employee_id or self.student_id
        return f"<User(id={self.id}, email='{self.email}', identifier='{identifier}')>"

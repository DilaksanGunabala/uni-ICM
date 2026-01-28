from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Department(Base):
    """Department model for university departments"""

    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    hod_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Relationships
    hod = relationship("User", foreign_keys=[hod_id], back_populates="headed_department")
    users = relationship("User", foreign_keys="[User.department_id]", back_populates="department")
    subjects = relationship("Subject", back_populates="department", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Department(id={self.id}, code='{self.code}', name='{self.name}')>"

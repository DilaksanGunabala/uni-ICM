from sqlalchemy import Column, Integer, String, Text, Enum, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.core.constants import AuditAction


class AuditLog(Base):
    """Audit log model for tracking all system modifications"""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    table_name = Column(String(50), nullable=False, index=True)
    record_id = Column(Integer, nullable=False)
    action = Column(
        Enum(AuditAction),
        nullable=False,
        index=True
    )
    field_name = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    timestamp = Column(TIMESTAMP, server_default=func.current_timestamp(), index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, table='{self.table_name}', record_id={self.record_id}, action='{self.action}')>"

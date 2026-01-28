from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AuditLogBase(BaseModel):
    """Base audit log schema"""
    table_name: str
    record_id: int
    action: str


class AuditLogResponse(BaseModel):
    """Schema for audit log response"""
    id: int
    table_name: str
    record_id: int
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    performed_by: int
    performed_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogWithDetails(AuditLogResponse):
    """Schema for audit log response with user details"""
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None

    class Config:
        from_attributes = True

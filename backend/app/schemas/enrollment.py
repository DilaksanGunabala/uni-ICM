from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from app.core.constants import EnrollmentStatus


class EnrollmentBase(BaseModel):
    """Base enrollment schema"""
    student_id: int
    subject_id: int
    academic_year: str


class EnrollmentCreate(EnrollmentBase):
    """Schema for creating an enrollment"""
    enrollment_date: Optional[date] = None
    status: Optional[EnrollmentStatus] = EnrollmentStatus.ACTIVE


class EnrollmentUpdate(BaseModel):
    """Schema for updating an enrollment"""
    status: Optional[EnrollmentStatus] = None
    enrollment_date: Optional[date] = None
    academic_year: Optional[str] = None


class EnrollmentResponse(BaseModel):
    """Schema for enrollment response"""
    id: int
    student_id: int
    subject_id: int
    academic_year: str
    enrollment_date: date
    status: EnrollmentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EnrollmentWithDetails(EnrollmentResponse):
    """Schema for enrollment response with full details"""
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_student_id: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    subject_credits: Optional[int] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

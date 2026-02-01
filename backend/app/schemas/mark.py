from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.core.constants import MarkStatus


class MarkBase(BaseModel):
    """Base mark schema"""
    enrollment_id: int
    assessment_id: int
    marks_obtained: Decimal = Field(..., ge=0)
    is_absent: bool = False


class MarkCreate(MarkBase):
    """Schema for creating a mark"""
    pass


class MarkUpdate(BaseModel):
    """Schema for updating a mark"""
    marks_obtained: Decimal = Field(..., ge=0)
    is_absent: Optional[bool] = None


class MarkApproval(BaseModel):
    """Schema for approving/rejecting marks"""
    comments: Optional[str] = None


class MarkInDB(MarkBase):
    """Schema for mark in database"""
    id: int
    status: MarkStatus
    submitted_by: int
    submitted_at: datetime
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarkResponse(MarkInDB):
    """Schema for mark response with additional info"""
    student_name: Optional[str] = None
    student_id: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    assessment_name: Optional[str] = None
    assessment_type: Optional[str] = None
    max_marks: Optional[Decimal] = None
    semester: Optional[int] = None
    submitted_by_name: Optional[str] = None
    reviewed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class MarkFilter(BaseModel):
    """Schema for filtering marks"""
    student_id: Optional[int] = None
    subject_id: Optional[int] = None
    semester: Optional[int] = None
    assessment_type: Optional[str] = None
    status: Optional[MarkStatus] = None
    academic_year: Optional[str] = None

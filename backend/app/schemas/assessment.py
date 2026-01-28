from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from app.core.constants import AssessmentType


class AssessmentBase(BaseModel):
    """Base assessment schema"""
    name: str
    assessment_type: AssessmentType
    subject_id: int
    max_marks: Decimal = Field(..., gt=0)
    weightage: Optional[Decimal] = Field(None, ge=0, le=100)
    assessment_date: Optional[date] = None
    academic_year: str
    description: Optional[str] = None


class AssessmentCreate(AssessmentBase):
    """Schema for creating an assessment"""
    is_active: bool = True


class AssessmentUpdate(BaseModel):
    """Schema for updating an assessment"""
    name: Optional[str] = None
    assessment_type: Optional[AssessmentType] = None
    max_marks: Optional[Decimal] = Field(None, gt=0)
    weightage: Optional[Decimal] = Field(None, ge=0, le=100)
    assessment_date: Optional[date] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AssessmentInDB(AssessmentBase):
    """Schema for assessment in database"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssessmentResponse(AssessmentInDB):
    """Schema for assessment response with subject info"""
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None

    class Config:
        from_attributes = True


class AssessmentWithDetails(AssessmentResponse):
    """Schema for assessment response with full subject and department details"""
    subject_semester: Optional[int] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

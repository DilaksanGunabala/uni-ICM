from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SubjectBase(BaseModel):
    """Base subject schema"""
    code: str
    name: str
    # department_id is optional for general subjects (semester 1-3)
    department_id: Optional[int] = None
    # Course coordinator (lecturer responsible for this subject)
    coordinator_id: Optional[int] = None
    semester: int
    credits: int


class SubjectCreate(SubjectBase):
    """Schema for creating a subject"""
    is_active: bool = True


class SubjectUpdate(BaseModel):
    """Schema for updating a subject"""
    code: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[int] = None
    coordinator_id: Optional[int] = None
    semester: Optional[int] = None
    credits: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectResponse(BaseModel):
    """Schema for subject response"""
    id: int
    code: str
    name: str
    # department_id can be null for general subjects
    department_id: Optional[int] = None
    # Course coordinator
    coordinator_id: Optional[int] = None
    semester: int
    credits: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubjectWithDetails(SubjectResponse):
    """Schema for subject response with department and coordinator details"""
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    coordinator_name: Optional[str] = None

    class Config:
        from_attributes = True


class LecturerAssignmentCreate(BaseModel):
    """Schema for assigning a lecturer to a subject"""
    lecturer_id: int
    academic_year: str


class LecturerAssignmentResponse(BaseModel):
    """Schema for lecturer assignment response with details"""
    id: int
    subject_id: int
    lecturer_id: int
    academic_year: str
    created_at: datetime
    lecturer_name: Optional[str] = None
    lecturer_email: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None

    class Config:
        from_attributes = True

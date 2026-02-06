from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime
from app.core.constants import SemesterType, GENERAL_SEMESTERS, SPECIAL_SEMESTERS


class SubjectBase(BaseModel):
    """Base subject schema"""
    code: str
    name: str
    # department_id: NULL for GENERAL/GES, required for SPECIAL
    department_id: Optional[int] = None
    # Course coordinator (lecturer responsible for this subject)
    coordinator_id: Optional[int] = None
    semester_type: SemesterType
    # semester: NULL for GES, 1-3 for GENERAL, 4-8 for SPECIAL
    semester: Optional[int] = None
    credits: int


class SubjectCreate(SubjectBase):
    """Schema for creating a subject"""
    is_active: bool = True

    @model_validator(mode='after')
    def validate_semester_rules(self):
        st = self.semester_type
        sem = self.semester
        dept = self.department_id

        if st == SemesterType.GENERAL:
            if sem is None or sem not in GENERAL_SEMESTERS:
                raise ValueError("GENERAL subjects must have semester 1, 2, or 3")
            if dept is not None:
                raise ValueError("GENERAL subjects should not have a department")

        elif st == SemesterType.SPECIAL:
            if sem is None or sem not in SPECIAL_SEMESTERS:
                raise ValueError("SPECIAL subjects must have semester 4, 5, 6, 7, or 8")
            if dept is None:
                raise ValueError("SPECIAL subjects must have a department")

        elif st == SemesterType.GES:
            if sem is not None:
                raise ValueError("GES subjects must not have a semester number")
            if dept is not None:
                raise ValueError("GES subjects should not have a department")

        return self


class SubjectUpdate(BaseModel):
    """Schema for updating a subject"""
    code: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[int] = None
    coordinator_id: Optional[int] = None
    semester_type: Optional[SemesterType] = None
    semester: Optional[int] = None
    credits: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectResponse(BaseModel):
    """Schema for subject response"""
    id: int
    code: str
    name: str
    department_id: Optional[int] = None
    coordinator_id: Optional[int] = None
    semester_type: SemesterType
    semester: Optional[int] = None
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

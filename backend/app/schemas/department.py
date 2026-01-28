from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DepartmentBase(BaseModel):
    """Base department schema"""
    code: str
    name: str
    hod_id: Optional[int] = None


class DepartmentCreate(DepartmentBase):
    """Schema for creating a department"""
    is_active: bool = True


class DepartmentUpdate(BaseModel):
    """Schema for updating a department"""
    code: Optional[str] = None
    name: Optional[str] = None
    hod_id: Optional[int] = None
    is_active: Optional[bool] = None


class DepartmentInDB(DepartmentBase):
    """Schema for department in database"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepartmentResponse(DepartmentInDB):
    """Schema for department response with HOD info"""
    hod_name: Optional[str] = None

    class Config:
        from_attributes = True

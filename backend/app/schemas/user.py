from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    first_name: str
    last_name: str
    employee_id: Optional[str] = None
    student_id: Optional[str] = None
    department_id: Optional[int] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str
    role_id: int
    is_active: bool = True


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    employee_id: Optional[str] = None
    student_id: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserInDB(UserBase):
    """Schema for user in database"""
    id: int
    role_id: int
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserWithRole(UserInDB):
    """Schema for user with role information"""
    role_name: Optional[str] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

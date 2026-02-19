import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class LoginRequest(BaseModel):
    """Schema for login request"""
    email: EmailStr
    password: str


class TokenData(BaseModel):
    """Schema for decoded token data"""
    user_id: int
    role: str


class UserResponse(BaseModel):
    """Schema for user data in token response"""
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    employee_id: Optional[str] = None
    student_id: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProfileUpdateRequest(BaseModel):
    """Schema for updating own profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChangeRequest(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: str
    confirm_password: str


class RegisterRequest(BaseModel):
    """Schema for student registration"""
    email: EmailStr
    password: str
    confirm_password: str
    first_name: str
    last_name: str
    student_id: str
    department_id: int
    batch: int  # e.g., 2024, 2023

    @field_validator('email')
    @classmethod
    def validate_student_email(cls, v: str) -> str:
        if not re.match(r'^20\d{2}e\d+@eng\.jfn\.ac\.lk$', v.lower()):
            raise ValueError(
                'Student email must follow format: 20XXEYYY@eng.jfn.ac.lk '
                '(e.g., 2020E187@eng.jfn.ac.lk)'
            )
        return v.lower()


class StaffRegisterRequest(BaseModel):
    """Schema for staff self-registration (account inactive until approved by admin)"""
    email: EmailStr
    password: str
    confirm_password: str
    first_name: str
    last_name: str
    employee_id: str
    department_id: Optional[int] = None
    role_name: str  # Allowed: DEAN | HOD | LECTURER | INSTRUCTOR

    @field_validator('email')
    @classmethod
    def validate_domain(cls, v: str) -> str:
        if not v.lower().endswith('@eng.jfn.ac.lk'):
            raise ValueError('Email must use the @eng.jfn.ac.lk domain')
        return v.lower()

    @field_validator('role_name')
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {'DEAN', 'HOD', 'LECTURER', 'INSTRUCTOR'}
        if v.upper() not in allowed:
            raise ValueError(f'Role must be one of: {", ".join(sorted(allowed))}')
        return v.upper()

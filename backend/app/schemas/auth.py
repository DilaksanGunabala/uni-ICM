from pydantic import BaseModel, EmailStr
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

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import timedelta
import os
import uuid
from pathlib import Path

from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    ProfileUpdateRequest,
    PasswordChangeRequest
)
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.config import settings
from app.middleware.auth import get_current_user

router = APIRouter()

# Allowed image extensions
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login endpoint - authenticates user and returns JWT token.
    """
    # Find user by email with department loaded
    result = await db.execute(
        select(User).options(
            selectinload(User.department),
            selectinload(User.role)
        ).where(User.email == credentials.email)
    )
    user = result.scalars().first()

    # Verify user exists and password is correct
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact administrator."
        )

    # Create access token with user info
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "role": user.role.name,
            "email": user.email
        },
        expires_delta=access_token_expires
    )

    # Prepare user response
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.name,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        employee_id=user.employee_id,
        student_id=user.student_id,
        avatar_url=user.avatar_url
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user's information."""
    result = await db.execute(
        select(User).options(
            selectinload(User.department),
            selectinload(User.role)
        ).where(User.id == current_user.id)
    )
    user = result.scalars().first()

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.name,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        employee_id=user.employee_id,
        student_id=user.student_id,
        avatar_url=user.avatar_url
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile information."""
    if profile_data.first_name is not None:
        current_user.first_name = profile_data.first_name

    if profile_data.last_name is not None:
        current_user.last_name = profile_data.last_name

    if profile_data.email is not None and profile_data.email != current_user.email:
        result = await db.execute(
            select(User).where(User.email == profile_data.email, User.id != current_user.id)
        )
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        current_user.email = profile_data.email

    await db.commit()
    await db.refresh(current_user)

    result = await db.execute(
        select(User).options(
            selectinload(User.department),
            selectinload(User.role)
        ).where(User.id == current_user.id)
    )
    user = result.scalars().first()

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.name,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        employee_id=user.employee_id,
        student_id=user.student_id,
        avatar_url=user.avatar_url
    )


@router.put("/me/password")
async def change_password(
    password_data: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change current user's password."""
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )

    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )

    current_user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload or update current user's profile picture."""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)

    if current_user.avatar_url:
        old_file = Path(current_user.avatar_url.lstrip('/'))
        if old_file.exists():
            try:
                old_file.unlink()
            except Exception:
                pass

    unique_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = upload_dir / unique_filename

    with open(file_path, "wb") as f:
        f.write(content)

    avatar_url = f"/uploads/avatars/{unique_filename}"
    current_user.avatar_url = avatar_url
    await db.commit()
    await db.refresh(current_user)

    result = await db.execute(
        select(User).options(
            selectinload(User.department),
            selectinload(User.role)
        ).where(User.id == current_user.id)
    )
    user = result.scalars().first()

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.name,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        employee_id=user.employee_id,
        student_id=user.student_id,
        avatar_url=user.avatar_url
    )


@router.delete("/me/avatar")
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete current user's profile picture."""
    if not current_user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No avatar to delete"
        )

    file_path = Path(current_user.avatar_url.lstrip('/'))
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    current_user.avatar_url = None
    await db.commit()

    return {"message": "Avatar deleted successfully"}

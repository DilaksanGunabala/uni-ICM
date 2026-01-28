from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
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
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint - authenticates user and returns JWT token.

    Request body:
    - email: User's email address
    - password: User's password

    Returns:
    - access_token: JWT token for authentication
    - token_type: "bearer"
    - user: User information (id, email, name, role)
    """
    # Find user by email with department loaded
    user = db.query(User).options(
        joinedload(User.department)
    ).filter(User.email == credentials.email).first()

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
def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user's information.

    Requires: Valid JWT token

    Returns:
    - User information
    """
    # Reload user with department relationship
    user = db.query(User).options(
        joinedload(User.department)
    ).filter(User.id == current_user.id).first()

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
def update_profile(
    profile_data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's profile information.

    Requires: Valid JWT token

    Allowed updates:
    - first_name
    - last_name
    - email (must be unique)
    """
    # Update fields if provided
    if profile_data.first_name is not None:
        current_user.first_name = profile_data.first_name

    if profile_data.last_name is not None:
        current_user.last_name = profile_data.last_name

    if profile_data.email is not None and profile_data.email != current_user.email:
        # Check if email is already taken
        existing = db.query(User).filter(
            User.email == profile_data.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        current_user.email = profile_data.email

    db.commit()
    db.refresh(current_user)

    # Reload with department
    user = db.query(User).options(
        joinedload(User.department)
    ).filter(User.id == current_user.id).first()

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
def change_password(
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change current user's password.

    Requires: Valid JWT token

    Request body:
    - current_password: Current password for verification
    - new_password: New password
    - confirm_password: Confirm new password
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Check new password matches confirmation
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )

    # Validate new password length
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )

    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload or update current user's profile picture.

    Requires: Valid JWT token

    Accepts: JPG, JPEG, PNG, GIF, WEBP images up to 5MB
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Delete old avatar if exists
    if current_user.avatar_url:
        old_file = Path(current_user.avatar_url.lstrip('/'))
        if old_file.exists():
            try:
                old_file.unlink()
            except Exception:
                pass  # Ignore errors when deleting old file

    # Generate unique filename
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = upload_dir / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Update user's avatar URL
    avatar_url = f"/uploads/avatars/{unique_filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    # Reload with department
    user = db.query(User).options(
        joinedload(User.department)
    ).filter(User.id == current_user.id).first()

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
def delete_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete current user's profile picture.

    Requires: Valid JWT token
    """
    if not current_user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No avatar to delete"
        )

    # Delete file from filesystem
    file_path = Path(current_user.avatar_url.lstrip('/'))
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass  # Ignore errors when deleting file

    # Update user's avatar URL
    current_user.avatar_url = None
    db.commit()

    return {"message": "Avatar deleted successfully"}

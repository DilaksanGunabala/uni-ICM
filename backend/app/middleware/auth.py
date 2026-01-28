from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from typing import Optional

from app.core.security import decode_token
from app.database import get_db
from app.models.user import User
from app.schemas.auth import TokenData

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Authorization credentials with Bearer token
        db: Database session

    Returns:
        User: The authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token
        token = credentials.credentials
        payload = decode_token(token)

        # Extract user_id from token
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Fetch user from database
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user.

    Args:
        current_user: User from get_current_user dependency

    Returns:
        User: The active user

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency to get the current user if token is provided, otherwise None.
    Useful for endpoints that work differently for authenticated vs unauthenticated users.

    Args:
        credentials: HTTP Authorization credentials (optional)
        db: Database session

    Returns:
        User or None
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        payload = decode_token(token)
        user_id: Optional[int] = payload.get("user_id")

        if user_id is None:
            return None

        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        return user

    except JWTError:
        return None

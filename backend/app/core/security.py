from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt safety limit
    safe_password = plain_password[:72]
    return pwd_context.verify(safe_password, hashed_password)

def get_password_hash(password: str) -> str:
    safe_password = password[:72]
    return pwd_context.hash(safe_password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of data to encode in the token (e.g., user_id, role)
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT token.

    Args:
        token: The JWT token string

    Returns:
        Decoded token payload as dictionary

    Raises:
        JWTError: If token is invalid or expired
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

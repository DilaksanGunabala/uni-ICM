from fastapi import Request
from typing import Optional


def get_client_ip(request: Request) -> Optional[str]:
    """
    Extract client IP address from request.

    Args:
        request: FastAPI request object

    Returns:
        IP address string or None
    """
    # Check for X-Forwarded-For header (if behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Check for X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fallback to direct client host
    if request.client:
        return request.client.host

    return None


def get_user_agent(request: Request) -> Optional[str]:
    """
    Extract user agent from request.

    Args:
        request: FastAPI request object

    Returns:
        User agent string or None
    """
    return request.headers.get("User-Agent")

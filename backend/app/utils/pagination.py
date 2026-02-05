from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
from app.config import settings

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response schema"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool

    class Config:
        arbitrary_types_allowed = True


async def paginate(
    db: AsyncSession,
    stmt: Select,
    page: int = 1,
    page_size: Optional[int] = None
) -> dict:
    """
    Paginate an async SQLAlchemy select statement.

    Args:
        db: Async database session
        stmt: SQLAlchemy Select statement to paginate
        page: Page number (1-indexed)
        page_size: Number of items per page (defaults to settings.DEFAULT_PAGE_SIZE)

    Returns:
        dict: Paginated response with items and metadata
    """
    # Use default page size if not provided
    if page_size is None:
        page_size = settings.DEFAULT_PAGE_SIZE

    # Enforce maximum page size
    if page_size > settings.MAX_PAGE_SIZE:
        page_size = settings.MAX_PAGE_SIZE

    # Ensure page is at least 1
    if page < 1:
        page = 1

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    # Ensure page doesn't exceed total pages
    if page > total_pages:
        page = total_pages

    # Calculate offset
    offset = (page - 1) * page_size

    # Get paginated items
    result = await db.execute(stmt.offset(offset).limit(page_size))
    items = result.scalars().unique().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }

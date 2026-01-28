from typing import Optional
from sqlalchemy.orm import Query


def apply_filters(
    query: Query,
    filters: dict,
    model: type
) -> Query:
    """
    Apply filters to a SQLAlchemy query dynamically.

    Args:
        query: SQLAlchemy query
        filters: Dictionary of filter conditions
        model: SQLAlchemy model class

    Returns:
        Query: Filtered query
    """
    for key, value in filters.items():
        if value is not None and hasattr(model, key):
            column = getattr(model, key)
            query = query.filter(column == value)

    return query


def apply_search(
    query: Query,
    search_term: Optional[str],
    search_fields: list
) -> Query:
    """
    Apply search filter across multiple fields (OR condition).

    Args:
        query: SQLAlchemy query
        search_term: Search term
        search_fields: List of column objects to search in

    Returns:
        Query: Filtered query
    """
    if not search_term:
        return query

    from sqlalchemy import or_

    conditions = [field.ilike(f"%{search_term}%") for field in search_fields]
    return query.filter(or_(*conditions))

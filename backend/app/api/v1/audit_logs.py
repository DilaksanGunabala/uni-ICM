from fastapi import APIRouter, Depends, HTTPException, status, Query as QueryParam
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, date

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rbac import require_permission
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse, AuditLogWithDetails
from app.core.permissions import Permission
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/", response_model=dict)
def get_audit_logs(
    table_name: Optional[str] = None,
    action: Optional[str] = None,
    record_id: Optional[int] = None,
    performed_by: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS))
):
    """
    Get all audit logs with filtering and pagination.

    Requires: VIEW_AUDIT_LOGS permission (Super Admin only)

    Filter options:
    - table_name: Filter by table name (e.g., "marks", "users")
    - action: Filter by action type (e.g., "INSERT", "UPDATE", "APPROVE")
    - record_id: Filter by specific record ID
    - performed_by: Filter by user ID who performed the action
    - date_from: Filter logs from this date onwards (YYYY-MM-DD)
    - date_to: Filter logs up to this date (YYYY-MM-DD)
    """
    query = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    )

    # Apply filters
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)

    if action:
        query = query.filter(AuditLog.action == action)

    if record_id is not None:
        query = query.filter(AuditLog.record_id == record_id)

    if performed_by is not None:
        query = query.filter(AuditLog.performed_by == performed_by)

    if date_from:
        query = query.filter(AuditLog.timestamp >= datetime.combine(date_from, datetime.min.time()))

    if date_to:
        query = query.filter(AuditLog.timestamp <= datetime.combine(date_to, datetime.max.time()))

    # Order by most recent first
    query = query.order_by(AuditLog.timestamp.desc())

    # Paginate
    paginated = paginate(query, page, page_size)

    # Build response
    items = []
    for log in paginated["items"]:
        items.append(_build_audit_log_with_details(log))

    paginated["items"] = items
    return paginated


@router.get("/{audit_log_id}", response_model=AuditLogWithDetails)
def get_audit_log(
    audit_log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS))
):
    """
    Get a specific audit log entry by ID.

    Requires: VIEW_AUDIT_LOGS permission (Super Admin only)
    """
    audit_log = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    ).filter(AuditLog.id == audit_log_id).first()

    if not audit_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found"
        )

    return _build_audit_log_with_details(audit_log)


# ============================================================================
# RECORD-SPECIFIC AUDIT LOGS
# ============================================================================

@router.get("/record/{table_name}/{record_id}", response_model=list[AuditLogWithDetails])
def get_record_audit_trail(
    table_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS))
):
    """
    Get complete audit trail for a specific record.

    Shows all modifications made to a specific record over time.
    Requires: VIEW_AUDIT_LOGS permission (Super Admin only)

    Example: GET /api/v1/audit-logs/record/marks/123
    Returns all audit logs for the mark with ID 123.
    """
    audit_logs = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    ).filter(
        AuditLog.table_name == table_name,
        AuditLog.record_id == record_id
    ).order_by(AuditLog.timestamp.desc()).all()

    results = []
    for log in audit_logs:
        results.append(_build_audit_log_with_details(log))

    return results


# ============================================================================
# USER-SPECIFIC AUDIT LOGS
# ============================================================================

@router.get("/user/{user_id}/actions", response_model=dict)
def get_user_actions(
    user_id: int,
    table_name: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = QueryParam(1, ge=1),
    page_size: int = QueryParam(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS))
):
    """
    Get all actions performed by a specific user.

    Shows complete activity history for a user.
    Requires: VIEW_AUDIT_LOGS permission (Super Admin only)

    Filter options:
    - table_name: Filter by table name
    - action: Filter by action type
    - date_from: Filter actions from this date onwards
    - date_to: Filter actions up to this date
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    query = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    ).filter(AuditLog.performed_by == user_id)

    # Apply filters
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)

    if action:
        query = query.filter(AuditLog.action == action)

    if date_from:
        query = query.filter(AuditLog.timestamp >= datetime.combine(date_from, datetime.min.time()))

    if date_to:
        query = query.filter(AuditLog.timestamp <= datetime.combine(date_to, datetime.max.time()))

    # Order by most recent first
    query = query.order_by(AuditLog.timestamp.desc())

    # Paginate
    paginated = paginate(query, page, page_size)

    # Build response
    items = []
    for log in paginated["items"]:
        items.append(_build_audit_log_with_details(log))

    paginated["items"] = items
    paginated["user_info"] = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name
    }

    return paginated


# ============================================================================
# STATISTICS
# ============================================================================

@router.get("/stats/summary", response_model=dict)
def get_audit_stats(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS))
):
    """
    Get summary statistics for audit logs.

    Returns counts by action type, table name, and top users.
    Requires: VIEW_AUDIT_LOGS permission (Super Admin only)
    """
    from sqlalchemy import func

    query = db.query(AuditLog)

    # Apply date filters
    if date_from:
        query = query.filter(AuditLog.timestamp >= datetime.combine(date_from, datetime.min.time()))

    if date_to:
        query = query.filter(AuditLog.timestamp <= datetime.combine(date_to, datetime.max.time()))

    # Total count
    total_count = query.count()

    # Count by action
    actions = query.with_entities(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.action).all()

    # Count by table
    tables = query.with_entities(
        AuditLog.table_name,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.table_name).all()

    # Top 10 most active users
    top_users = query.with_entities(
        AuditLog.performed_by,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.performed_by).order_by(
        func.count(AuditLog.id).desc()
    ).limit(10).all()

    # Get user details for top users
    user_ids = [user[0] for user in top_users]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {user.id: user for user in users}

    top_users_with_details = [
        {
            "user_id": user_id,
            "count": count,
            "email": user_map[user_id].email if user_id in user_map else None,
            "full_name": user_map[user_id].full_name if user_id in user_map else None
        }
        for user_id, count in top_users
    ]

    return {
        "total_count": total_count,
        "actions": [{"action": action, "count": count} for action, count in actions],
        "tables": [{"table_name": table, "count": count} for table, count in tables],
        "top_users": top_users_with_details
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _build_audit_log_with_details(log: AuditLog) -> AuditLogWithDetails:
    """Build AuditLogWithDetails response from AuditLog model."""
    return AuditLogWithDetails(
        id=log.id,
        table_name=log.table_name,
        record_id=log.record_id,
        action=log.action,
        old_value=log.old_value,
        new_value=log.new_value,
        performed_by=log.performed_by,
        performed_at=log.timestamp,
        ip_address=log.ip_address,
        user_agent=log.user_agent,
        user_email=log.user.email if log.user else None,
        user_full_name=log.user.full_name if log.user else None
    )

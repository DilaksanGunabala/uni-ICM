from sqlalchemy.orm import Session
from typing import Optional
from app.models.audit_log import AuditLog
from app.core.constants import AuditAction


class AuditService:
    """Service for audit logging operations"""

    @staticmethod
    def log_action(
        db: Session,
        table_name: str,
        record_id: int,
        action: AuditAction,
        performed_by: int,
        field_name: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Log an action to the audit trail.

        Args:
            db: Database session
            table_name: Name of the table being modified
            record_id: ID of the record being modified
            action: Type of action (INSERT, UPDATE, DELETE, APPROVE, REJECT)
            performed_by: User ID who performed the action
            field_name: Name of the field being modified (optional)
            old_value: Previous value (optional)
            new_value: New value (optional)
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            AuditLog: The created audit log entry
        """
        audit_log = AuditLog(
            table_name=table_name,
            record_id=record_id,
            action=action,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            performed_by=performed_by,
            ip_address=ip_address,
            user_agent=user_agent
        )

        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return audit_log

    @staticmethod
    def log_insert(
        db: Session,
        table_name: str,
        record_id: int,
        performed_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log an INSERT action"""
        return AuditService.log_action(
            db=db,
            table_name=table_name,
            record_id=record_id,
            action=AuditAction.INSERT,
            performed_by=performed_by,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def log_update(
        db: Session,
        table_name: str,
        record_id: int,
        performed_by: int,
        field_name: str,
        old_value: any,
        new_value: any,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log an UPDATE action"""
        return AuditService.log_action(
            db=db,
            table_name=table_name,
            record_id=record_id,
            action=AuditAction.UPDATE,
            performed_by=performed_by,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def log_delete(
        db: Session,
        table_name: str,
        record_id: int,
        performed_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log a DELETE action"""
        return AuditService.log_action(
            db=db,
            table_name=table_name,
            record_id=record_id,
            action=AuditAction.DELETE,
            performed_by=performed_by,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def log_approve(
        db: Session,
        table_name: str,
        record_id: int,
        performed_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log an APPROVE action"""
        return AuditService.log_action(
            db=db,
            table_name=table_name,
            record_id=record_id,
            action=AuditAction.APPROVE,
            performed_by=performed_by,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def log_reject(
        db: Session,
        table_name: str,
        record_id: int,
        performed_by: int,
        comments: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log a REJECT action"""
        return AuditService.log_action(
            db=db,
            table_name=table_name,
            record_id=record_id,
            action=AuditAction.REJECT,
            performed_by=performed_by,
            field_name="review_comments",
            new_value=comments,
            ip_address=ip_address,
            user_agent=user_agent
        )

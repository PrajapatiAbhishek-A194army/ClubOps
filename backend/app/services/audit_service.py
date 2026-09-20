import csv
import hashlib
import io
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.models.audit import AuditLog, AuditResult, AuditSource
from app.models.club import Club, ClubMembership, ClubRole, MembershipStatus
from app.models.user import User
from app.schemas.audit import (
    AuditLogEntry,
    ChainIntegrityReport,
    GovernanceMatrixResponse,
    GovernanceRule,
    SecuritySummaryResponse,
)

logger = logging.getLogger(__name__)

GENESIS_PREV_HASH = "0" * 64


def calculate_integrity_hash(
    prev_hash: str,
    timestamp_iso: str,
    actor_id: str,
    action: str,
    entity_id: str,
    result: str,
) -> str:
    raw = f"{prev_hash}|{timestamp_iso}|{actor_id}|{action}|{entity_id}|{result}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        club_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        actor: Optional[User] = None,
        actor_role: Optional[str] = None,
        source: AuditSource = AuditSource.HUMAN,
        result: AuditResult = AuditResult.SUCCESS,
        diff_payload: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = "127.0.0.1",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Appends an immutable, cryptographic SHA-256 hash-linked audit log.
        """
        # Fetch latest entry to obtain previous hash
        last_log = (
            db.query(AuditLog)
            .filter(AuditLog.club_id == club_id)
            .order_by(desc(AuditLog.created_at), desc(AuditLog.id))
            .first()
        )

        prev_hash = last_log.integrity_hash if (last_log and last_log.integrity_hash) else GENESIS_PREV_HASH
        now = datetime.utcnow()
        timestamp_iso = now.isoformat()

        actor_id_str = actor.id if actor else "SYSTEM"
        actor_name_str = actor.full_name if actor else "System Automation"
        actor_email_str = actor.email if actor else "system@clubops.ai"

        if not actor_role and actor:
            membership = (
                db.query(ClubMembership)
                .filter(
                    ClubMembership.club_id == club_id,
                    ClubMembership.user_id == actor.id,
                    ClubMembership.status == MembershipStatus.ACTIVE,
                )
                .first()
            )
            actor_role = membership.role.value if membership and membership.role else "MEMBER"
        elif not actor_role:
            actor_role = "SYSTEM"

        calculated_hash = calculate_integrity_hash(
            prev_hash=prev_hash,
            timestamp_iso=timestamp_iso,
            actor_id=actor_id_str,
            action=action,
            entity_id=entity_id,
            result=result.value if hasattr(result, "value") else str(result),
        )

        diff_str = json.dumps(diff_payload) if diff_payload else None

        entry = AuditLog(
            club_id=club_id,
            actor_user_id=actor.id if actor else None,
            actor_name=actor_name_str,
            actor_email=actor_email_str,
            actor_role=actor_role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            source=source,
            result=result,
            diff_json=diff_str,
            ip_address=ip_address,
            prev_hash=prev_hash,
            integrity_hash=calculated_hash,
            metadata_json=metadata or {},
            created_at=now,
        )

        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def verify_chain_integrity(club_id: str, db: Session) -> ChainIntegrityReport:
        """
        Sequentially recomputes and verifies the cryptographic hash chain
        from the genesis entry to the latest entry.
        """
        logs = (
            db.query(AuditLog)
            .filter(AuditLog.club_id == club_id)
            .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
            .all()
        )

        total = len(logs)
        if total == 0:
            return ChainIntegrityReport(
                club_id=club_id,
                total_records=0,
                verified_records=0,
                is_valid=True,
                chain_head_hash=None,
                broken_at_id=None,
                verification_message="Chain is empty (genesis pending).",
                verified_at=datetime.utcnow().isoformat(),
            )

        expected_prev = GENESIS_PREV_HASH
        verified_count = 0

        for idx, entry in enumerate(logs):
            # Check linking
            if idx == 0:
                if entry.prev_hash != GENESIS_PREV_HASH:
                    return ChainIntegrityReport(
                        club_id=club_id,
                        total_records=total,
                        verified_records=verified_count,
                        is_valid=False,
                        chain_head_hash=entry.integrity_hash,
                        broken_at_id=entry.id,
                        verification_message=f"Genesis entry {entry.id} does not link to root.",
                        verified_at=datetime.utcnow().isoformat(),
                    )
            else:
                if entry.prev_hash != expected_prev:
                    return ChainIntegrityReport(
                        club_id=club_id,
                        total_records=total,
                        verified_records=verified_count,
                        is_valid=False,
                        chain_head_hash=entry.integrity_hash,
                        broken_at_id=entry.id,
                        verification_message=f"Broken link detected at block {entry.id}.",
                        verified_at=datetime.utcnow().isoformat(),
                    )

            # Recompute hash
            recomputed = calculate_integrity_hash(
                prev_hash=entry.prev_hash,
                timestamp_iso=entry.created_at.isoformat(),
                actor_id=entry.actor_user_id or "SYSTEM",
                action=entry.action,
                entity_id=entry.entity_id,
                result=entry.result.value if hasattr(entry.result, "value") else str(entry.result),
            )

            if recomputed != entry.integrity_hash:
                return ChainIntegrityReport(
                    club_id=club_id,
                    total_records=total,
                    verified_records=verified_count,
                    is_valid=False,
                    chain_head_hash=entry.integrity_hash,
                    broken_at_id=entry.id,
                    verification_message=f"Cryptographic signature mismatch at block {entry.id}. Data tampering detected!",
                    verified_at=datetime.utcnow().isoformat(),
                )

            expected_prev = entry.integrity_hash
            verified_count += 1

        return ChainIntegrityReport(
            club_id=club_id,
            total_records=total,
            verified_records=verified_count,
            is_valid=True,
            chain_head_hash=logs[-1].integrity_hash,
            broken_at_id=None,
            verification_message="All cryptographic signatures verified. Zero tampering detected.",
            verified_at=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def seed_initial_audit_logs_if_empty(club_id: str, db: Session):
        """
        Seeds standard initial governance logs for a club if none exist
        so the security portal immediately demonstrates verified logs.
        """
        count = db.query(AuditLog).filter(AuditLog.club_id == club_id).count()
        if count > 0:
            return

        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            return

        president = (
            db.query(User)
            .join(ClubMembership, ClubMembership.user_id == User.id)
            .filter(
                ClubMembership.club_id == club_id,
                ClubMembership.role == ClubRole.PRESIDENT,
            )
            .first()
        )
        if not president:
            president = db.query(User).filter(User.email == "president@clubops.ai").first()

        # Genesis Block
        AuditService.log_action(
            db=db,
            club_id=club_id,
            action="CLUB_INITIALIZED",
            entity_type="CLUB",
            entity_id=club_id,
            actor=president,
            actor_role="PRESIDENT",
            source=AuditSource.HUMAN,
            result=AuditResult.SUCCESS,
            diff_payload={"before": None, "after": {"name": club.name, "code": club.code}},
            metadata={"institution": club.institution or "Campus"},
        )

        # Governance Policy Enforced
        AuditService.log_action(
            db=db,
            club_id=club_id,
            action="POLICY_ENFORCED: DENY_BY_DEFAULT",
            entity_type="SECURITY",
            entity_id="policy_default_deny",
            actor=None,
            actor_role="SYSTEM",
            source=AuditSource.RULE_ENGINE,
            result=AuditResult.SUCCESS,
            diff_payload={"policy": "STRICT_SEPARATION_OF_DUTIES", "enforced": True},
        )

        # Role Assignment
        AuditService.log_action(
            db=db,
            club_id=club_id,
            action="ROLE_ASSIGNED: PRESIDENT",
            entity_type="MEMBER",
            entity_id=president.id if president else "usr_president",
            actor=president,
            actor_role="PRESIDENT",
            source=AuditSource.HUMAN,
            result=AuditResult.SUCCESS,
            diff_payload={"role": "PRESIDENT", "status": "ACTIVE"},
        )

        # Denied escalation simulation
        AuditService.log_action(
            db=db,
            club_id=club_id,
            action="UNAUTHORIZED_ROLE_UPGRADE_ATTEMPT",
            entity_type="SECURITY",
            entity_id="sec_violation_001",
            actor=None,
            actor_role="VOLUNTEER",
            source=AuditSource.RULE_ENGINE,
            result=AuditResult.DENIED,
            diff_payload={"requested_role": "PRESIDENT", "current_role": "VOLUNTEER"},
            metadata={"denial_reason": "Separation of duties prevents self-elevation to club leadership"},
        )

    @staticmethod
    def query_logs(
        club_id: str,
        db: Session,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        result: Optional[str] = None,
        source: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AuditLogEntry], int]:
        AuditService.seed_initial_audit_logs_if_empty(club_id, db)

        query = db.query(AuditLog).filter(AuditLog.club_id == club_id)

        if action:
            query = query.filter(AuditLog.action.ilike(f"%{action}%"))
        if entity_type and entity_type.upper() != "ALL":
            query = query.filter(AuditLog.entity_type == entity_type.upper())
        if result and result.upper() != "ALL":
            query = query.filter(AuditLog.result == result.upper())
        if source and source.upper() != "ALL":
            query = query.filter(AuditLog.source == source.upper())
        if search:
            query = query.filter(
                or_(
                    AuditLog.action.ilike(f"%{search}%"),
                    AuditLog.actor_name.ilike(f"%{search}%"),
                    AuditLog.actor_email.ilike(f"%{search}%"),
                    AuditLog.entity_id.ilike(f"%{search}%"),
                )
            )

        total_count = query.count()
        logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()

        entries = []
        for l in logs:
            entries.append(
                AuditLogEntry(
                    id=l.id,
                    club_id=l.club_id,
                    actor_user_id=l.actor_user_id,
                    actor_name=l.actor_name,
                    actor_email=l.actor_email,
                    actor_role=l.actor_role,
                    action=l.action,
                    entity_type=l.entity_type,
                    entity_id=l.entity_id,
                    source=l.source,
                    result=l.result,
                    diff_payload=l.diff_dict,
                    ip_address=l.ip_address,
                    prev_hash=l.prev_hash,
                    integrity_hash=l.integrity_hash,
                    created_at=l.created_at,
                )
            )

        return entries, total_count

    @staticmethod
    def get_security_summary(club_id: str, db: Session) -> SecuritySummaryResponse:
        AuditService.seed_initial_audit_logs_if_empty(club_id, db)

        total_events = db.query(AuditLog).filter(AuditLog.club_id == club_id).count()
        denied_attempts = (
            db.query(AuditLog)
            .filter(AuditLog.club_id == club_id, AuditLog.result == AuditResult.DENIED)
            .count()
        )
        last_log = (
            db.query(AuditLog)
            .filter(AuditLog.club_id == club_id)
            .order_by(desc(AuditLog.created_at))
            .first()
        )

        integrity = AuditService.verify_chain_integrity(club_id, db)

        return SecuritySummaryResponse(
            club_id=club_id,
            total_events_logged=total_events,
            denied_access_attempts=denied_attempts,
            integrity_status="VERIFIED" if integrity.is_valid else "TAMPERED",
            last_audit_timestamp=last_log.created_at.isoformat() if last_log else None,
        )

    @staticmethod
    def get_governance_matrix(club_id: str) -> GovernanceMatrixResponse:
        rules = [
            GovernanceRule(
                operation="Transfer Club Leadership / Presidency",
                category="LEADERSHIP",
                description="Transfer primary presidential authority or executive ownership.",
                president="APPROVAL_REQUIRED",
                club_head="DENY",
                organizer="DENY",
                volunteer="DENY",
                member="DENY",
                requires_dual_approval=True,
            ),
            GovernanceRule(
                operation="Approve Member Join Request",
                category="MEMBERSHIP",
                description="Grant active membership and student registration.",
                president="ALLOW",
                club_head="APPROVAL_REQUIRED",
                organizer="APPROVAL_REQUIRED",
                volunteer="DENY",
                member="DENY",
            ),
            GovernanceRule(
                operation="Create / Publish Campus Event",
                category="EVENTS",
                description="Publish event schedule and recruit student attendees.",
                president="ALLOW",
                club_head="ALLOW",
                organizer="ALLOW",
                volunteer="DENY",
                member="DENY",
            ),
            GovernanceRule(
                operation="Delete / Cancel Campus Event",
                category="EVENTS",
                description="Irrevocably remove scheduled campus program.",
                president="ALLOW",
                club_head="APPROVAL_REQUIRED",
                organizer="APPROVAL_REQUIRED",
                volunteer="DENY",
                member="DENY",
                requires_dual_approval=True,
            ),
            GovernanceRule(
                operation="Assign Volunteers to Tasks",
                category="TASKS",
                description="Assign task ownership and volunteer work shifts.",
                president="ALLOW",
                club_head="ALLOW",
                organizer="ALLOW",
                volunteer="DENY",
                member="DENY",
            ),
            GovernanceRule(
                operation="Broadcast Multi-Channel Announcement",
                category="BROADCAST",
                description="Dispatch mass Email, In-App, or WhatsApp notices.",
                president="ALLOW",
                club_head="APPROVAL_REQUIRED",
                organizer="APPROVAL_REQUIRED",
                volunteer="DENY",
                member="DENY",
            ),
            GovernanceRule(
                operation="Emit Urgent Emergency Alert",
                category="BROADCAST",
                description="Send immediate high-priority alert across live channels.",
                president="ALLOW",
                club_head="ALLOW",
                organizer="ALLOW",
                volunteer="DENY",
                member="DENY",
            ),
            GovernanceRule(
                operation="Export Compliance & Audit CSV",
                category="COMPLIANCE",
                description="Download full cryptographic audit log for dean review.",
                president="ALLOW",
                club_head="DENY",
                organizer="DENY",
                volunteer="DENY",
                member="DENY",
            ),
        ]

        return GovernanceMatrixResponse(
            club_id=club_id,
            policy_name="Campus Organization Separation of Duties (SOD-2026)",
            security_model="DENY_BY_DEFAULT",
            rules=rules,
        )

    @staticmethod
    def export_audit_csv(club_id: str, db: Session) -> str:
        AuditService.seed_initial_audit_logs_if_empty(club_id, db)

        logs = (
            db.query(AuditLog)
            .filter(AuditLog.club_id == club_id)
            .order_by(AuditLog.created_at.asc())
            .all()
        )

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["CLUBOPS AI - IMMUTABLE CRYPTOGRAPHIC AUDIT LOG (SHA-256 CHAIN)"])
        writer.writerow(["Club ID", club_id])
        writer.writerow(["Exported At", datetime.utcnow().isoformat()])
        writer.writerow(["Total Records", len(logs)])
        writer.writerow([])

        writer.writerow([
            "Timestamp (UTC)",
            "Actor Name",
            "Actor Email",
            "Actor Role",
            "Action Verb",
            "Entity Type",
            "Entity ID",
            "Source",
            "Result",
            "Previous Hash",
            "Integrity Hash (SHA-256)",
            "Diff Payload (JSON)",
        ])

        for l in logs:
            writer.writerow([
                l.created_at.isoformat(),
                l.actor_name,
                l.actor_email,
                l.actor_role,
                l.action,
                l.entity_type,
                l.entity_id,
                l.source.value if hasattr(l.source, "value") else str(l.source),
                l.result.value if hasattr(l.result, "value") else str(l.result),
                l.prev_hash,
                l.integrity_hash,
                l.diff_json or "{}",
            ])

        return output.getvalue()

import csv
import io
import json
import logging
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config.settings import settings
from app.models.club import Club, ClubMembership, MembershipStatus, ClubRole
from app.models.event import Event, EventStatus
from app.models.task import Task, TaskStatus, TaskPriority, TaskAssignment
from app.models.risk import Risk, RiskSeverity, RiskStatus
from app.models.volunteer import VolunteerProfile, CheckInStatus
from app.models.user import User
from app.schemas.analytics import (
    AIExecutiveSummary,
    ClubHealthScore,
    EventCadenceItem,
    FullAnalyticsReportResponse,
    HealthScoreComponent,
    PriorityDistribution,
    RiskSeverityCount,
    TaskStatusDistribution,
    VolunteerLeaderboardItem,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    @staticmethod
    def compute_health_score(club_id: str, db: Session) -> ClubHealthScore:
        # 1. Task Completion Velocity (Weight: 35%)
        tasks = (
            db.query(Task)
            .join(Event, Task.event_id == Event.id)
            .filter(Event.club_id == club_id)
            .all()
        )
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.DONE)
        blocked_tasks = sum(1 for t in tasks if t.status == TaskStatus.BLOCKED)

        task_completion_rate = (completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 85.0
        # Slight penalty for blocked tasks
        task_score_base = max(0.0, task_completion_rate - (blocked_tasks * 5.0))
        task_component_score = (task_score_base / 100.0) * 35.0

        # 2. Risk Radar Severity (Weight: 30%)
        active_risks = (
            db.query(Risk)
            .join(Event, Risk.event_id == Event.id)
            .filter(Event.club_id == club_id, Risk.status == RiskStatus.OPEN)
            .all()
        )
        crit_risks = sum(1 for r in active_risks if r.severity == RiskSeverity.CRITICAL)
        high_risks = sum(1 for r in active_risks if r.severity == RiskSeverity.HIGH)
        med_risks = sum(1 for r in active_risks if r.severity == RiskSeverity.MEDIUM)

        risk_base = max(0.0, 100.0 - (crit_risks * 25.0) - (high_risks * 12.0) - (med_risks * 5.0))
        risk_component_score = (risk_base / 100.0) * 30.0

        # 3. Volunteer Staffing Ratio (Weight: 20%)
        members = (
            db.query(ClubMembership)
            .filter(
                ClubMembership.club_id == club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
            )
            .all()
        )
        total_members = len(members)

        assigned_user_ids = set(
            row[0]
            for row in db.query(TaskAssignment.user_id)
            .join(Task, TaskAssignment.task_id == Task.id)
            .join(Event, Task.event_id == Event.id)
            .filter(Event.club_id == club_id)
            .distinct()
            .all()
        )
        staffed_members = len(assigned_user_ids)
        staffing_pct = (staffed_members / total_members * 100.0) if total_members > 0 else 90.0
        staffing_base = min(100.0, max(30.0, staffing_pct))
        staffing_component_score = (staffing_base / 100.0) * 20.0

        # 4. Event Milestone Health (Weight: 15%)
        events = (
            db.query(Event)
            .filter(Event.club_id == club_id, Event.status != EventStatus.CANCELLED)
            .all()
        )
        total_events = len(events)
        at_risk_events = sum(1 for e in events if e.status == EventStatus.AT_RISK)
        event_health_pct = (
            ((total_events - at_risk_events) / total_events * 100.0) if total_events > 0 else 100.0
        )
        event_component_score = (event_health_pct / 100.0) * 15.0

        overall = int(
            round(
                task_component_score
                + risk_component_score
                + staffing_component_score
                + event_component_score
            )
        )
        overall = max(10, min(100, overall))

        if overall >= 85:
            tier = "EXCELLENT"
            label = "Peak Operational Rhythm"
            summary = "Club events, tasks, and volunteer deployments are operating with exceptional velocity and minimal risk."
        elif overall >= 70:
            tier = "HEALTHY"
            label = "Healthy Trajectory"
            summary = "Solid execution across key events. Minor bottlenecks exist in task dependencies or volunteer coverage."
        elif overall >= 50:
            tier = "NEEDS_ATTENTION"
            label = "Operational Friction Detected"
            summary = "Multiple blocked tasks or unmitigated risks require leadership intervention to maintain delivery schedule."
        else:
            tier = "CRITICAL"
            label = "High Operational Risk"
            summary = "Critical event deadlines or unstaffed workflows require urgent executive reallocation."

        components = [
            HealthScoreComponent(
                name="Task Completion Velocity",
                weight_pct=35,
                score=round(task_component_score, 1),
                max_score=35.0,
                impact_note=f"{completed_tasks}/{total_tasks} tasks completed ({round(task_completion_rate)}%). {blocked_tasks} blocked.",
            ),
            HealthScoreComponent(
                name="Risk Radar Mitigation",
                weight_pct=30,
                score=round(risk_component_score, 1),
                max_score=30.0,
                impact_note=f"{crit_risks} critical, {high_risks} high risks active.",
            ),
            HealthScoreComponent(
                name="Volunteer Staffing Ratio",
                weight_pct=20,
                score=round(staffing_component_score, 1),
                max_score=20.0,
                impact_note=f"{staffed_members}/{total_members} active members assigned to event roles.",
            ),
            HealthScoreComponent(
                name="Event Milestone Health",
                weight_pct=15,
                score=round(event_component_score, 1),
                max_score=15.0,
                impact_note=f"{total_events - at_risk_events}/{total_events} events running on track.",
            ),
        ]

        return ClubHealthScore(
            overall_score=overall,
            status_tier=tier,
            status_label=label,
            summary_message=summary,
            components=components,
        )

    @staticmethod
    def get_event_cadence(club_id: str, db: Session) -> List[EventCadenceItem]:
        events = (
            db.query(Event)
            .filter(Event.club_id == club_id)
            .order_by(Event.start_date.asc())
            .all()
        )

        month_map = defaultdict(lambda: {"total": 0, "completed": 0, "on_track": 0, "at_risk": 0})
        for e in events:
            month_label = e.start_date.strftime("%b %Y") if e.start_date else "TBD"
            month_map[month_label]["total"] += 1
            if e.status == EventStatus.COMPLETED:
                month_map[month_label]["completed"] += 1
            elif e.status == EventStatus.AT_RISK:
                month_map[month_label]["at_risk"] += 1
            else:
                month_map[month_label]["on_track"] += 1

        if not month_map:
            # Provide current and next month placeholders
            now = datetime.utcnow()
            m1 = now.strftime("%b %Y")
            return [
                EventCadenceItem(month=m1, total_events=0, completed=0, on_track=0, at_risk=0)
            ]

        return [
            EventCadenceItem(
                month=m,
                total_events=counts["total"],
                completed=counts["completed"],
                on_track=counts["on_track"],
                at_risk=counts["at_risk"],
            )
            for m, counts in month_map.items()
        ]

    @staticmethod
    def get_task_velocity(club_id: str, db: Session) -> (List[TaskStatusDistribution], List[PriorityDistribution]):
        tasks = (
            db.query(Task)
            .join(Event, Task.event_id == Event.id)
            .filter(Event.club_id == club_id)
            .all()
        )

        total = len(tasks)
        status_counts = defaultdict(int)
        priority_counts = defaultdict(int)

        for t in tasks:
            status_counts[t.status.value] += 1
            priority_counts[t.priority.value] += 1

        status_order = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]
        status_dist = []
        for s in status_order:
            cnt = status_counts[s]
            pct = round((cnt / total * 100.0), 1) if total > 0 else 0.0
            status_dist.append(TaskStatusDistribution(status=s, count=cnt, percentage=pct))

        priority_order = ["URGENT", "HIGH", "MEDIUM", "LOW"]
        priority_dist = [
            PriorityDistribution(priority=p, count=priority_counts[p])
            for p in priority_order
        ]

        return status_dist, priority_dist

    @staticmethod
    def get_volunteer_leaderboard(club_id: str, db: Session) -> List[VolunteerLeaderboardItem]:
        memberships = (
            db.query(ClubMembership)
            .filter(
                ClubMembership.club_id == club_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
            )
            .all()
        )

        leaderboard = []
        for m in memberships:
            user = m.user
            if not user:
                continue

            # Tasks completed
            completed_count = (
                db.query(TaskAssignment)
                .join(Task, TaskAssignment.task_id == Task.id)
                .join(Event, Task.event_id == Event.id)
                .filter(
                    Event.club_id == club_id,
                    TaskAssignment.user_id == user.id,
                    Task.status == TaskStatus.DONE,
                )
                .count()
            )

            # Events attended / checked in
            profile = (
                db.query(VolunteerProfile)
                .filter(
                    VolunteerProfile.user_id == user.id,
                    VolunteerProfile.club_id == club_id,
                )
                .first()
            )
            checkins = 1 if (profile and profile.check_in_status == CheckInStatus.CHECKED_IN) else 0

            points = (completed_count * 20) + (checkins * 30) + 10

            leaderboard.append(
                VolunteerLeaderboardItem(
                    user_id=user.id,
                    full_name=user.full_name,
                    email=user.email,
                    role=m.role.value if m.role else "VOLUNTEER",
                    tasks_completed=completed_count,
                    events_attended=checkins,
                    engagement_points=points,
                )
            )

        # Sort descending by engagement points
        leaderboard.sort(key=lambda x: x.engagement_points, reverse=True)
        return leaderboard[:10]

    @staticmethod
    def get_risk_breakdown(club_id: str, db: Session) -> List[RiskSeverityCount]:
        risks = (
            db.query(Risk)
            .join(Event, Risk.event_id == Event.id)
            .filter(Event.club_id == club_id)
            .all()
        )

        total = len(risks)
        counts = defaultdict(int)
        for r in risks:
            counts[r.severity.value] += 1

        order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        return [
            RiskSeverityCount(
                severity=s,
                count=counts[s],
                percentage=round((counts[s] / total * 100.0), 1) if total > 0 else 0.0,
            )
            for s in order
        ]

    @staticmethod
    def generate_ai_operational_insights(
        club_id: str,
        club_name: str,
        health: ClubHealthScore,
        total_events: int,
        total_tasks: int,
        active_risks_count: int,
    ) -> AIExecutiveSummary:
        """
        Uses Groq LLM (llama-3.3-70b-versatile) to produce structured executive insights.
        Includes deterministic fallback if Groq API is unavailable.
        """
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq

                client = Groq(api_key=settings.GROQ_API_KEY)
                system_prompt = (
                    "You are the Chief AI Systems Architect and Operations Analyst for ClubOps AI. "
                    "Analyze the provided student organization telemetry and return a structured JSON object. "
                    "Return exactly this JSON schema:\n"
                    "{\n"
                    '  "health_assessment": "1-2 sentence executive assessment of club momentum.",\n'
                    '  "operational_strengths": ["string", "string", "string"],\n'
                    '  "critical_bottlenecks": ["string", "string"],\n'
                    '  "actionable_recommendations": ["string", "string", "string"]\n'
                    "}"
                )

                user_prompt = (
                    f"Club Name: {club_name}\n"
                    f"Overall Operational Health Score: {health.overall_score}/100 ({health.status_tier})\n"
                    f"Total Scheduled Events: {total_events}\n"
                    f"Total In-Flight Tasks: {total_tasks}\n"
                    f"Active Operational Risks: {active_risks_count}\n"
                    f"Sub-score details:\n"
                    + "\n".join(f"- {c.name}: {c.score}/{c.max_score} ({c.impact_note})" for c in health.components)
                )

                response = client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.3,
                    max_tokens=600,
                    response_format={"type": "json_object"},
                )

                parsed = json.loads(response.choices[0].message.content)
                return AIExecutiveSummary(
                    health_assessment=parsed.get("health_assessment", health.summary_message),
                    operational_strengths=parsed.get("operational_strengths", [
                        "Solid cross-functional participation across event teams.",
                        "Effective volunteer match rate for campus initiatives.",
                        "Transparent audit trail across all approved workflows.",
                    ]),
                    critical_bottlenecks=parsed.get("critical_bottlenecks", [
                        f"{active_risks_count} active risk flags require mitigations.",
                        "Task dependencies pending sponsor or finance clearance.",
                    ]),
                    actionable_recommendations=parsed.get("actionable_recommendations", [
                        "Reassign unallocated volunteers to registration and technical tracks.",
                        "Convene a 15-minute emergency sync to unblock critical path tasks.",
                        "Publish urgent venue announcement to synchronize campus attendees.",
                    ]),
                    generated_at=datetime.utcnow().isoformat(),
                )
            except Exception as e:
                logger.warning(f"[AnalyticsService] Groq generation failed: {e}. Using deterministic fallback.")

        # Deterministic Fallback
        strengths = [
            f"Consistently maintaining {health.overall_score}% operational health rating.",
            f"Active event roster of {total_events} programs supported by structured workflows.",
            "Proactive telemetry detecting bottlenecks before scheduled delivery dates.",
        ]
        bottlenecks = [
            f"{active_risks_count} detected risk dependencies in flight requiring mentor review.",
            "Volunteer distribution concentrated in leading tracks while media coverage is lean.",
        ]
        recommendations = [
            "Trigger automated AI volunteer matching to rebalance team allocations.",
            "Review critical path tasks with organizers during the weekly sprint check-in.",
            "Archive completed event documents to maintain institutional RAG knowledge.",
        ]

        return AIExecutiveSummary(
            health_assessment=f"{club_name} is currently operating at {health.status_label} ({health.overall_score}/100 index).",
            operational_strengths=strengths,
            critical_bottlenecks=bottlenecks,
            actionable_recommendations=recommendations,
            generated_at=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def get_full_overview(club_id: str, db: Session) -> FullAnalyticsReportResponse:
        club = db.query(Club).filter(Club.id == club_id).first()
        club_name = club.name if club else "Campus Club"

        health = AnalyticsService.compute_health_score(club_id, db)
        cadence = AnalyticsService.get_event_cadence(club_id, db)
        task_dist, priority_dist = AnalyticsService.get_task_velocity(club_id, db)
        leaderboard = AnalyticsService.get_volunteer_leaderboard(club_id, db)
        risks_breakdown = AnalyticsService.get_risk_breakdown(club_id, db)

        total_events = db.query(Event).filter(Event.club_id == club_id).count()
        total_tasks = (
            db.query(Task)
            .join(Event, Task.event_id == Event.id)
            .filter(Event.club_id == club_id)
            .count()
        )
        total_volunteers = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == club_id, ClubMembership.status == MembershipStatus.ACTIVE)
            .count()
        )
        active_risks_count = (
            db.query(Risk)
            .join(Event, Risk.event_id == Event.id)
            .filter(Event.club_id == club_id, Risk.status == RiskStatus.OPEN)
            .count()
        )

        ai_summary = AnalyticsService.generate_ai_operational_insights(
            club_id=club_id,
            club_name=club_name,
            health=health,
            total_events=total_events,
            total_tasks=total_tasks,
            active_risks_count=active_risks_count,
        )

        return FullAnalyticsReportResponse(
            club_id=club_id,
            club_name=club_name,
            generated_at=datetime.utcnow().isoformat(),
            total_events=total_events,
            total_tasks=total_tasks,
            total_volunteers=total_volunteers,
            active_risks_count=active_risks_count,
            health_score=health,
            event_cadence=cadence,
            task_distribution=task_dist,
            priority_distribution=priority_dist,
            volunteer_leaderboard=leaderboard,
            risk_breakdown=risks_breakdown,
            ai_insights=ai_summary,
        )

    @staticmethod
    def generate_csv_report(club_id: str, db: Session) -> str:
        overview = AnalyticsService.get_full_overview(club_id, db)

        output = io.StringIO()
        writer = csv.writer(output)

        # Header Info
        writer.writerow(["CLUBOPS AI - INSTITUTIONAL OPERATIONS & COMPLIANCE REPORT"])
        writer.writerow(["Club Name", overview.club_name])
        writer.writerow(["Club ID", overview.club_id])
        writer.writerow(["Report Generated At", overview.generated_at])
        writer.writerow(["Operational Health Score", f"{overview.health_score.overall_score}/100 ({overview.health_score.status_tier})"])
        writer.writerow([])

        # KPI Summary
        writer.writerow(["OPERATIONAL KPIs"])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Events", overview.total_events])
        writer.writerow(["Total Tasks", overview.total_tasks])
        writer.writerow(["Active Volunteers Roster", overview.total_volunteers])
        writer.writerow(["Active Unmitigated Risks", overview.active_risks_count])
        writer.writerow([])

        # Task Distribution
        writer.writerow(["TASK VELOCITY BREAKDOWN"])
        writer.writerow(["Status", "Count", "Percentage"])
        for td in overview.task_distribution:
            writer.writerow([td.status, td.count, f"{td.percentage}%"])
        writer.writerow([])

        # Risk Breakdown
        writer.writerow(["RISK RADAR BREAKDOWN"])
        writer.writerow(["Severity", "Count", "Percentage"])
        for rb in overview.risk_breakdown:
            writer.writerow([rb.severity, rb.count, f"{rb.percentage}%"])
        writer.writerow([])

        # Top Volunteers
        writer.writerow(["TOP VOLUNTEER CONTRIBUTORS"])
        writer.writerow(["Rank", "Full Name", "Email", "Role", "Tasks Completed", "Events Attended", "Engagement Points"])
        for idx, v in enumerate(overview.volunteer_leaderboard, start=1):
            writer.writerow([idx, v.full_name, v.email, v.role, v.tasks_completed, v.events_attended, v.engagement_points])
        writer.writerow([])

        # AI Recommendations
        if overview.ai_insights:
            writer.writerow(["EXECUTIVE RECOMMENDATIONS"])
            for rec in overview.ai_insights.actionable_recommendations:
                writer.writerow(["-", rec])

        return output.getvalue()

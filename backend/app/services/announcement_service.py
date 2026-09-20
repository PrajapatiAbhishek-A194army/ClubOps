import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.announcement import Announcement, AnnouncementSource, AnnouncementStatus
from app.models.club import Club, ClubMembership
from app.models.event import Event
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.announcement import (
    AIGenerateAnnouncementRequest,
    AIGenerateAnnouncementResponse,
    AnnouncementCategory,
    AnnouncementChannel,
    AnnouncementCreate,
    AnnouncementTone,
    AnnouncementUpdate,
)
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class AnnouncementService:
    @staticmethod
    def generate_ai_announcement(
        db: Session,
        club_id: str,
        req: AIGenerateAnnouncementRequest,
    ) -> AIGenerateAnnouncementResponse:
        """
        Uses Groq LLM (llama-3.3-70b-versatile) to generate a high-impact,
        structured campus announcement tailored to the category, tone, and channel.
        Includes deterministic fallback if LLM is unavailable.
        """
        club = db.query(Club).filter(Club.id == club_id).first()
        club_name = club.name if club else "Campus Club"

        event = None
        event_context = ""
        if req.event_id:
            event = db.query(Event).filter(Event.id == req.event_id, Event.club_id == club_id).first()
            if event:
                start_str = event.start_date.strftime("%A, %b %d, %Y at %I:%M %p") if event.start_date else "TBD"
                event_context = (
                    f"Event Title: {event.title}\n"
                    f"Event Type: {event.event_type.value if hasattr(event.event_type, 'value') else event.event_type}\n"
                    f"Start Date: {start_str}\n"
                    f"Location/Venue: {event.location or 'Main Auditorium'}\n"
                    f"Description: {event.description or 'No extra details'}\n"
                )

        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)

                system_prompt = (
                    "You are the senior communications and PR director for a premier collegiate organization. "
                    "Write an exceptionally engaging, structured, and polished announcement tailored to student members.\n"
                    "Output ONLY valid JSON adhering strictly to this schema:\n"
                    "{\n"
                    '  "title": "Compelling headline with appropriate emoji",\n'
                    '  "content": "Well-formatted body text with clean paragraphs, bullet points, and key details",\n'
                    '  "category": "String category matching request",\n'
                    '  "call_to_action": "Clear single-sentence call to action (e.g. Register before Thursday at 5 PM)",\n'
                    '  "channel_formatted": "A brief adaptation specifically formatted for the target broadcast medium"\n'
                    "}"
                )

                user_prompt = (
                    f"Club Name: {club_name}\n"
                    f"Announcement Category: {req.category.value}\n"
                    f"Tone: {req.tone.value}\n"
                    f"Target Channel: {req.target_channel.value}\n"
                    f"Custom Notes/Context: {req.custom_notes or 'Standard club broadcast'}\n"
                )
                if event_context:
                    user_prompt += f"\nAssociated Event Context:\n{event_context}\n"

                response = client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.4,
                    max_tokens=1000,
                    response_format={"type": "json_object"},
                )

                raw_content = response.choices[0].message.content
                parsed = json.loads(raw_content)
                return AIGenerateAnnouncementResponse(
                    title=parsed.get("title", f"📢 Announcement: {club_name}"),
                    content=parsed.get("content", "Important update for all club members."),
                    category=req.category.value,
                    call_to_action=parsed.get("call_to_action", "Check your dashboard for details."),
                    channel_formatted=parsed.get("channel_formatted", ""),
                )
            except Exception as e:
                logger.warning(f"[AnnouncementService] Groq generation failed: {e}. Using deterministic template.")

        # Deterministic Fallback Templates
        event_title = event.title if event else "Upcoming Event"
        venue_str = (event.location if event and event.location else "Campus Seminar Hall")
        date_str = (event.start_date.strftime("%b %d, %Y") if event and event.start_date else "this coming weekend")

        if req.category == AnnouncementCategory.REGISTRATION_REMINDER:
            title = f"⚡ Final Call: Register Now for {event_title}!"
            content = (
                f"Attention {club_name} community!\n\n"
                f"Spots are filling up rapidly for **{event_title}**, taking place on **{date_str}** at **{venue_str}**.\n\n"
                f"Don't miss the chance to collaborate with industry mentors, develop hands-on projects, and gain official certifications.\n\n"
                f"• Venue: {venue_str}\n"
                f"• Date: {date_str}\n"
                f"• Kits & Badges provided for registered attendees.\n\n"
                f"Please ensure your registration is submitted via ClubOps before the deadline."
            )
            cta = f"Secure your attendee badge for {event_title} today!"
            channel_fmt = f"⚡ *{event_title} Registration Closing Soon!* Register now on ClubOps AI: {venue_str} on {date_str}. Don't miss out! 🚀"

        elif req.category == AnnouncementCategory.VENUE_UPDATE:
            title = f"📍 Venue & Logistical Update: {event_title}"
            content = (
                f"Important update regarding logistics for **{event_title}**:\n\n"
                f"Please note the confirmed location and entry instructions:\n"
                f"• Primary Venue: **{venue_str}**\n"
                f"• Check-in Desk: North Entrance Lobby\n"
                f"• Schedule: Doors open 30 minutes prior to scheduled start on **{date_str}**.\n\n"
                f"Please bring your student ID and digital QR badge for expedited entry."
            )
            cta = "Review revised venue coordinates and check-in times on your dashboard."
            channel_fmt = f"📍 *Venue Update:* {event_title} will take place at *{venue_str}* on {date_str}. Check-in at North Lobby. See you there!"

        elif req.category == AnnouncementCategory.EMERGENCY_NOTICE:
            title = f"🚨 URGENT Operational Notice: {club_name}"
            content = (
                f"Attention all {club_name} members and event volunteers:\n\n"
                f"This is an urgent operational notice regarding current activities and schedules:\n"
                f"• Alert Summary: {req.custom_notes or 'Schedule adjustments are currently in effect.'}\n"
                f"• Action Required: All squad leads and on-duty volunteers report to the operations desk.\n"
                f"• Standby: Further live updates will be broadcasted via this channel.\n\n"
                f"Please coordinate with your club head or squad volunteers immediately if affected."
            )
            cta = "Acknowledge alert and monitor announcements for immediate operational updates."
            channel_fmt = f"🚨 *URGENT NOTICE [{club_name}]:* {req.custom_notes or 'Immediate operational update.'} Volunteers please report to operations desk."

        elif req.category == AnnouncementCategory.COMPLETION_MESSAGE:
            title = f"🎉 That's a Wrap! Thank You for Joining {event_title}"
            content = (
                f"On behalf of the entire leadership team at **{club_name}**, thank you to all participants, "
                f"organizers, and volunteers for making **{event_title}** a monumental success!\n\n"
                f"Highlights from the event:\n"
                f"• Unbelievable enthusiasm and collaborative spirit across all sessions.\n"
                f"• Outstanding deliverables and active engagement.\n"
                f"• Special recognition to our tireless volunteer crew who managed operations seamlessly.\n\n"
                f"Certificates of participation and event photo galleries will be available through the Knowledge Repository."
            )
            cta = "View event archives and claim your participation credentials on ClubOps."
            channel_fmt = f"🎉 *{event_title} was a massive success!* Huge thanks to everyone who participated and made it happen. Photos & certificates coming soon! 🏆"

        else:
            title = f"📢 Community Update from {club_name}"
            content = (
                f"Greetings {club_name} members,\n\n"
                f"We are excited to share key updates regarding our club's upcoming roadmap, active initiatives, "
                f"and upcoming opportunities for volunteers:\n\n"
                f"• Highlights: {req.custom_notes or 'Exciting workshops and collaborative hackathons planned.'}\n"
                f"• Get Involved: Check the volunteer board for active assignments and roles.\n\n"
                f"Stay tuned for upcoming milestones!"
            )
            cta = "Visit the ClubOps portal to explore upcoming events and volunteer roles."
            channel_fmt = f"📢 *[{club_name} Update]:* {req.custom_notes or 'New initiatives announced.'} Check ClubOps for details."

        return AIGenerateAnnouncementResponse(
            title=title,
            content=content,
            category=req.category.value,
            call_to_action=cta,
            channel_formatted=channel_fmt,
        )

    @staticmethod
    def create_announcement(
        db: Session,
        club_id: str,
        creator_id: str,
        ann_in: AnnouncementCreate,
    ) -> Announcement:
        status_enum = AnnouncementStatus.DRAFT
        try:
            status_enum = AnnouncementStatus(ann_in.status.upper())
        except Exception:
            status_enum = AnnouncementStatus.DRAFT

        source_enum = AnnouncementSource.MANUAL
        try:
            source_enum = AnnouncementSource(ann_in.created_source.upper())
        except Exception:
            source_enum = AnnouncementSource.MANUAL

        announcement = Announcement(
            club_id=club_id,
            event_id=ann_in.event_id,
            title=ann_in.title,
            content=ann_in.content,
            created_by_id=creator_id,
            created_source=source_enum,
            status=status_enum,
            category=ann_in.category or "GENERAL",
            target_channel=ann_in.target_channel or "EMAIL",
            email_broadcast_sent=False,
            email_sent_count=0,
            published_at=datetime.utcnow() if status_enum == AnnouncementStatus.PUBLISHED else None,
        )
        db.add(announcement)
        db.commit()
        db.refresh(announcement)
        return announcement

    @staticmethod
    def get_club_announcements(
        db: Session,
        club_id: str,
        status: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Announcement]:
        query = db.query(Announcement).filter(Announcement.club_id == club_id)

        if status:
            try:
                status_enum = AnnouncementStatus(status.upper())
                query = query.filter(Announcement.status == status_enum)
            except Exception:
                pass

        if category and category.upper() != "ALL":
            query = query.filter(Announcement.category == category.upper())

        return query.order_by(Announcement.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_announcement_by_id(
        db: Session,
        club_id: str,
        announcement_id: str,
    ) -> Optional[Announcement]:
        return (
            db.query(Announcement)
            .filter(Announcement.id == announcement_id, Announcement.club_id == club_id)
            .first()
        )

    @staticmethod
    def update_announcement(
        db: Session,
        announcement: Announcement,
        ann_update: AnnouncementUpdate,
    ) -> Announcement:
        if ann_update.title is not None:
            announcement.title = ann_update.title
        if ann_update.content is not None:
            announcement.content = ann_update.content
        if ann_update.category is not None:
            announcement.category = ann_update.category
        if ann_update.target_channel is not None:
            announcement.target_channel = ann_update.target_channel

        db.commit()
        db.refresh(announcement)
        return announcement

    @staticmethod
    def publish_announcement(
        db: Session,
        club_id: str,
        announcement_id: str,
        publisher: User,
        broadcast_email: bool = True,
        dispatch_in_app: bool = True,
    ) -> Announcement:
        announcement = (
            db.query(Announcement)
            .filter(Announcement.id == announcement_id, Announcement.club_id == club_id)
            .first()
        )
        if not announcement:
            raise ValueError("Announcement not found in this club")

        club = db.query(Club).filter(Club.id == club_id).first()
        club_name = club.name if club else "ClubOps AI"

        announcement.status = AnnouncementStatus.PUBLISHED
        announcement.published_at = datetime.utcnow()

        # 1. Dispatch In-App Notifications to all active club members
        memberships = (
            db.query(ClubMembership)
            .filter(ClubMembership.club_id == club_id)
            .all()
        )

        member_user_ids = {m.user_id for m in memberships if m.user_id}
        # Also ensure publisher or club creator is considered
        if club and club.created_by_id:
            member_user_ids.add(club.created_by_id)

        if dispatch_in_app and member_user_ids:
            for uid in member_user_ids:
                notif = Notification(
                    user_id=uid,
                    title=f"📢 {announcement.title}",
                    message=announcement.content[:240] + ("..." if len(announcement.content) > 240 else ""),
                    type=NotificationType.SYSTEM,
                    is_read=False,
                    link_url="/app/announcements",
                )
                db.add(notif)
            db.flush()

        # 2. Multi-Channel Brevo Email Broadcast Pipeline
        email_sent_count = 0
        if broadcast_email:
            users_to_email = db.query(User).filter(User.id.in_(list(member_user_ids))).all()
            
            # Construct styled HTML Email Body
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
                .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 24px; text-align: center; color: #ffffff; }}
                .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }}
                .header p {{ margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }}
                .content {{ padding: 28px 24px; line-height: 1.6; font-size: 14px; color: #334155; }}
                .badge {{ display: inline-block; background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }}
                .announcement-body {{ white-space: pre-line; background: #f8fafc; border: 1px solid #f1f5f9; padding: 18px; border-radius: 12px; margin: 16px 0; color: #1e293b; }}
                .footer {{ background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
                .btn {{ display: inline-block; background-color: #059669; color: #ffffff !important; padding: 10px 20px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 13px; margin-top: 12px; }}
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>{club_name}</h1>
                  <p>Official Campus Club Broadcast</p>
                </div>
                <div class="content">
                  <span class="badge">{announcement.category}</span>
                  <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">{announcement.title}</h2>
                  <div class="announcement-body">{announcement.content}</div>
                  <p style="margin-top: 20px; font-size: 13px; color: #64748b;">
                    Published by <strong>{publisher.full_name or 'Club Leadership'}</strong> on {datetime.utcnow().strftime('%B %d, %Y')}.
                  </p>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="http://localhost:5173/app/announcements" class="btn">View on ClubOps AI</a>
                  </div>
                </div>
                <div class="footer">
                  <p style="margin: 0;">Sent via ClubOps AI Broadcast Engine &bull; {club_name}</p>
                  <p style="margin: 4px 0 0 0;">You received this email because you are a registered member or volunteer of this club.</p>
                </div>
              </div>
            </body>
            </html>
            """

            for member in users_to_email:
                if member.email:
                    try:
                        EmailService.send_email(
                            to_email=member.email,
                            to_name=member.full_name or member.email,
                            subject=f"[{club_name}] {announcement.title}",
                            html_content=html_body,
                            text_content=announcement.content,
                        )
                        email_sent_count += 1
                    except Exception as email_err:
                        logger.warning(f"[AnnouncementService] Failed sending to {member.email}: {email_err}")

            announcement.email_broadcast_sent = True
            announcement.email_sent_count = email_sent_count

        db.commit()
        db.refresh(announcement)
        return announcement

    @staticmethod
    def delete_announcement(db: Session, announcement: Announcement) -> None:
        db.delete(announcement)
        db.commit()

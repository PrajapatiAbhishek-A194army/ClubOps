import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.collaboration import ChatMessage, ChatMessageType
from app.models.event import Event, EventStatus
from app.models.user import User
from app.models.club import ClubMembership, MembershipStatus
from app.schemas.collaboration import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatMessageSender,
    ChannelSummary,
    OnlineUserSummary,
    PresenceRosterResponse,
    SystemEventBroadcast,
)

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # club_id -> list of connection dicts:
        # { "ws": WebSocket, "user_id": str, "user_name": str, "user_email": str, "role": str, "connected_at": str }
        self._connections: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self, club_id: str, websocket: WebSocket, user: User, role: str):
        await websocket.accept()
        if club_id not in self._connections:
            self._connections[club_id] = []

        conn_entry = {
            "ws": websocket,
            "user_id": user.id,
            "user_name": user.full_name,
            "user_email": user.email,
            "role": role,
            "connected_at": datetime.utcnow().isoformat(),
        }
        self._connections[club_id].append(conn_entry)

        # Notify club members that a user joined
        await self.broadcast_to_club(
            club_id=club_id,
            event_data={
                "type": "USER_JOINED",
                "user": {
                    "user_id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": role,
                },
                "total_online": len(self.get_online_users(club_id)),
                "timestamp": datetime.utcnow().isoformat(),
            },
            exclude_ws=websocket,
        )

    async def disconnect(self, club_id: str, websocket: WebSocket):
        if club_id not in self._connections:
            return

        removed_user = None
        remaining = []
        for c in self._connections[club_id]:
            if c["ws"] == websocket:
                removed_user = c
            else:
                remaining.append(c)

        self._connections[club_id] = remaining

        # If user has no more open sockets in this club, broadcast USER_LEFT
        if removed_user:
            user_still_has_socket = any(c["user_id"] == removed_user["user_id"] for c in remaining)
            if not user_still_has_socket:
                await self.broadcast_to_club(
                    club_id=club_id,
                    event_data={
                        "type": "USER_LEFT",
                        "user_id": removed_user["user_id"],
                        "full_name": removed_user["user_name"],
                        "total_online": len(self.get_online_users(club_id)),
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )

    async def broadcast_to_club(
        self, club_id: str, event_data: Dict[str, Any], exclude_ws: Optional[WebSocket] = None
    ):
        if club_id not in self._connections:
            return

        dead_connections = []
        for conn in self._connections[club_id]:
            ws: WebSocket = conn["ws"]
            if ws == exclude_ws:
                continue
            try:
                await ws.send_json(event_data)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}")
                dead_connections.append(conn)

        if dead_connections:
            self._connections[club_id] = [
                c for c in self._connections[club_id] if c not in dead_connections
            ]

    def get_online_users(self, club_id: str) -> List[OnlineUserSummary]:
        if club_id not in self._connections:
            return []

        # Group by user_id to deduplicate multiple browser tabs
        seen = {}
        for c in self._connections[club_id]:
            uid = c["user_id"]
            if uid not in seen:
                seen[uid] = OnlineUserSummary(
                    user_id=uid,
                    full_name=c["user_name"],
                    email=c["user_email"],
                    role=c["role"],
                    connected_at=c["connected_at"],
                )
        return list(seen.values())


# Singleton connection manager instance
manager = ConnectionManager()


class CollaborationService:
    @staticmethod
    def get_club_channels(club_id: str, db: Session) -> List[ChannelSummary]:
        channels = [
            ChannelSummary(
                id="general",
                name="general",
                label="# General Chatter",
                description="Club-wide operational updates, chatter, and open coordination.",
                is_event=False,
                icon="MessageSquare",
            ),
            ChannelSummary(
                id="organizers",
                name="organizers",
                label="# Organizers & Leads",
                description="Planning sync for event heads, media leads, and executive committee.",
                is_event=False,
                icon="ShieldCheck",
            ),
            ChannelSummary(
                id="volunteers",
                name="volunteers",
                label="# Volunteer Pool",
                description="Roster questions, shift handovers, check-in updates, and duty support.",
                is_event=False,
                icon="HeartHandshake",
            ),
            ChannelSummary(
                id="emergencies",
                name="emergencies",
                label="# Urgent & Emergencies",
                description="Critical roadblocks, emergency announcements, and urgent interventions.",
                is_event=False,
                icon="AlertTriangle",
            ),
        ]

        # Add active events as dynamic event collaboration channels
        active_events = (
            db.query(Event)
            .filter(
                Event.club_id == club_id,
                Event.status.in_([
                    EventStatus.PLANNING,
                    EventStatus.ON_TRACK,
                    EventStatus.PLANNED,
                    EventStatus.ONGOING,
                    EventStatus.AT_RISK,
                    EventStatus.DRAFT,
                ]),
            )
            .order_by(Event.start_date.asc())
            .limit(10)
            .all()
        )

        for event in active_events:
            channel_id = f"event-{event.id}"
            channels.append(
                ChannelSummary(
                    id=channel_id,
                    name=channel_id,
                    label=f"# {event.title}",
                    description=f"Live operations room for {event.title} ({event.location or 'Campus'}).",
                    is_event=True,
                    event_id=event.id,
                    icon="Calendar",
                )
            )

        return channels

    @staticmethod
    def get_messages(
        club_id: str, channel: str, db: Session, limit: int = 50, before: Optional[datetime] = None
    ) -> List[ChatMessageResponse]:
        query = db.query(ChatMessage).filter(
            ChatMessage.club_id == club_id,
            ChatMessage.channel == channel,
        )

        if before:
            query = query.filter(ChatMessage.created_at < before)

        messages = query.order_by(ChatMessage.created_at.desc()).limit(limit).all()
        # Return in chronological order
        messages.reverse()

        result = []
        for m in messages:
            sender = m.sender
            # Determine sender's role in this club
            membership = (
                db.query(ClubMembership)
                .filter(
                    ClubMembership.club_id == club_id,
                    ClubMembership.user_id == sender.id,
                    ClubMembership.status == MembershipStatus.ACTIVE,
                )
                .first()
            )
            role_str = membership.role.value if membership else "MEMBER"

            sender_schema = ChatMessageSender(
                id=sender.id,
                full_name=sender.full_name,
                email=sender.email,
                role=role_str,
            )

            result.append(
                ChatMessageResponse(
                    id=m.id,
                    club_id=m.club_id,
                    channel=m.channel,
                    content=m.content,
                    message_type=m.message_type,
                    event_id=m.event_id,
                    metadata=m.metadata_dict,
                    created_at=m.created_at,
                    sender=sender_schema,
                )
            )

        return result

    @staticmethod
    async def create_message(
        club_id: str,
        sender_id: str,
        message_in: ChatMessageCreate,
        db: Session,
        active_role: Optional[str] = None,
    ) -> ChatMessageResponse:
        sender = db.query(User).filter(User.id == sender_id).first()
        if not sender:
            raise ValueError("Sender user not found.")

        # Determine role if not passed
        if not active_role:
            membership = (
                db.query(ClubMembership)
                .filter(
                    ClubMembership.club_id == club_id,
                    ClubMembership.user_id == sender_id,
                    ClubMembership.status == MembershipStatus.ACTIVE,
                )
                .first()
            )
            active_role = membership.role.value if membership else "MEMBER"

        metadata_str = json.dumps(message_in.metadata) if message_in.metadata else None

        msg = ChatMessage(
            club_id=club_id,
            event_id=message_in.event_id,
            sender_id=sender_id,
            channel=message_in.channel,
            content=message_in.content,
            message_type=message_in.message_type,
            metadata_json=metadata_str,
            created_at=datetime.utcnow(),
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        sender_schema = ChatMessageSender(
            id=sender.id,
            full_name=sender.full_name,
            email=sender.email,
            role=active_role,
        )

        response = ChatMessageResponse(
            id=msg.id,
            club_id=msg.club_id,
            channel=msg.channel,
            content=msg.content,
            message_type=msg.message_type,
            event_id=msg.event_id,
            metadata=msg.metadata_dict,
            created_at=msg.created_at,
            sender=sender_schema,
        )

        # Broadcast real-time message via WebSocket to all club members
        await manager.broadcast_to_club(
            club_id=club_id,
            event_data={
                "type": "NEW_MESSAGE",
                "channel": msg.channel,
                "message": response.model_dump(mode="json"),
                "timestamp": msg.created_at.isoformat(),
            },
        )

        return response

    @staticmethod
    async def broadcast_system_activity(
        club_id: str,
        event_in: SystemEventBroadcast,
        actor_id: str,
        db: Session,
    ) -> ChatMessageResponse:
        content = f"⚡ [{event_in.event_type}] {event_in.title}: {event_in.description}"
        msg_in = ChatMessageCreate(
            channel=event_in.channel or "general",
            content=content,
            message_type=ChatMessageType.SYSTEM_EVENT,
            metadata=event_in.metadata or {"event_type": event_in.event_type},
        )
        return await CollaborationService.create_message(
            club_id=club_id,
            sender_id=actor_id,
            message_in=msg_in,
            db=db,
            active_role="SYSTEM",
        )

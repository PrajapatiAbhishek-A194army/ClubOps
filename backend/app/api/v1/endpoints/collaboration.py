import logging
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole, MembershipStatus
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.collaboration import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChannelSummary,
    PresenceRosterResponse,
    SystemEventBroadcast,
)
from app.services.collaboration_service import CollaborationService, manager
from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter()

ALL_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    ClubRole.VOLUNTEER,
    ClubRole.MEMBER,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
    getattr(ClubRole, "TEAM_LEAD", ClubRole.VOLUNTEER),
]


# ==========================================
# WebSocket Endpoint
# ==========================================
@router.websocket("/clubs/{club_id}/ws")
async def websocket_collaboration_endpoint(
    websocket: WebSocket,
    club_id: str,
    token: Optional[str] = Query(None),
):
    """
    Real-time collaboration WebSocket connection.
    Authenticates via JWT query parameter token.
    Broadcasts chat messages, typing events, and operations telemetry.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload.get("sub")

    # Verify user and club membership using a local DB session
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        club = db.query(Club).filter(Club.id == club_id).first()
        if not user or not club:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        membership = (
            db.query(ClubMembership)
            .filter(
                ClubMembership.club_id == club_id,
                ClubMembership.user_id == user_id,
                ClubMembership.status == MembershipStatus.ACTIVE,
            )
            .first()
        )
        if not membership:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        role = membership.role.value if membership.role else "MEMBER"

        # Register connection
        await manager.connect(club_id, websocket, user, role)

        # Message loop
        try:
            while True:
                data = await websocket.receive_json()
                event_type = data.get("type", "CHAT_MESSAGE")

                if event_type == "CHAT_MESSAGE":
                    content = data.get("content", "").strip()
                    if content:
                        msg_in = ChatMessageCreate(
                            channel=data.get("channel", "general"),
                            content=content,
                            message_type=data.get("message_type", "CHAT"),
                            event_id=data.get("event_id"),
                            metadata=data.get("metadata"),
                        )
                        await CollaborationService.create_message(
                            club_id=club_id,
                            sender_id=user.id,
                            message_in=msg_in,
                            db=db,
                            active_role=role,
                        )

                elif event_type == "TYPING":
                    await manager.broadcast_to_club(
                        club_id=club_id,
                        event_data={
                            "type": "TYPING",
                            "channel": data.get("channel", "general"),
                            "user_id": user.id,
                            "user_name": user.full_name,
                        },
                        exclude_ws=websocket,
                    )

                elif event_type == "PING":
                    await websocket.send_json({"type": "PONG"})

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.warning(f"WebSocket client error: {e}")
        finally:
            await manager.disconnect(club_id, websocket)

    finally:
        db.close()


# ==========================================
# REST Endpoints (Query & Fallback)
# ==========================================
@router.get("/clubs/{club_id}/collaboration/channels", response_model=ApiResponse[List[ChannelSummary]])
def get_club_channels(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns list of standard and dynamic event channels for this club.
    """
    channels = CollaborationService.get_club_channels(club_id, db)
    return ApiResponse(data=channels)


@router.get("/clubs/{club_id}/collaboration/messages", response_model=ApiResponse[List[ChatMessageResponse]])
def get_channel_messages(
    club_id: str,
    channel: str = Query("general", description="Channel identifier"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Fetch chronological chat message history for a given channel.
    """
    messages = CollaborationService.get_messages(
        club_id=club_id,
        channel=channel,
        db=db,
        limit=limit,
    )
    return ApiResponse(data=messages)


@router.post("/clubs/{club_id}/collaboration/messages", response_model=ApiResponse[ChatMessageResponse])
async def send_channel_message(
    club_id: str,
    message_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Create and broadcast a chat message in the channel.
    Allows REST sending (fallback when WebSocket is reconnecting).
    """
    role = membership.role.value if membership and membership.role else "MEMBER"
    msg_response = await CollaborationService.create_message(
        club_id=club_id,
        sender_id=current_user.id,
        message_in=message_in,
        db=db,
        active_role=role,
    )
    return ApiResponse(data=msg_response)


@router.get("/clubs/{club_id}/collaboration/presence", response_model=ApiResponse[PresenceRosterResponse])
def get_online_presence(
    club_id: str,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns current online member roster in the active club.
    """
    online_users = manager.get_online_users(club_id)
    return ApiResponse(
        data=PresenceRosterResponse(
            club_id=club_id,
            total_online=len(online_users),
            online_users=online_users,
        )
    )


@router.post("/clubs/{club_id}/collaboration/broadcast-activity", response_model=ApiResponse[ChatMessageResponse])
async def broadcast_system_activity(
    club_id: str,
    event_in: SystemEventBroadcast,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(ALL_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Broadcasts real-time club operations activity (task updates, risk alerts, check-ins).
    """
    msg_response = await CollaborationService.broadcast_system_activity(
        club_id=club_id,
        event_in=event_in,
        actor_id=current_user.id,
        db=db,
    )
    return ApiResponse(data=msg_response)

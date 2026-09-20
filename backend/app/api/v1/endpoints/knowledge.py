from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_club_role
from app.models.club import ClubRole
from app.models.document import Document
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services.knowledge_service import KnowledgeService

router = APIRouter()

LEADERSHIP_ROLES = [
    ClubRole.PRESIDENT,
    ClubRole.CLUB_HEAD,
    getattr(ClubRole, "ORGANIZER", ClubRole.CLUB_HEAD),
]


class DocumentUploadRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    file_path: str
    file_type: str = "text/plain"
    text_content: str = Field(..., min_length=10)
    event_id: Optional[str] = None


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=300)
    club_id: Optional[str] = None


@router.post("/upload", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
def upload_document(
    club_id: str = Query(..., description="Target club ID"),
    doc_in: DocumentUploadRequest = ...,
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Uploads institutional memory document and creates searchable chunks. Restricted to Club Head and President."""
    doc = KnowledgeService.ingest_document(
        db=db,
        club_id=club_id,
        name=doc_in.name,
        file_path=doc_in.file_path,
        file_type=doc_in.file_type,
        text_content=doc_in.text_content,
        user_id=current_user.id,
        event_id=doc_in.event_id,
    )
    return ApiResponse(
        success=True,
        data={"document_id": doc.id, "name": doc.name, "chunk_count": len(doc.chunks)},
        message="Document ingested into institutional knowledge base",
    )


@router.post("/search", response_model=ApiResponse[dict])
def search_knowledge(
    club_id: Optional[str] = Query(None, description="Target club ID"),
    search_req: KnowledgeSearchRequest = ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Executes natural language semantic query against club documents with citations. Restricted to Club Head and President."""
    target_club_id = club_id or search_req.club_id
    if not target_club_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="club_id must be provided in query or body")

    # Enforce leadership role on search
    require_club_role(LEADERSHIP_ROLES)(club_id=target_club_id, user=current_user, db=db)

    result = KnowledgeService.search_knowledge(
        db=db,
        club_id=target_club_id,
        query=search_req.query,
    )
    return ApiResponse(
        success=True,
        data=result,
        message="Knowledge search completed",
    )


@router.get("/documents", response_model=ApiResponse[List[dict]])
def list_documents(
    club_id: str = Query(..., description="Target club ID"),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_club_role(LEADERSHIP_ROLES)),
    db: Session = Depends(get_db),
):
    """Lists indexed documents in the club knowledge repository. Restricted to Club Head and President."""
    docs = db.query(Document).filter(Document.club_id == club_id).order_by(Document.created_at.desc()).all()
    results = [
        {
            "id": d.id,
            "name": d.name,
            "file_type": d.file_type,
            "created_at": d.created_at,
            "chunk_count": len(d.chunks),
        }
        for d in docs
    ]
    return ApiResponse(
        success=True,
        data=results,
        message="Documents retrieved",
    )


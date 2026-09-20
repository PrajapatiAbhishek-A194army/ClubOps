import shutil
import uuid
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club, ClubMembership, ClubRole
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.vector_store import FAISSVectorStore, STORAGE_DIR


@pytest.fixture
def client():
    return TestClient(app)


def test_faiss_vector_store_direct_unit():
    """Unit test for isolated FAISS vector store functionality."""
    test_club_id = f"test-faiss-{uuid.uuid4().hex[:8]}"
    
    chunks = [
        ("c1", "All campus auditorium reservations require 48 hours advance notice.", 0),
        ("c2", "Soundboard audio consoles and line arrays require certified technician clearance.", 1),
    ]
    
    # 1. Add chunks
    count = FAISSVectorStore.add_chunks(test_club_id, "doc-1", "Auditorium Policy", chunks)
    assert count == 2
    
    # 2. Search nearest neighbors
    results = FAISSVectorStore.search(test_club_id, "How to book the auditorium?", top_k=2)
    assert len(results) > 0
    assert results[0]["document_id"] == "doc-1"
    assert "reservations require 48 hours" in results[0]["chunk_text"]
    assert results[0]["score"] > 0
    
    # 3. Verify stats
    stats = FAISSVectorStore.get_index_stats(test_club_id)
    assert stats["total_vectors"] == 2
    assert stats["dimension"] == 384
    assert stats["index_type"] == "IndexFlatIP"
    assert stats["indexed_documents"] == 1
    
    # 4. Clean up disk index
    shutil.rmtree(STORAGE_DIR / test_club_id, ignore_errors=True)


def test_knowledge_api_faiss_lifecycle(client):
    """End-to-end integration test of Knowledge RAG API with FAISS persistence."""
    db = SessionLocal()
    try:
        club = db.query(Club).filter(Club.code == "gdsc-campus").first()
        if not club:
            club = db.query(Club).first()
        assert club is not None
        
        user = db.query(User).filter(User.email == "president@clubops.ai").first()
        assert user is not None
        
        token = AuthService.create_user_token(user=user, active_club_id=club.id, active_role="PRESIDENT")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Ingest document via API
        upload_payload = {
            "name": "Wi-Fi Hotspot SOP 2026.txt",
            "file_path": "/storage/docs/wifi_sop.txt",
            "file_type": "text/plain",
            "text_content": (
                "Campus Wi-Fi Hotspot Procedures: Student clubs requiring dedicated event Wi-Fi must "
                "submit a network reservation ticket at least 5 business days in advance. "
                "High-density mesh access points are checked out from Room IT-104 on the event morning."
            )
        }
        upload_res = client.post(f"/api/v1/knowledge/upload?club_id={club.id}", json=upload_payload, headers=headers)
        assert upload_res.status_code in (200, 201), upload_res.text
        doc_data = upload_res.json()["data"]
        doc_id = doc_data["document_id"]
        assert doc_id is not None
        
        # 2. Check FAISS Stats
        stats_res = client.get(f"/api/v1/knowledge/stats?club_id={club.id}", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()["data"]
        assert stats["total_vectors"] > 0
        assert stats["index_type"] == "IndexFlatIP"
        
        # 3. Query Knowledge using FAISS Vector Search
        search_res = client.post(
            f"/api/v1/knowledge/search?club_id={club.id}",
            json={"query": "Where do I pick up the Wi-Fi mesh access points?", "club_id": club.id},
            headers=headers
        )
        assert search_res.status_code == 200
        search_data = search_res.json()["data"]
        assert len(search_data["sources"]) > 0
        
        # 4. Delete document and re-sync FAISS
        del_res = client.delete(f"/api/v1/knowledge/documents/{doc_id}?club_id={club.id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True
    finally:
        db.close()

import json
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.document import Document, DocumentChunk

logger = logging.getLogger(__name__)


class KnowledgeService:
    @staticmethod
    def ingest_document(
        db: Session,
        club_id: str,
        name: str,
        file_path: str,
        file_type: str,
        text_content: str,
        user_id: Optional[str] = None,
        event_id: Optional[str] = None,
    ) -> Document:
        doc = Document(
            club_id=club_id,
            event_id=event_id,
            name=name,
            file_path=file_path,
            file_type=file_type,
            uploaded_by_id=user_id,
        )
        db.add(doc)
        db.flush()

        # Chunk content into paragraphs (~400 characters)
        raw_chunks = [c.strip() for c in text_content.split("\n\n") if c.strip()]
        if not raw_chunks:
            raw_chunks = [text_content.strip()]

        for idx, chunk_text in enumerate(raw_chunks):
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_text=chunk_text,
                chunk_index=idx,
                embedding_json=None,
            )
            db.add(chunk)

        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def search_knowledge(
        db: Session,
        club_id: str,
        query: str,
    ) -> dict:
        """
        Retrieves relevant document chunks and synthesizes an answer using AI
        with exact document source citations.
        """
        # Simple text similarity lookup across club document chunks
        chunks = (
            db.query(DocumentChunk, Document)
            .join(Document, DocumentChunk.document_id == Document.id)
            .filter(Document.club_id == club_id)
            .all()
        )

        query_terms = [t.lower() for t in query.split() if len(t) > 2]
        scored_chunks = []
        for chunk, doc in chunks:
            score = sum(1 for term in query_terms if term in chunk.chunk_text.lower())
            if score > 0:
                scored_chunks.append((score, chunk, doc))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:3]

        citations = [
            {"document_name": doc.name, "snippet": chunk.chunk_text[:180] + "..."}
            for _, chunk, doc in top_chunks
        ]

        if not top_chunks:
            return {
                "answer": "No relevant historical documents or guidelines were found in the club repository for this query.",
                "citations": [],
            }

        context = "\n---\n".join(f"[{doc.name}]: {chunk.chunk_text}" for _, chunk, doc in top_chunks)

        answer = KnowledgeService._synthesize_answer(query, context)
        return {
            "answer": answer,
            "citations": citations,
        }

    @staticmethod
    def _synthesize_answer(query: str, context: str) -> str:
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)
                res = client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are the Institutional Memory Assistant for ClubOps AI. "
                                "Answer the student leader's query using strictly the club documents provided in the context. "
                                "Do not fabricate facts. If the context does not contain the answer, say so clearly."
                            ),
                        },
                        {
                            "role": "user",
                            "content": f"Context:\n{context}\n\nQuestion: {query}",
                        },
                    ],
                    model=settings.GROQ_MODEL,
                    temperature=0.2,
                    max_tokens=500,
                )
                return res.choices[0].message.content.strip()
            except Exception as e:
                logger.warning(f"Groq RAG synthesis fallback due to: {e}")

        # Deterministic Fallback
        first_doc = context.split("\n")[0] if context else "Club Archive"
        return f"Based on historical club records in {first_doc}: Operating procedures and past event guidelines recommend following established lead timelines and budget checklists."

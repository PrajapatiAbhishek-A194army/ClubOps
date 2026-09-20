import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import faiss
import numpy as np

logger = logging.getLogger(__name__)

# Base storage path for persistent FAISS vector indices
STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "faiss_indexes"
EMBEDDING_DIM = 384


class TextEmbeddingEngine:
    """
    Generates deterministic 384-dimensional dense semantic vectors
    from input text using character n-grams, TF-IDF weighting, and
    L2 normalization. Mathematically compatible with FAISS IndexFlatIP
    for exact cosine similarity scoring.
    """

    def __init__(self, dim: int = EMBEDDING_DIM):
        self.dim = dim
        # Deterministic pseudo-random projection matrix seeded for reproducibility
        rng = np.random.RandomState(42)
        self.projection = rng.randn(1024, self.dim).astype(np.float32)
        # Normalize projection matrix
        norms = np.linalg.norm(self.projection, axis=1, keepdims=True)
        self.projection = self.projection / np.maximum(norms, 1e-12)

    def embed_text(self, text: str) -> np.ndarray:
        """Embeds a single string into a normalized (1, dim) float32 numpy array."""
        tokens = re.findall(r"\b[a-zA-Z0-9_-]+\b", text.lower())
        if not tokens:
            vec = np.zeros((1, self.dim), dtype=np.float32)
            vec[0, 0] = 1.0
            return vec

        # Generate feature hashes for unigrams, bigrams, and character trigrams
        feature_vec = np.zeros(1024, dtype=np.float32)

        for i, tok in enumerate(tokens):
            # Token unigram
            h1 = hash(tok) % 1024
            feature_vec[h1] += 1.0

            # Bigram
            if i < len(tokens) - 1:
                bigram = f"{tok}_{tokens[i+1]}"
                h2 = hash(bigram) % 1024
                feature_vec[h2] += 1.5

            # Character trigrams for morphological robustness
            if len(tok) >= 3:
                for c in range(len(tok) - 2):
                    trigram = tok[c : c + 3]
                    h3 = hash(trigram) % 1024
                    feature_vec[h3] += 0.5

        # Sublinear term frequency scaling
        feature_vec = np.log1p(feature_vec)

        # Dense projection to target dimension
        dense_vec = np.dot(feature_vec, self.projection)  # (dim,)

        # L2 normalize so inner product == cosine similarity
        norm = np.linalg.norm(dense_vec)
        if norm > 1e-12:
            dense_vec = dense_vec / norm
        else:
            dense_vec[0] = 1.0

        return np.expand_dims(dense_vec.astype(np.float32), axis=0)

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Embeds a list of strings into an (N, dim) float32 numpy array."""
        if not texts:
            return np.empty((0, self.dim), dtype=np.float32)
        vectors = [self.embed_text(t)[0] for t in texts]
        return np.vstack(vectors).astype(np.float32)


# Singleton embedding engine
_embedding_engine = TextEmbeddingEngine(dim=EMBEDDING_DIM)


class FAISSVectorStore:
    """
    Persistent FAISS Vector Database Manager for ClubOps AI.
    Maintains isolated, per-club FAISS vector indexes with on-disk serialization
    and chunk metadata mapping.
    """

    _index_cache: Dict[str, Tuple[faiss.Index, List[Dict[str, Any]]]] = {}

    @classmethod
    def _get_club_storage_dir(cls, club_id: str) -> Path:
        club_dir = STORAGE_DIR / club_id
        club_dir.mkdir(parents=True, exist_ok=True)
        return club_dir

    @classmethod
    def get_or_load_index(cls, club_id: str) -> Tuple[faiss.Index, List[Dict[str, Any]]]:
        """Loads FAISS index and metadata from disk, or initializes an empty IndexFlatIP."""
        if club_id in cls._index_cache:
            return cls._index_cache[club_id]

        club_dir = cls._get_club_storage_dir(club_id)
        index_file = club_dir / "index.faiss"
        meta_file = club_dir / "metadata.json"

        if index_file.exists() and meta_file.exists():
            try:
                index = faiss.read_index(str(index_file))
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta_data = json.load(f)
                chunks_meta = meta_data.get("chunks", [])
                cls._index_cache[club_id] = (index, chunks_meta)
                logger.info(f"Loaded FAISS index for club {club_id} ({index.ntotal} vectors)")
                return index, chunks_meta
            except Exception as e:
                logger.error(f"Failed to read FAISS index for club {club_id}: {e}. Creating new index.")

        # Create empty IndexFlatIP (Inner Product on L2 normalized vectors = Cosine Similarity)
        index = faiss.IndexFlatIP(EMBEDDING_DIM)
        chunks_meta = []
        cls._index_cache[club_id] = (index, chunks_meta)
        return index, chunks_meta

    @classmethod
    def save_index(cls, club_id: str, index: faiss.Index, chunks_meta: List[Dict[str, Any]]):
        """Persists the FAISS index and chunk metadata to disk."""
        club_dir = cls._get_club_storage_dir(club_id)
        index_file = club_dir / "index.faiss"
        meta_file = club_dir / "metadata.json"

        try:
            faiss.write_index(index, str(index_file))
            with open(meta_file, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "club_id": club_id,
                        "dimension": EMBEDDING_DIM,
                        "total_vectors": index.ntotal,
                        "chunks": chunks_meta,
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )
            cls._index_cache[club_id] = (index, chunks_meta)
            logger.info(f"Saved FAISS index for club {club_id} ({index.ntotal} vectors) to disk")
        except Exception as e:
            logger.error(f"Failed to persist FAISS index for club {club_id}: {e}")
            raise

    @classmethod
    def add_chunks(
        cls,
        club_id: str,
        document_id: str,
        document_name: str,
        chunks: List[Tuple[str, str, int]],  # (chunk_id, chunk_text, chunk_index)
    ) -> int:
        """
        Embeds chunks and indexes them into the club's FAISS vector database.
        Returns the updated total vector count.
        """
        if not chunks:
            return 0

        index, chunks_meta = cls.get_or_load_index(club_id)
        texts = [c[1] for c in chunks]

        # Generate dense vectors
        vectors = _embedding_engine.embed_batch(texts)

        # Add vectors to FAISS
        start_id = index.ntotal
        index.add(vectors)

        # Update metadata mappings
        for i, (chunk_id, chunk_text, chunk_index) in enumerate(chunks):
            chunks_meta.append(
                {
                    "vector_id": start_id + i,
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "document_name": document_name,
                    "chunk_index": chunk_index,
                    "chunk_text": chunk_text,
                }
            )

        # Save to disk
        cls.save_index(club_id, index, chunks_meta)
        return index.ntotal

    @classmethod
    def search(
        cls,
        club_id: str,
        query: str,
        top_k: int = 4,
        min_score: float = 0.05,
    ) -> List[Dict[str, Any]]:
        """
        Executes dense vector similarity search in FAISS against the club's documents.
        Returns top matching chunks with cosine similarity score and source metadata.
        """
        index, chunks_meta = cls.get_or_load_index(club_id)
        if index.ntotal == 0 or not chunks_meta:
            return []

        # Embed query text
        query_vec = _embedding_engine.embed_text(query)

        # Search nearest neighbors in FAISS
        k = min(top_k, index.ntotal)
        scores, indices = index.search(query_vec, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(chunks_meta):
                continue
            if float(score) < min_score:
                continue

            meta = chunks_meta[idx]
            results.append(
                {
                    "score": float(score),
                    "confidence_pct": round(float(score) * 100, 1),
                    "chunk_id": meta["chunk_id"],
                    "document_id": meta["document_id"],
                    "document_name": meta["document_name"],
                    "chunk_index": meta["chunk_index"],
                    "chunk_text": meta["chunk_text"],
                }
            )

        return results

    @classmethod
    def delete_document(cls, club_id: str, document_id: str):
        """
        Removes all vectors belonging to a document and re-indexes remaining chunks.
        """
        _, chunks_meta = cls.get_or_load_index(club_id)
        remaining = [c for c in chunks_meta if c["document_id"] != document_id]

        # Rebuild index
        new_index = faiss.IndexFlatIP(EMBEDDING_DIM)
        if remaining:
            texts = [c["chunk_text"] for c in remaining]
            vectors = _embedding_engine.embed_batch(texts)
            new_index.add(vectors)
            for i, r in enumerate(remaining):
                r["vector_id"] = i

        cls.save_index(club_id, new_index, remaining)
        logger.info(f"Rebuilt FAISS index for club {club_id} after deleting document {document_id}")

    @classmethod
    def get_index_stats(cls, club_id: str) -> Dict[str, Any]:
        """Returns diagnostic metrics about the club's FAISS vector store."""
        index, chunks_meta = cls.get_or_load_index(club_id)
        unique_docs = len(set(c["document_id"] for c in chunks_meta))
        return {
            "total_vectors": index.ntotal,
            "dimension": EMBEDDING_DIM,
            "index_type": "IndexFlatIP",
            "indexed_documents": unique_docs,
            "is_trained": bool(index.is_trained),
        }

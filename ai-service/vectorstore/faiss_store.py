import os
import json
import faiss
import numpy as np
from typing import List, Dict, Any, Tuple
from config import settings

class FAISSStore:
    def __init__(self, repo_id: str):
        self.repo_id = repo_id
        self.storage_dir = os.path.join(settings.VECTOR_DB_DIR, repo_id)
        self.index_path = os.path.join(self.storage_dir, "index.faiss")
        self.metadata_path = os.path.join(self.storage_dir, "chunks.json")
        self.dimension = None
        self.index = None
        self.chunks: List[Dict[str, Any]] = []

    def build_and_save(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        """Creates FAISS index, normalizes embeddings, and saves to file storage."""
        os.makedirs(self.storage_dir, exist_ok=True)
        
        vectors = np.array(embeddings, dtype=np.float32)
        if vectors.ndim != 2 or vectors.shape[0] == 0:
            raise ValueError("Embeddings must be a non-empty 2D list of vectors.")

        self.dimension = vectors.shape[1]
        if any(len(vec) != self.dimension for vec in embeddings):
            raise ValueError("Embeddings must all have the same dimensionality.")

        faiss.normalize_L2(vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.index.add(vectors)
        
        faiss.write_index(self.index, self.index_path)
        
        self.chunks = chunks
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)

    def load(self) -> bool:
        """Loads index and metadata from storage directory. Returns status."""
        if not os.path.exists(self.index_path) or not os.path.exists(self.metadata_path):
            return False
            
        try:
            self.index = faiss.read_index(self.index_path)
            self.dimension = self.index.d
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)
            return True
        except Exception as e:
            print(f"Failed to load FAISS index for {self.repo_id}: {e}")
            return False

    def search(self, query_vector: List[float], k: int = 5) -> List[Tuple[Dict[str, Any], float]]:
        """Queries the vector index and returns top-K metadata dicts and scores."""
        if self.index is None:
            loaded = self.load()
            if not loaded:
                return []
                
        query_arr = np.array([query_vector], dtype=np.float32)
        if query_arr.ndim != 2 or query_arr.shape[1] != self.index.d:
            raise ValueError(
                f"Query embedding dimension {query_arr.shape[1]} does not match FAISS index dimension {self.index.d}."
            )
        faiss.normalize_L2(query_arr)
        
        scores, indices = self.index.search(query_arr, k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            # -1 is returned if not enough elements are in the index
            if idx == -1 or idx >= len(self.chunks):
                continue
            results.append((self.chunks[idx], float(score)))
            
        return results

    def delete(self):
        """Cleans up index files on disk."""
        if os.path.exists(self.index_path):
            os.remove(self.index_path)
        if os.path.exists(self.metadata_path):
            os.remove(self.metadata_path)
        if os.path.exists(self.storage_dir):
            try:
                os.rmdir(self.storage_dir)
            except OSError:
                pass

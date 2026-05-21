from google import genai
from typing import List
from config import settings

class GeminiEmbedder:
    MODEL = "gemini-embedding-001"
    DIMENSIONS = 3072

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            print("WARNING: GEMINI_API_KEY is not configured. Embeddings will fail.")
            self.client = None
        else:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def embed_query(self, query: str) -> List[float]:
        response = self.client.models.embed_content(model=self.MODEL, contents=query)
        return list(response.embeddings[0].values)

    def embed_chunks(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response = self.client.models.embed_content(model=self.MODEL, contents=batch)
                embeddings.extend([list(e.values) for e in response.embeddings])
            except Exception as e:
                print(f"Batch embedding failed at {i}: {e}")
                for txt in batch:
                    try:
                        r = self.client.models.embed_content(model=self.MODEL, contents=txt)
                        embeddings.append(list(r.embeddings[0].values))
                    except Exception as err:
                        print(f"Individual embedding failed: {err}")
                        embeddings.append([0.0] * self.DIMENSIONS)
        return embeddings

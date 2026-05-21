import os, sys
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from embeddings.gemini_embeddings import GeminiEmbedder

e = GeminiEmbedder()
vec = e.embed_query("test query")
print("Embedding vector length:", len(vec))

import sys, os
# Add repository root to path
ROOT = os.path.abspath(os.path.join(__file__, '..', '..'))
sys.path.append(ROOT)
# Import embedder
from ai_service.embeddings.gemini_embeddings import GeminiEmbedder

embedder = GeminiEmbedder()
print('Embedding for "Hello world":')
print(embedder.embed_query('Hello world'))

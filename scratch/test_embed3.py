import os
import sys
from pathlib import Path

# Add the ai-service directory to sys.path
BASE_DIR = Path(__file__).resolve().parents[1] / "ai-service"
sys.path.append(str(BASE_DIR))

from embeddings.gemini_embeddings import GeminiEmbedder

def main():
    embedder = GeminiEmbedder()
    vec = embedder.embed_query("Hello world")
    print("Embedding length:", len(vec))
    print("First 5 values:", vec[:5])

if __name__ == "__main__":
    main()

import os
import sys

# Add the ai-service directory to the Python path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(BASE_DIR)

# Now import the GeminiEmbedder
from ai_service.embeddings.gemini_embeddings import GeminiEmbedder

def main():
    embedder = GeminiEmbedder()
    vec = embedder.embed_query('Hello world')
    print('Embedding length:', len(vec))
    print('First 5 values:', vec[:5])

if __name__ == '__main__':
    main()

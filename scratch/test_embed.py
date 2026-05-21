import os
import google.generativeai as genai
from ai_service.embeddings.gemini_embeddings import GeminiEmbedder

def main():
    embedder = GeminiEmbedder()
    vec = embedder.embed_query('Hello world')
    print('Embedding length:', len(vec))
    print('First 5 values:', vec[:5])

if __name__ == '__main__':
    main()

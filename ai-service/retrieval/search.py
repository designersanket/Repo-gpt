from google import genai
from google.genai import types
from typing import List, Dict, Any
from config import settings
from embeddings.gemini_embeddings import GeminiEmbedder
from vectorstore.faiss_store import FAISSStore
from prompts.templates import SYSTEM_PROMPT, USER_QUERY_TEMPLATE

class CodeRetriever:
    MODEL = "gemini-2.5-flash"

    def __init__(self):
        self.embedder = GeminiEmbedder()
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            self.client = None

    def query(self, repo_id: str, question: str, k: int = 6) -> Dict[str, Any]:
        if not self.client:
            return {"answer": "System Error: GEMINI_API_KEY is not configured.", "references": []}

        store = FAISSStore(repo_id)
        if not store.load():
            return {"answer": f"Repository '{repo_id}' index not found. Please index the repository first.", "references": []}

        try:
            query_vector = self.embedder.embed_query(question)
        except Exception as e:
            return {"answer": f"Failed to generate query embedding: {str(e)}", "references": []}

        matches = store.search(query_vector, k=k)
        if not matches:
            return {"answer": "No relevant code snippets were found in the index.", "references": []}

        context_parts = []
        references = []
        for idx, (chunk, score) in enumerate(matches):
            context_parts.append(f"--- Code Snippet #{idx+1} (Score: {score:.4f}) ---\n{chunk['chunk_text']}\n")
            references.append({
                "filepath": chunk["filepath"],
                "relative_path": chunk["relative_path"],
                "node_type": chunk["node_type"],
                "name": chunk["name"],
                "start_line": chunk["start_line"],
                "end_line": chunk["end_line"],
                "score": score
            })

        prompt = USER_QUERY_TEMPLATE.format(context="\n".join(context_parts), question=question)

        try:
            response = self.client.models.generate_content(
                model=self.MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.1
                )
            )
            answer = response.text
        except Exception as e:
            answer = f"Error during Gemini LLM generation: {str(e)}"

        return {"answer": answer, "references": references}

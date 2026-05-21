import os
import re
import subprocess
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from config import settings
from ingestion.file_scanner import FileScanner
from chunking.ast_chunker import ASTChunker
from embeddings.gemini_embeddings import GeminiEmbedder
from vectorstore.faiss_store import FAISSStore
from retrieval.search import CodeRetriever

router = APIRouter()
retriever = CodeRetriever()

class IndexRequest(BaseModel):
    repo_id: str
    repo_path: str

class QueryRequest(BaseModel):
    repo_id: str
    query: str
    k: Optional[int] = 6

class DependenciesRequest(BaseModel):
    repo_id: str
    repo_path: str

class SummarizeRequest(BaseModel):
    repo_path: str

@router.post("/index")
async def index_repository(req: IndexRequest):
    repo_path = req.repo_path.replace("\\", "/") if req.repo_path else req.repo_path
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail=f"Repository path does not exist: {repo_path}")
        
    try:
        # 1. Scan files
        files = FileScanner.scan(repo_path)
        if not files:
            return {"status": "success", "message": "No code files found to index", "indexed_files": 0, "total_chunks": 0}

        # 2. Chunk files using AST parser
        all_chunks = []
        for filepath in files:
            success, content = FileScanner.read_file_safe(filepath)
            if success:
                file_chunks = ASTChunker.chunk_file(filepath, repo_path, content)
                all_chunks.extend([chunk.to_dict() for chunk in file_chunks])

        if not all_chunks:
            return {"status": "success", "message": "No valid code chunks generated", "indexed_files": len(files), "total_chunks": 0}

        # 3. Generate embeddings
        embedder = GeminiEmbedder()
        chunk_texts = [c["chunk_text"] for c in all_chunks]
        embeddings = embedder.embed_chunks(chunk_texts)

        # 4. Save to FAISS
        store = FAISSStore(req.repo_id)
        store.build_and_save(all_chunks, embeddings)

        return {
            "status": "success",
            "indexed_files": len(files),
            "total_chunks": len(all_chunks),
            "message": f"Successfully indexed {len(files)} files and generated {len(all_chunks)} semantic chunks."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

@router.post("/query")
async def query_repository(req: QueryRequest):
    try:
        result = retriever.query(req.repo_id, req.query, k=req.k)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {type(e).__name__}: {str(e)}")

@router.post("/dependencies")
async def get_dependencies(req: DependenciesRequest):
    repo_path = req.repo_path.replace("\\", "/") if req.repo_path else req.repo_path
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")

    try:
        files = FileScanner.scan(repo_path)
        
        nodes = []
        edges = []
        file_set = set()
        
        # Use repo_path (normalized) consistently for ALL relpath calls
        for f in files:
            rel = os.path.relpath(f, repo_path).replace("\\", "/")
            file_set.add(rel)
            nodes.append({
                "id": rel,
                "label": os.path.basename(f),
                "type": os.path.splitext(f)[1][1:]
            })

        for f in files:
            rel_source = os.path.relpath(f, repo_path).replace("\\", "/")
            success, content = FileScanner.read_file_safe(f)
            if not success:
                continue

            imports = re.findall(
                r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]|require\(\s*['\"]([^'\"]+)['\"]\s*\)|from\s+([\w.]+)\s+import|import\s+['\"]([^'\"]+)['\"]",
                content
            )
            
            for match in imports:
                target = next((m for m in match if m), "").strip()
                if not target:
                    continue
                
                resolved = None
                if target.startswith("."):
                    source_dir = os.path.dirname(rel_source)
                    target_path = os.path.normpath(os.path.join(source_dir, target)).replace("\\", "/")
                    
                    for ext in [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".cpp", ".h"]:
                        if (target_path + ext) in file_set:
                            resolved = target_path + ext
                            break
                        if target_path.endswith(ext) and target_path in file_set:
                            resolved = target_path
                            break
                    if not resolved:
                        for ext in [".js", ".ts"]:
                            test_index = os.path.normpath(os.path.join(target_path, f"index{ext}")).replace("\\", "/")
                            if test_index in file_set:
                                resolved = test_index
                                break
                else:
                    for ext in [".js", ".ts", ".py", ".go"]:
                        if (target + ext) in file_set:
                            resolved = target + ext
                            break
                            
                if resolved and resolved != rel_source:
                    edges.append({
                        "id": f"{rel_source}->{resolved}",
                        "source": rel_source,
                        "target": resolved,
                        "label": os.path.basename(resolved).rsplit(".", 1)[0]
                    })
                    
        seen = set()
        unique_edges = []
        for edge in edges:
            if edge["id"] not in seen:
                seen.add(edge["id"])
                unique_edges.append(edge)

        return {"nodes": nodes, "edges": unique_edges}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dependency analysis failed: {str(e)}")

@router.post("/summarize-commits")
async def summarize_commits(req: SummarizeRequest):
    repo_path = req.repo_path.replace("\\", "/") if req.repo_path else req.repo_path
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository path does not exist")
        
    try:
        # Call local git log command
        result = subprocess.run(
            ["git", "log", "-n", "15", "--oneline", "--stat"],
            cwd=repo_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        git_log = result.stdout
    except Exception as e:
        # Fallback if git is not initialized
        git_log = "Could not read git commits. The repository may not be initialized with git or has no commits yet."

    if not settings.GEMINI_API_KEY:
        return {"summary": "Gemini key not configured. Git history:\n\n" + git_log}

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"""You are a Git commit analyzer. Review the recent git logs and file stats below and provide a concise summary.
Highlight the primary files modified, the core features or bugfixes implemented, and describe the system-level impact of these changes.

Git Log:
{git_log}
"""
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return {"summary": response.text}
    except Exception as e:
        return {"summary": f"Failed to generate commit summary with Gemini: {str(e)}\n\nRaw log:\n{git_log}"}

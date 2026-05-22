import os
import re
import shutil
import subprocess
import tempfile
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
    git_url: Optional[str] = None

class QueryRequest(BaseModel):
    repo_id: str
    query: str
    k: Optional[int] = 6

class DependenciesRequest(BaseModel):
    repo_id: str
    repo_path: str
    git_url: Optional[str] = None

class SummarizeRequest(BaseModel):
    repo_path: str
    git_url: Optional[str] = None

@router.post("/index")
async def index_repository(req: IndexRequest):
    repo_path = req.repo_path.replace("\\", "/") if req.repo_path else req.repo_path
    tmp_dir = None

    # If path doesn't exist on this filesystem, clone from git_url into a temp dir
    if not os.path.exists(repo_path):
        if not req.git_url or req.git_url == "uploaded_zip":
            raise HTTPException(status_code=404, detail=f"Repository path does not exist and no git_url provided: {repo_path}")
        try:
            tmp_dir = tempfile.mkdtemp(prefix=f"repogpt_{req.repo_id}_")
            subprocess.run(
                ["git", "clone", "--depth", "1", req.git_url, tmp_dir],
                check=True, capture_output=True, text=True
            )
            repo_path = tmp_dir
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Git clone failed: {e.stderr}")

    try:
        files = FileScanner.scan(repo_path)
        if not files:
            return {"status": "success", "message": "No code files found to index", "indexed_files": 0, "total_chunks": 0}

        all_chunks = []
        for filepath in files:
            success, content = FileScanner.read_file_safe(filepath)
            if success:
                file_chunks = ASTChunker.chunk_file(filepath, repo_path, content)
                all_chunks.extend([chunk.to_dict() for chunk in file_chunks])

        if not all_chunks:
            return {"status": "success", "message": "No valid code chunks generated", "indexed_files": len(files), "total_chunks": 0}

        embedder = GeminiEmbedder()
        embeddings = embedder.embed_chunks([c["chunk_text"] for c in all_chunks])

        store = FAISSStore(req.repo_id)
        store.build_and_save(all_chunks, embeddings)

        return {
            "status": "success",
            "indexed_files": len(files),
            "total_chunks": len(all_chunks),
            "message": f"Successfully indexed {len(files)} files into {len(all_chunks)} chunks."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")
    finally:
        # Clean up temp clone dir to save disk space
        if tmp_dir and os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)

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
    tmp_dir = None

    if not os.path.exists(repo_path):
        if not req.git_url or req.git_url == "uploaded_zip":
            raise HTTPException(status_code=404, detail="Repository path does not exist and no git_url provided")
        try:
            tmp_dir = tempfile.mkdtemp(prefix=f"repogpt_{req.repo_id}_")
            subprocess.run(["git", "clone", "--depth", "1", req.git_url, tmp_dir], check=True, capture_output=True)
            repo_path = tmp_dir
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Git clone failed: {e.stderr}")

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
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)

@router.post("/summarize-commits")
async def summarize_commits(req: SummarizeRequest):
    repo_path = req.repo_path.replace("\\", "/") if req.repo_path else req.repo_path
    tmp_dir = None
    git_log = None

    if not os.path.exists(repo_path):
        if req.git_url and req.git_url != "uploaded_zip":
            try:
                tmp_dir = tempfile.mkdtemp(prefix="repogpt_commits_")
                subprocess.run(["git", "clone", "--depth", "15", req.git_url, tmp_dir], check=True, capture_output=True)
                repo_path = tmp_dir
            except Exception:
                git_log = "Could not clone repository to read commits."
        else:
            git_log = "Could not read git commits: repository not available on this server."

    if git_log is None:
        try:
            result = subprocess.run(
                ["git", "log", "-n", "15", "--oneline", "--stat"],
                cwd=repo_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True
            )
            git_log = result.stdout
        except Exception:
            git_log = "Could not read git commits."

    if tmp_dir and os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir, ignore_errors=True)

    if not settings.GEMINI_API_KEY:
        return {"summary": "Gemini key not configured.\n\n" + git_log}

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
        return {"summary": f"Failed to generate commit summary: {str(e)}\n\nRaw log:\n{git_log}"}

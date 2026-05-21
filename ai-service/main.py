from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router
from config import settings

app = FastAPI(
    title="RepoGPT AI Service",
    description="Python FastAPI Service for AST Parsing, FAISS Vector DB, and Gemini LLM Generation",
    version="1.0.0"
)

# Configure CORS for communication with node server and react client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "repogpt-ai-service",
        "environment": settings.ENVIRONMENT,
        "gemini_configured": bool(settings.GEMINI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# CodeMind AI — Interactive Codebase RAG Copilot

CodeMind AI is an interactive developer tool that transforms large, complex codebases into searchable, semantic knowledge graphs. By utilizing language-specific AST parsing (Tree-sitter), vector embeddings (Gemini Embeddings), and LLMs (Gemini 1.5 Flash), CodeMind AI lets you chat with your repositories, inspect source structures, click citations to jump to line numbers in Monaco Editor, and visualize import dependency flows using React Flow.

---

## 🚀 Key Features

*   **Repository Ingestion**: Accept GitHub repository URLs (shallow clones) or uploaded ZIP archives.
*   **AST-Aware Parsing**: Uses Tree-sitter to parse code into logical constructs (classes, methods, functions, and imports) instead of arbitrary characters.
*   **Vector Embeddings Pipeline**: Generates vectors using Gemini's `text-embedding-004` and indexes them in a local FAISS store for exact cosine similarity searches.
*   **Monaco Reference System**: Renders responses in Markdown. Click cited code blocks to load the file in Monaco Editor and scroll directly to the line range.
*   **Dependency Graph Visualizer**: Renders interactive, animated import dependency diagrams using React Flow.
*   **Commit Summarizer**: Retrieves git logs and calls Gemini to generate software impact and code modification reports.
*   **Scalable Architecture**: Express Node.js orchestration backend + Python FastAPI AI microservice + React Vite UI.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS, Monaco Editor (`@monaco-editor/react`), React Flow (`reactflow`), Socket.io Client.
*   **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, Multer, Simple Git.
*   **AI Service**: Python FastAPI, FAISS, Tree-sitter (`tree-sitter-languages`), Google Generative AI SDK, NetworkX.
*   **Database**: MongoDB (User metadata & chats) + FAISS (Vector database indices).
*   **Deployment & Orchestration**: Docker, Docker Compose, GitHub Actions CI.

---

## ⚙️ Quick Start (Docker Compose)

The easiest way to boot CodeMind AI is using Docker Compose. 

### 1. Configure Environment Variables
Create a `.env` file in the root workspace directory (see `.env.example`):
```bash
GEMINI_API_KEY=your_google_ai_studio_api_key
```

### 2. Boot Services
Run the following orchestrator command:
```bash
docker-compose up --build
```
This builds and starts:
*   **Frontend**: `http://localhost:5173`
*   **Backend API**: `http://localhost:5000`
*   **Python AI Service**: `http://localhost:8000`
*   **MongoDB**: `localhost:27017`

---

## 💻 Manual Local Development

If you prefer to run services individually without Docker:

### 1. MongoDB
Ensure MongoDB is running locally on port `27017`.

### 2. Python AI Service (`ai-service`)
Requires Python 3.10 or 3.11:
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
1.python main.py
```
*AI service will boot on `http://localhost:8000`.*

### 3. Node.js Backend (`backend`)
```bash
cd backend
npm install
npm run dev
```
*Backend API will boot on `http://localhost:5000`.*

### 4. React Frontend (`frontend`)
```bash
cd frontend
npm install
npm run dev
```
*Vite dev server will launch on `http://localhost:5173`.*

---

## 🔗 Core API Endpoints

### Express Backend Orchestrator

| Route | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register a developer user |
| `/api/auth/login` | `POST` | Authenticate and issue JWT token |
| `/api/repos/clone` | `POST` | Clone a Git repository URL |
| `/api/repos/upload` | `POST` | Ingest an uploaded ZIP archive |
| `/api/repos` | `GET` | List all repositories |
| `/api/repos/:id` | `GET` | Retrieve repository metadata and file tree |
| `/api/repos/:id/file?path=...` | `GET` | Read file contents (sanitized) |
| `/api/chat/query` | `POST` | Execute a semantic RAG query |
| `/api/chat/dependencies/:id` | `GET` | Get node links for dependency visualizer |
| `/api/chat/commits/:id` | `GET` | Get Gemini summary of git commits |

---

## 🔒 Security Best Practices

1.  **Path Traversal Sanitations**: The `/api/repos/:id/file` endpoint resolves and checks target paths to ensure file queries do not leak contents outside of the repository directory boundary.
2.  **Shallow Cloning**: Repository cloning runs `--depth 1` to skip large historic binary blobs, saving disk storage.
3.  **Low Temperature Generation**: The RAG generation runs at `temperature=0.1` to force the LLM to restrict responses to code segments retrieved from the vector database.

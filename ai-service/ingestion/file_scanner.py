import os
from typing import List, Dict, Any, Tuple
from parsing.ast_parser import LANGUAGE_MAP

IGNORE_DIRS = {
    "node_modules", "dist", "build", "bin", "obj", ".git", "venv", ".venv",
    "__pycache__", "vector-db", "repositories", "out", "target", ".idea", ".vscode"
}

IGNORE_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Pipfile.lock", "poetry.lock"
}

class FileScanner:
    @staticmethod
    def scan(repo_root: str) -> List[str]:
        """Walks the directory and returns a list of valid files to process."""
        valid_files = []
        for root, dirs, files in os.walk(repo_root):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                ext = os.path.splitext(file)[1].lower()
                if ext in LANGUAGE_MAP:
                    full_path = os.path.join(root, file)
                    valid_files.append(full_path)
                    
        return valid_files

    @staticmethod
    def read_file_safe(filepath: str) -> Tuple[bool, str]:
        """Safely reads content of a file, returning success flag and content/error."""
        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return True, content
        except Exception as e:
            return False, f"Failed to read file: {e}"

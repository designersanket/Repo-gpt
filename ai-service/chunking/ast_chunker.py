import os
from typing import List, Dict, Any
from parsing.ast_parser import CodeASTParser, ASTNodeInfo

class ASTChunk:
    def __init__(self, filepath: str, relative_path: str, node: ASTNodeInfo):
        self.filepath = filepath
        self.relative_path = relative_path
        self.node_type = node.node_type
        self.name = node.name
        self.start_line = node.start_line
        self.end_line = node.end_line
        self.code = node.code
        self.metadata = node.metadata
        self.language = node.metadata.get("language", "plaintext")

    def get_chunk_text(self) -> str:
        """Constructs a context-rich string representing the code chunk."""
        header_lines = [
            f"File: {self.relative_path}",
            f"Type: {self.node_type}",
            f"Name: {self.name}"
        ]
        
        parent_class = self.metadata.get("parent_class")
        if parent_class:
            header_lines.append(f"Class Context: {parent_class}")
            
        header_lines.append(f"Lines: {self.start_line}-{self.end_line}")
        header_lines.append("Code:")
        header_lines.append(self.code)
        
        return "\n".join(header_lines)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "filepath": self.filepath,
            "relative_path": self.relative_path,
            "node_type": self.node_type,
            "name": self.name,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "code": self.code,
            "language": self.language,
            "metadata": self.metadata,
            "chunk_text": self.get_chunk_text()
        }

class ASTChunker:
    @staticmethod
    def chunk_file(filepath: str, repo_root: str, content: str) -> List[ASTChunk]:
        relative_path = os.path.relpath(filepath, repo_root).replace("\\", "/")
        
        parser = CodeASTParser(filepath, content)
        nodes = parser.parse()
        
        chunks = []
        for node in nodes:
            # Clean empty/whitespace nodes
            if not node.code.strip():
                continue
            chunks.append(ASTChunk(filepath, relative_path, node))
            
        return chunks

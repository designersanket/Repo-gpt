import os
from typing import List, Dict, Any, Optional
from tree_sitter_languages import get_parser

# Map file extensions to Tree-sitter languages
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "cpp",
    ".hpp": "cpp",
    ".go": "go"
}

class ASTNodeInfo:
    def __init__(self, node_type: str, name: str, start_line: int, end_line: int, code: str, metadata: Optional[Dict[str, Any]] = None):
        self.node_type = node_type  # "function", "class", "import", "module"
        self.name = name
        self.start_line = start_line # 1-indexed
        self.end_line = end_line     # 1-indexed
        self.code = code
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_type": self.node_type,
            "name": self.name,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "code": self.code,
            "metadata": self.metadata
        }

def get_language_from_ext(filename: str) -> Optional[str]:
    ext = os.path.splitext(filename)[1].lower()
    return LANGUAGE_MAP.get(ext)

def extract_node_name(node, source_code: bytes) -> str:
    """Helper to extract names from common AST nodes like functions and classes."""
    for child in node.children:
        if child.type in ("identifier", "type_identifier", "field_identifier"):
            return source_code[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
    return "anonymous"

class CodeASTParser:
    def __init__(self, filename: str, content: str):
        self.filename = filename
        self.content = content
        self.source_bytes = content.encode("utf-8")
        self.language = get_language_from_ext(filename)
        self.parser = None
        if self.language:
            try:
                self.parser = get_parser(self.language)
            except Exception as e:
                print(f"Error loading parser for {self.language}: {e}")

    def parse(self) -> List[ASTNodeInfo]:
        if not self.parser:
            # Fallback to single module-level chunk if no parser is available
            lines = self.content.splitlines()
            return [ASTNodeInfo(
                node_type="module",
                name=os.path.basename(self.filename),
                start_line=1,
                end_line=max(1, len(lines)),
                code=self.content,
                metadata={"language": "plaintext"}
            )]

        try:
            tree = self.parser.parse(self.source_bytes)
            root_node = tree.root_node
            nodes_info: List[ASTNodeInfo] = []
            
            # Extract imports at the top level
            imports = self._extract_imports(root_node)
            if imports:
                # Combine imports into a single structural node
                import_code = "\n".join([imp["code"] for imp in imports])
                nodes_info.append(ASTNodeInfo(
                    node_type="import",
                    name="imports",
                    start_line=min(imp["start_line"] for imp in imports),
                    end_line=max(imp["end_line"] for imp in imports),
                    code=import_code,
                    metadata={"imports_list": [imp["name"] for imp in imports]}
                ))

            # Traverse the AST to find classes and functions
            self._traverse(root_node, nodes_info)
            
            # If no classes or functions were found, or the file is very short, add the whole file as a module
            if not nodes_info:
                lines = self.content.splitlines()
                nodes_info.append(ASTNodeInfo(
                    node_type="module",
                    name=os.path.basename(self.filename),
                    start_line=1,
                    end_line=max(1, len(lines)),
                    code=self.content,
                    metadata={"language": self.language}
                ))
                
            return nodes_info
        except Exception as e:
            print(f"AST parsing failed for {self.filename}: {e}")
            lines = self.content.splitlines()
            return [ASTNodeInfo(
                node_type="module",
                name=os.path.basename(self.filename),
                start_line=1,
                end_line=max(1, len(lines)),
                code=self.content,
                metadata={"language": "plaintext", "error": str(e)}
            )]

    def _extract_imports(self, root_node) -> List[Dict[str, Any]]:
        imports = []
        for child in root_node.children:
            is_import = False
            name = ""
            
            if self.language == "python" and child.type in ("import_statement", "import_from_statement"):
                is_import = True
                name = self.source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
            elif self.language in ("javascript", "typescript") and child.type in ("import_statement", "export_statement"):
                is_import = True
                name = self.source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
            elif self.language == "java" and child.type == "import_declaration":
                is_import = True
                name = self.source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
            elif self.language == "go" and child.type == "import_declaration":
                is_import = True
                name = self.source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
            elif self.language == "cpp" and child.type == "preproc_include":
                is_import = True
                name = self.source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")

            if is_import:
                code_segment = self.source_bytes[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
                imports.append({
                    "name": name.strip(),
                    "start_line": child.start_point[0] + 1,
                    "end_line": child.end_point[0] + 1,
                    "code": code_segment
                })
        return imports

    def _traverse(self, node, nodes_info: List[ASTNodeInfo], parent_class: Optional[str] = None):
        node_type = node.type
        
        # Check for function/method nodes
        is_function = False
        is_class = False
        name = ""
        
        if self.language == "python":
            if node_type == "function_definition":
                is_function = True
                name = extract_node_name(node, self.source_bytes)
            elif node_type == "class_definition":
                is_class = True
                name = extract_node_name(node, self.source_bytes)
                
        elif self.language in ("javascript", "typescript"):
            if node_type in ("function_declaration", "method_definition", "arrow_function"):
                is_function = True
                name = extract_node_name(node, self.source_bytes)
                if node_type == "arrow_function" and node.parent and node.parent.type == "variable_declarator":
                    name = extract_node_name(node.parent, self.source_bytes)
            elif node_type == "class_declaration":
                is_class = True
                name = extract_node_name(node, self.source_bytes)
                
        elif self.language == "java":
            if node_type == "method_declaration":
                is_function = True
                name = extract_node_name(node, self.source_bytes)
            elif node_type in ("class_declaration", "interface_declaration", "enum_declaration"):
                is_class = True
                name = extract_node_name(node, self.source_bytes)
                
        elif self.language == "go":
            if node_type in ("function_declaration", "method_declaration"):
                is_function = True
                name = extract_node_name(node, self.source_bytes)
                
        elif self.language == "cpp":
            if node_type in ("function_definition", "method_declaration"):
                is_function = True
                name = extract_node_name(node, self.source_bytes)
            elif node_type in ("class_specifier", "struct_specifier"):
                is_class = True
                name = extract_node_name(node, self.source_bytes)

        # Record function details
        if is_function:
            code_segment = self.source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="ignore")
            # Don't record trivial/very short methods
            if len(code_segment.strip()) > 10:
                nodes_info.append(ASTNodeInfo(
                    node_type="function",
                    name=name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    code=code_segment,
                    metadata={"parent_class": parent_class, "language": self.language}
                ))
                
        # Record class details and traverse children with parent_class context
        elif is_class:
            code_segment = self.source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="ignore")
            nodes_info.append(ASTNodeInfo(
                node_type="class",
                name=name,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                code=code_segment,
                metadata={"language": self.language}
            ))
            
            # Recurse children with class context
            for child in node.children:
                self._traverse(child, nodes_info, parent_class=name)
                
        else:
            # Continue traversal for non-class, non-function nodes
            for child in node.children:
                self._traverse(child, nodes_info, parent_class=parent_class)

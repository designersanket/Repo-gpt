import React, { useContext, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { AppContext } from '../context/AppContext';
import { Terminal, FileCode, Edit3 } from 'lucide-react';

export default function FileViewer() {
  const { selectedFilePath, selectedFileContent, highlightedLines } = useContext(AppContext);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  // Detect file language
  const getLanguage = (filepath) => {
    if (!filepath) return 'plaintext';
    const ext = filepath.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      go: 'go',
      cpp: 'cpp',
      cc: 'cpp',
      h: 'cpp',
      hpp: 'cpp',
      css: 'css',
      html: 'html',
      json: 'json'
    };
    return map[ext] || 'plaintext';
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // Scroll to and highlight referenced code lines
  useEffect(() => {
    if (editorRef.current && monacoRef.current && highlightedLines) {
      const { startLine, endLine } = highlightedLines;
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      // Reveal line in center
      editor.revealLineInCenter(startLine);

      // Clean up previous decorations
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

      // Add line highlighting decorations (uses standard editor highlight selectors)
      const range = new monaco.Range(startLine, 1, endLine, 100);
      decorationsRef.current = editor.deltaDecorations([], [
        {
          range,
          options: {
            isWholeLine: true,
            className: 'bg-blue-900/20 border-l-2 border-blue-500', // Highlight background color and left border
            glyphMarginClassName: 'bg-blue-500/50'
          }
        }
      ]);
    }
  }, [highlightedLines, selectedFilePath]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
      {/* File Viewer Header */}
      <div className="p-4 border-b border-border bg-[#0d111d] flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">File Explorer Viewer</span>
          <span className="text-xs font-mono px-2 py-0.5 bg-accent rounded text-slate-300">
            {selectedFilePath ? selectedFilePath : 'No File Loaded'}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
          <Edit3 className="w-3.5 h-3.5" />
          <span>Read-Only Inspector</span>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 min-h-0 relative">
        {selectedFilePath ? (
          <MonacoEditor
            height="100%"
            language={getLanguage(selectedFilePath)}
            theme="vs-dark"
            value={selectedFileContent || ''}
            options={{
              readOnly: true,
              fontSize: 12,
              fontFamily: 'Fira Code',
              minimap: { enabled: true },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbersMinChars: 3,
              renderLineHighlight: 'all',
              padding: { top: 12, bottom: 12 }
            }}
            onMount={handleEditorDidMount}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[#0a0d14] text-slate-500">
            <Terminal className="w-12 h-12 text-slate-700 mb-2 pulse-glow" />
            <h4 className="font-semibold text-slate-400">Code Playground</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Open a file from the repository explorer tree or click on a code reference in the chat window to view and inspect.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

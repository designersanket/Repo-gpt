import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, FileText, Code, CornerDownRight, HelpCircle, Terminal } from 'lucide-react';

export default function ChatInterface() {
  const { activeRepo, selectFile, setHighlightedLines } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Load chat history when repository changes
  useEffect(() => {
    if (activeRepo) {
      loadHistory();
    } else {
      setMessages([]);
    }
  }, [activeRepo]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const loadHistory = async () => {
    try {
      const res = await api.getChatHistory(activeRepo._id);
      if (res?.success) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeRepo) return;

    const userMessageText = input;
    setInput('');
    setIsLoading(true);

    // Optimistically add user query to screen
    const userMsg = { role: 'user', message: userMessageText, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.queryRepo(activeRepo._id, userMessageText);
      if (res?.success) {
        // Add assistant response
        const assistantMsg = {
          role: 'assistant',
          message: res.data.answer,
          references: res.data.references,
          createdAt: new Date()
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        message: `**System Error:** Failed to fetch answer.\n\n${err.response?.data?.error || err.message}`,
        references: [],
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReferenceClick = (ref) => {
    // 1. Open the file in Monaco Editor
    selectFile(ref.relative_path);
    // 2. Set lines to highlight and scroll to
    setHighlightedLines({
      startLine: ref.start_line,
      endLine: ref.end_line
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-white">
      {/* Active Repo Header */}
      <div className="p-4 border-b border-border bg-[#0d111d] flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">RAG Workspace</span>
          <span className="text-xs px-2 py-0.5 bg-accent rounded text-slate-300 font-medium">
            {activeRepo ? activeRepo.name : 'No Repo Selected'}
          </span>
        </div>
      </div>

      {/* Messages Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-600 pulse-glow" />
            <h3 className="font-semibold text-slate-400">Ask RepoGPT</h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Query architecture, trace import chains, or find auth flow handlers inside your code.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm pt-2">
              {[
                "Where is the main API router initialized?",
                "How are database connections handled?",
                "Explain the authentication middleware flow"
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="text-[10px] text-slate-400 bg-card hover:bg-accent border border-border px-2.5 py-1.5 rounded-lg transition-colors duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-card border border-border text-slate-200 rounded-bl-none'
                  }`}
                >
                  {/* Markdown Renderer */}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        return (
                          <code
                            className={`${className} ${
                              inline ? 'bg-slate-800 px-1 py-0.5 rounded text-blue-300 text-xs' : 'block bg-slate-950 p-3 rounded-lg overflow-x-auto text-xs my-2 text-slate-200 border border-border'
                            }`}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      p({ children }) {
                        return <p className="mb-2 last:mb-0">{children}</p>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
                      }
                    }}
                  >
                    {msg.message}
                  </ReactMarkdown>
                </div>

                {/* References Box (Citations) */}
                {!isUser && msg.references && msg.references.length > 0 && (
                  <div className="mt-2 w-full glass-card rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      <Code className="w-3.5 h-3.5 mr-1 text-primary" />
                      Code References:
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {msg.references.map((ref, rIdx) => (
                        <div
                          key={rIdx}
                          onClick={() => handleReferenceClick(ref)}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-border cursor-pointer transition-colors duration-150 group"
                        >
                          <div className="flex items-center min-w-0 mr-2">
                            <FileText className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0 group-hover:text-primary transition-colors" />
                            <span className="truncate text-xs text-slate-300 font-mono">
                              {ref.relative_path}
                            </span>
                            <CornerDownRight className="w-3 h-3 text-slate-600 mx-1.5" />
                            <span className="text-[10px] text-slate-400 font-mono">
                              {ref.node_type} {ref.name ? `"${ref.name}"` : ''}
                            </span>
                          </div>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono shrink-0">
                            Lines {ref.start_line}-{ref.end_line}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-center space-x-2 bg-card border border-border p-4 rounded-2xl rounded-bl-none max-w-[120px] mr-auto">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Text Input Panel */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-[#0d111d]">
        <div className="relative flex items-center bg-slate-950 rounded-xl border border-border focus-within:border-primary transition-colors duration-150">
          <input
            type="text"
            placeholder={activeRepo ? "Ask about the codebase..." : "Select or index a repository first"}
            disabled={!activeRepo || isLoading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent p-3.5 pr-12 text-sm text-slate-200 placeholder-slate-500 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !activeRepo}
            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg text-white transition-colors duration-150 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

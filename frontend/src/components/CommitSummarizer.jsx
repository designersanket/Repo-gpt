import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { History, RefreshCw, AlertTriangle, Cpu } from 'lucide-react';

export default function CommitSummarizer() {
  const { activeRepo } = useContext(AppContext);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    if (!activeRepo) return;
    setIsLoading(true);
    setError('');
    setSummary('');
    try {
      const res = await api.getCommits(activeRepo._id);
      if (res?.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch commit summaries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [activeRepo]);

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-white select-none">
      {/* Header */}
      <div className="p-4 border-b border-border bg-[#0d111d] flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Git Commit Summarizer</span>
        </div>
        <button
          onClick={loadSummary}
          disabled={isLoading || !activeRepo}
          className="p-1.5 rounded bg-accent hover:bg-slate-700 text-xs flex items-center space-x-1 transition-colors"
          title="Regenerate Summary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Regenerate</span>
        </button>
      </div>

      {/* Summary Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2">
            <Cpu className="w-8 h-8 text-primary animate-pulse" />
            <span className="text-xs text-slate-500 font-mono">Gemini is analyzing git log history...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-red-400">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <h4 className="font-semibold">Summarization Error</h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1">{error}</p>
          </div>
        ) : !activeRepo ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <History className="w-10 h-10 text-slate-700 mb-2" />
            <h4 className="font-semibold text-slate-400">No Repo Open</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">Open a repository to fetch code changes summaries.</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6 border border-border/50 max-w-3xl mx-auto shadow-xl leading-relaxed text-sm select-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold border-b border-border pb-2 mb-3 mt-4 text-white">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 text-slate-200">{children}</h2>,
                p: ({ children }) => <p className="text-slate-300 mb-3">{children}</p>,
                li: ({ children }) => <li className="text-slate-400 mb-1 ml-4 list-disc">{children}</li>,
                code: ({ children }) => <code className="bg-slate-950 px-1 py-0.5 rounded text-blue-300 font-mono text-xs">{children}</code>
              }}
            >
              {summary || '*No summary generated. Click Regenerate to invoke analysis.*'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

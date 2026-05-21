import React, { useContext } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import RepositoryExplorer from './components/RepositoryExplorer';
import ChatInterface from './components/ChatInterface';
import FileViewer from './components/FileViewer';
import DependencyGraph from './components/DependencyGraph';
import CommitSummarizer from './components/CommitSummarizer';
import { MessageSquare, GitFork, History } from 'lucide-react';

const WorkspaceLayout = () => {
  const { activeTab, setActiveTab } = useContext(AppContext);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100 font-sans">
      {/* 1. Left Sidebar: Folder tree and cloner */}
      <RepositoryExplorer />

      {/* 2. Middle Panel: RAG Chat Interface */}
      <div className="flex-1 min-w-0 border-r border-border h-full flex flex-col">
        <ChatInterface />
      </div>

      {/* 3. Right Panel: Tabbed Code / Graph / Commit inspector */}
      <div className="w-[50%] h-full flex flex-col bg-[#0d111d]">
        {/* Workspace tab selectors */}
        <div className="flex border-b border-border bg-[#070a13] px-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-1.5 py-3 px-4 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors duration-150 ${
              activeTab === 'chat'
                ? 'border-primary text-white bg-accent/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-yellow-500" />
            <span>Monaco Inspector</span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center space-x-1.5 py-3 px-4 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors duration-150 ${
              activeTab === 'graph'
                ? 'border-primary text-white bg-accent/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-4 h-4 text-emerald-500" />
            <span>Architecture Graph</span>
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={`flex items-center space-x-1.5 py-3 px-4 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors duration-150 ${
              activeTab === 'commits'
                ? 'border-primary text-white bg-accent/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-blue-400" />
            <span>Commit Summary</span>
          </button>
        </div>

        {/* Tab display views */}
        <div className="flex-1 min-h-0">
          {activeTab === 'chat' && <FileViewer />}
          {activeTab === 'graph' && <DependencyGraph />}
          {activeTab === 'commits' && <CommitSummarizer />}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <WorkspaceLayout />
    </AppProvider>
  );
}

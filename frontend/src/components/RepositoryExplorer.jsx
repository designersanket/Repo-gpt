import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Folder, FolderOpen, FileCode, Plus, Trash2, GitBranch,
  Github, FileArchive, RefreshCw, AlertCircle, RotateCcw,
  Download, Zap, GitMerge, CheckCircle2
} from 'lucide-react';

// Recursive Component to render Folder Tree Nodes
const FileTreeNode = ({ node, level = 0 }) => {
  const { selectFile, selectedFilePath } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);

  const isDirectory = node.type === 'directory';
  const isSelected = selectedFilePath === node.path;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      selectFile(node.path);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['js', 'jsx'].includes(ext)) return <FileCode className="text-yellow-500 w-4 h-4 mr-2 shrink-0" />;
    if (['ts', 'tsx'].includes(ext)) return <FileCode className="text-blue-500 w-4 h-4 mr-2 shrink-0" />;
    if (ext === 'py') return <FileCode className="text-green-400 w-4 h-4 mr-2 shrink-0" />;
    if (ext === 'java') return <FileCode className="text-red-400 w-4 h-4 mr-2 shrink-0" />;
    if (ext === 'go') return <FileCode className="text-cyan-400 w-4 h-4 mr-2 shrink-0" />;
    if (ext === 'cpp' || ext === 'cc') return <FileCode className="text-purple-400 w-4 h-4 mr-2 shrink-0" />;
    return <FileCode className="text-slate-400 w-4 h-4 mr-2 shrink-0" />;
  };

  return (
    <div className="select-none">
      <div
        onClick={handleToggle}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        className={`flex items-center py-1.5 px-2 hover:bg-accent/40 rounded cursor-pointer transition-colors duration-150 ${
          isSelected ? 'bg-primary/20 text-primary border-l-2 border-primary font-medium' : 'text-slate-300'
        }`}
      >
        {isDirectory ? (
          <>
            {isOpen ? (
              <FolderOpen className="text-primary w-4 h-4 mr-2 shrink-0" />
            ) : (
              <Folder className="text-primary/70 w-4 h-4 mr-2 shrink-0" />
            )}
            <span className="truncate text-sm">{node.name}</span>
          </>
        ) : (
          <>
            {getFileIcon(node.name)}
            <span className="truncate text-sm">{node.name}</span>
          </>
        )}
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="mt-0.5">
          {node.children.map((child, idx) => (
            <FileTreeNode key={`${child.path}-${idx}`} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function RepositoryExplorer() {
  const {
    repos,
    activeRepo,
    loadRepoDetails,
    fetchRepos,
    indexingStatus,
    setIndexingStatus,
    cloneProgress,
    isUploading,
    setIsUploading,
  } = useContext(AppContext);

  const { joinRepoRoom } = useWebSocket();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [gitUrl, setGitUrl] = useState('');
  const [repoName, setRepoName] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [uploadType, setUploadType] = useState('git'); // 'git' | 'zip'

  const handleSelectRepo = (repoId) => {
    loadRepoDetails(repoId);
    joinRepoRoom(repoId);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let res;
      if (uploadType === 'git') {
        res = await api.cloneRepo(gitUrl, repoName);
      } else {
        if (!zipFile) return alert('Please select a ZIP file');
        const formData = new FormData();
        formData.append('file', zipFile);
        res = await api.uploadZip(formData);
      }

      if (res?.success) {
        setShowUploadModal(false);
        setGitUrl('');
        setRepoName('');
        setZipFile(null);
        
        // Refresh repo list
        await fetchRepos();
        
        // Auto-join WS progress tracking room
        const newRepoId = res.data._id;
        joinRepoRoom(newRepoId);
        setIndexingStatus({
          repoId: newRepoId,
          status: 'cloning',
          progress: 10,
          error: ''
        });
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Operation failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindexRepo = async (repoId, e) => {
    e.stopPropagation();
    try {
      const res = await api.reindexRepo(repoId);
      if (res?.success) {
        joinRepoRoom(repoId);
        setIndexingStatus({ repoId, status: 'indexing', progress: 60, error: '' });
        fetchRepos();
      }
    } catch (err) {
      alert('Re-index failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteRepo = async (repoId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this repository and its FAISS index?')) return;
    try {
      const res = await api.deleteRepo(repoId);
      if (res?.success) {
        fetchRepos();
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Check progress for active repo or indexing repo
  const getRepoStatus = (repo) => {
    const isIndexingCurrent = indexingStatus && indexingStatus.repoId === repo._id;
    const status = isIndexingCurrent ? indexingStatus.status : repo.status;
    const progress = isIndexingCurrent ? indexingStatus.progress : repo.progress;
    
    return { status, progress };
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-80 text-white select-none">
      {/* Title Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg active-glow">
            <span className="font-bold text-base text-white">RG</span>
          </div>
          <h1 className="font-bold text-lg tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            RepoGPT
          </h1>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="p-1.5 rounded-lg bg-primary hover:bg-primary/80 transition-colors duration-150 text-white flex items-center"
          title="Upload repository"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Repository Selector List */}
      <div className="p-3 border-b border-border">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Workspace Repositories
        </label>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {repos.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-2">No codebases connected.</div>
          ) : (
            repos.map((repo) => {
              const isActive = activeRepo && activeRepo._id === repo._id;
              const { status, progress } = getRepoStatus(repo);
              
              return (
                <div
                  key={repo._id}
                  onClick={() => handleSelectRepo(repo._id)}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-accent border border-border shadow-inner text-white'
                      : 'hover:bg-accent/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-slate-500'}`} />
                    <div className="truncate text-xs font-medium">{repo.name}</div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Status indicator */}
                    {status === 'ready' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {['cloning', 'parsing', 'indexing'].includes(status) && (
                      <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                    )}
                    {status === 'failed' && (
                      <button
                        onClick={(e) => handleReindexRepo(repo._id, e)}
                        className="p-1 hover:text-yellow-400 text-red-400 rounded transition-colors duration-150"
                        title="Re-index repository"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => handleDeleteRepo(repo._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-opacity duration-150"
                      title="Delete indexing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Real-time Ingestion Progress Panel */}
      {indexingStatus && indexingStatus.status !== 'ready' && indexingStatus.status !== 'failed' && (() => {
        const isCloning = indexingStatus.status === 'cloning';
        const cp = isCloning && cloneProgress && cloneProgress.repoId === indexingStatus.repoId ? cloneProgress : null;

        const stageLabel = {
          connecting: 'Connecting…',
          counting: 'Counting objects…',
          compressing: 'Compressing…',
          receiving: 'Receiving objects…',
          resolving: 'Resolving deltas…',
          checkout: 'Checking out files…',
          parsing: 'Parsing AST…',
          indexing: 'Building vector index…',
        };

        const stageIcon = {
          connecting: <Zap className="w-3 h-3" />,
          counting: <GitMerge className="w-3 h-3" />,
          compressing: <GitMerge className="w-3 h-3" />,
          receiving: <Download className="w-3 h-3" />,
          resolving: <GitMerge className="w-3 h-3" />,
          checkout: <CheckCircle2 className="w-3 h-3" />,
          parsing: <RefreshCw className="w-3 h-3 animate-spin" />,
          indexing: <RefreshCw className="w-3 h-3 animate-spin" />,
        };

        const currentStage = cp?.stage || indexingStatus.status;
        const pct = indexingStatus.progress || 0;

        return (
          <div className="mx-3 mb-2 rounded-xl border border-blue-500/20 bg-slate-900/80 overflow-hidden">
            {/* Stage header */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400">
                {stageIcon[currentStage] || <RefreshCw className="w-3 h-3 animate-spin" />}
                {stageLabel[currentStage] || `${indexingStatus.status}…`}
              </span>
              <span className="text-[11px] font-bold text-white tabular-nums">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="px-3 pb-2">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                    boxShadow: '0 0 8px #3b82f680',
                  }}
                />
              </div>
            </div>

            {/* Clone detail stats — only shown during git clone */}
            {cp && (cp.receivedObjects > 0 || cp.speed) && (
              <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
                {cp.receivedObjects > 0 && (
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {cp.receivedObjects.toLocaleString()} / {cp.totalObjects.toLocaleString()} objects
                  </span>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  {cp.transferred && (
                    <span className="text-[10px] text-slate-500">{cp.transferred}</span>
                  )}
                  {cp.speed && (
                    <span className="text-[10px] font-medium text-emerald-400">{cp.speed}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Active Repo File Tree */}
      <div className="flex-1 overflow-y-auto p-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Repository Explorer
        </label>
        {activeRepo ? (
          activeRepo.status === 'ready' ? (
            activeRepo.fileTree && activeRepo.fileTree.children ? (
              <div className="space-y-0.5 font-mono">
                {activeRepo.fileTree.children.map((child, idx) => (
                  <FileTreeNode key={`${child.path}-${idx}`} node={child} />
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-2">Empty file tree.</div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <div className="text-xs">Repository is {activeRepo.status}...</div>
              {activeRepo.error && <div className="text-red-400 text-[10px] break-all">{activeRepo.error}</div>}
            </div>
          )
        ) : (
          <div className="text-xs text-slate-500 italic p-2">Select a repository to explore files.</div>
        )}
      </div>

      {/* Upload/Index Modal Dialog */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-xl max-w-md w-full p-6 shadow-2xl relative border border-border text-white">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Index New Repository
            </h2>

            {/* Selector */}
            <div className="flex border-b border-border mb-4">
              <button
                type="button"
                onClick={() => setUploadType('git')}
                className={`flex-1 pb-2 font-medium text-sm border-b-2 transition-colors duration-150 ${
                  uploadType === 'git' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <Github className="w-4 h-4" />
                  <span>GitHub Clone</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setUploadType('zip')}
                className={`flex-1 pb-2 font-medium text-sm border-b-2 transition-colors duration-150 ${
                  uploadType === 'zip' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <FileArchive className="w-4 h-4" />
                  <span>ZIP File Upload</span>
                </div>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {uploadType === 'git' ? (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Git URL</label>
                    <input
                      type="url"
                      placeholder="https://github.com/user/repo"
                      required
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-white outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Repo Display Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="My Codebase"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-white outline-none focus:border-primary"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Select ZIP Archive</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border hover:border-primary/50 rounded-lg cursor-pointer bg-slate-900 hover:bg-slate-900/80 transition-colors duration-150">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileArchive className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-slate-400 font-medium">
                          {zipFile ? zipFile.name : 'Click to upload repository ZIP'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">Supported formats: .zip (Max 100MB)</p>
                      </div>
                      <input
                        type="file"
                        accept=".zip"
                        required
                        onChange={(e) => setZipFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Form buttons */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium p-2.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 bg-primary hover:bg-primary/80 text-white font-semibold p-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-colors duration-150 disabled:opacity-50 shadow-lg"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Start Indexing</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

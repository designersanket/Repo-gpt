import React, { useContext, useState } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import RepositoryExplorer from './components/RepositoryExplorer';
import ChatInterface from './components/ChatInterface';
import FileViewer from './components/FileViewer';
import DependencyGraph from './components/DependencyGraph';
import CommitSummarizer from './components/CommitSummarizer';
import { MessageSquare, GitFork, History, LogOut, User } from 'lucide-react';
import api, { axiosInstance } from './services/api';

// ── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.login(form.email, form.password)
        : await api.register(form.username, form.email, form.password);
      if (res?.token) onAuth(res.token, res.user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060910] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="font-bold text-lg text-white">RG</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RepoGPT</h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-800 mb-5">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 pb-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${
                  mode === m ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <input
                type="text" placeholder="Username" required
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
              />
            )}
            <input
              type="email" placeholder="Email" required
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
            />
            <input
              type="password" placeholder="Password" required minLength={6}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
            />
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-1"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">
          Your repositories and chats are private and isolated.
        </p>
      </div>
    </div>
  );
}

// ── Workspace ────────────────────────────────────────────────────────────────
function WorkspaceLayout({ user, onLogout }) {
  const { activeTab, setActiveTab } = useContext(AppContext);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100 font-sans">
      <RepositoryExplorer />

      <div className="flex-1 min-w-0 border-r border-border h-full flex flex-col">
        <ChatInterface />
      </div>

      <div className="w-[50%] h-full flex flex-col bg-[#0d111d]">
        <div className="flex items-center border-b border-border bg-[#070a13] px-2">
          <div className="flex flex-1">
            {[
              { id: 'chat', label: 'Monaco Inspector', icon: <MessageSquare className="w-4 h-4 text-yellow-500" /> },
              { id: 'graph', label: 'Architecture Graph', icon: <GitFork className="w-4 h-4 text-emerald-500" /> },
              { id: 'commits', label: 'Commit Summary', icon: <History className="w-4 h-4 text-blue-400" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 py-3 px-4 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors duration-150 ${
                  activeTab === tab.id
                    ? 'border-primary text-white bg-accent/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}<span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-2 px-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="w-3 h-3" />
              <span>{user?.username}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {activeTab === 'chat' && <FileViewer />}
          {activeTab === 'graph' && <DependencyGraph />}
          {activeTab === 'commits' && <CommitSummarizer />}
        </div>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [authState, setAuthState] = useState(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return { token, user: user ? JSON.parse(user) : null };
  });

  const handleAuth = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setAuthState({ token, user });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setAuthState({ token: null, user: null });
  };

  if (!authState.token) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return (
    <AppProvider>
      <WorkspaceLayout user={authState.user} onLogout={handleLogout} />
    </AppProvider>
  );
}

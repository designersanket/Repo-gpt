import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
];

export default function SettingsPanel({ usage, user, onReload }) {
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.apiProvider) {
      setSelectedProvider(user.apiProvider);
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus('');
    setSaving(true);
    try {
      const res = await api.saveUserApiKey(apiKey, selectedProvider);
      if (res?.success) {
        setStatus('API key saved securely.');
        setApiKey('');
        onReload?.();
      }
    } catch (err) {
      setStatus(err.response?.data?.message || err.message || 'Unable to save API key.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setStatus('');
    try {
      const res = await api.removeUserApiKey();
      if (res?.success) {
        setStatus('Custom API key removed.');
        onReload?.();
      }
    } catch (err) {
      setStatus(err.response?.data?.message || err.message || 'Unable to remove API key.');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Quota & API key</h2>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-2 text-xs text-slate-400">Secure storage</span>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Add your own OpenAI or Gemini API key to keep your usage separate from the platform quota. This is optional and encrypted in the database.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
            >
              {PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>{provider.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">API Key</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder="sk-..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !apiKey.trim()}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save API Key'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-red-400 hover:text-red-300"
            >
              Remove custom key
            </button>
          </div>
        </form>

        {status && <div className="mt-4 text-sm text-slate-200">{status}</div>}

        <div className="mt-5 rounded-2xl bg-slate-900 border border-slate-800 p-4 text-sm text-slate-400">
          <p className="font-semibold text-white mb-2">Current quota</p>
          <div className="grid gap-2 text-slate-300">
            <div className="flex items-center justify-between"><span>AI chats</span><strong>{limits.aiRequests}</strong></div>
            <div className="flex items-center justify-between"><span>Repo clones</span><strong>{limits.repoClones}</strong></div>
            <div className="flex items-center justify-between"><span>Embedding jobs</span><strong>{limits.embeddingRequests}</strong></div>
          </div>
        </div>
      </div>

      {usage && (
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Quick status</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900 p-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Remaining AI chats</p>
              <p className="text-3xl font-semibold text-white">{Math.max(0, limits.aiRequests - usage.aiRequests)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Remaining repo clones</p>
              <p className="text-3xl font-semibold text-white">{Math.max(0, limits.repoClones - usage.repoClones)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Remaining embeddings</p>
              <p className="text-3xl font-semibold text-white">{Math.max(0, limits.embeddingRequests - usage.embeddingRequests)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4">
              <p className="text-xs text-slate-500 uppercase mb-2">BYOK enabled</p>
              <p className="text-3xl font-semibold text-white">{user?.hasCustomApiKey ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

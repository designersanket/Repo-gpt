import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminDashboard({ onClose }) {
  const [summary, setSummary] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [violations, setViolations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAdminMetrics = async () => {
    setLoading(true);
    setError('');

    try {
      const [summaryRes, topUsersRes, violationsRes] = await Promise.all([
        api.getAdminSummary(),
        api.getAdminTopUsers(),
        api.getAdminViolations(),
      ]);

      if (!summaryRes?.success || !topUsersRes?.success || !violationsRes?.success) {
        throw new Error('Failed to load admin metrics');
      }

      setSummary(summaryRes.data);
      setTopUsers(topUsersRes.data);
      setViolations(violationsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load admin analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminMetrics();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin panel</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Platform analytics</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl">
            View daily platform-wide usage, quota violations, and the top users consuming AI resources.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminMetrics}
            className="rounded-2xl bg-slate-900 border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-700 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 hover:border-red-500 hover:text-red-300 transition-colors"
          >
            Back to workspace
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-300">Loading admin analytics…</div>
      ) : error ? (
        <div className="rounded-3xl border border-red-700 bg-red-950/20 p-6 text-red-300">{error}</div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Active users</p>
              <p className="mt-4 text-3xl font-semibold text-white">{summary?.activeUsers ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">AI requests today</p>
              <p className="mt-4 text-3xl font-semibold text-white">{summary?.totalAiRequests ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Embedding jobs</p>
              <p className="mt-4 text-3xl font-semibold text-white">{summary?.totalEmbeddingRequests ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Quota violations</p>
              <p className="mt-4 text-3xl font-semibold text-white">{summary?.totalViolations ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Top AI users</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Most active users</h3>
                </div>
              </div>
              <div className="space-y-3">
                {topUsers.length === 0 ? (
                  <p className="text-sm text-slate-400">No user activity recorded yet.</p>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-sm">
                    <div className="grid grid-cols-5 gap-2 bg-slate-950 px-4 py-3 text-slate-400 text-xs uppercase tracking-[0.24em]">
                      <span className="col-span-2">User</span>
                      <span>AI requests</span>
                      <span>Tokens</span>
                      <span>Cost</span>
                    </div>
                    {topUsers.map((user) => (
                      <div key={user.userId} className="grid grid-cols-5 gap-2 px-4 py-3 border-t border-slate-800 text-slate-200">
                        <div className="col-span-2 space-y-1">
                          <p className="font-semibold text-white">{user.username}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        <span>{user.aiRequests}</span>
                        <span>{user.tokensUsed}</span>
                        <span>${user.estimatedCost?.toFixed(2) ?? '0.00'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Violations</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{violations?.totalViolations ?? 0}</h3>
              <p className="mt-2 text-sm text-slate-400">
                Users flagged for quota overages: {violations?.users?.length ?? 0}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

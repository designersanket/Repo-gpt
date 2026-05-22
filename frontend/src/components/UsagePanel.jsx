import React from 'react';

const progressClass = (value) => {
  if (value >= 90) return 'bg-red-500';
  if (value >= 70) return 'bg-yellow-400';
  return 'bg-emerald-500';
};

const UsageLine = ({ label, used, limit, unit }) => {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span className="font-semibold text-slate-100">{used}/{limit} {unit}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full ${progressClass(percent)} transition-all duration-300`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export default function UsagePanel({ usage, limits }) {
  if (!usage) {
    return (
      <div className="p-6 text-slate-400">Loading usage summary...</div>
    );
  }

  const aiPercent = limits.aiRequests > 0 ? Math.round((usage.aiRequests / limits.aiRequests) * 100) : 0;
  const clonePercent = limits.repoClones > 0 ? Math.round((usage.repoClones / limits.repoClones) * 100) : 0;
  const embedPercent = limits.embeddingRequests > 0 ? Math.round((usage.embeddingRequests / limits.embeddingRequests) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Daily Quota Status</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Usage Tracker</h2>
          </div>
          <div className="rounded-full bg-slate-900 px-3 py-2 text-xs text-slate-400">Resets Daily</div>
        </div>

        <div className="space-y-4">
          <UsageLine label="AI Chats" used={usage.aiRequests} limit={limits.aiRequests} unit="requests" />
          <UsageLine label="Repository Clones" used={usage.repoClones} limit={limits.repoClones} unit="clones" />
          <UsageLine label="Embedding Jobs" used={usage.embeddingRequests} limit={limits.embeddingRequests} unit="jobs" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Token Usage</p>
          <div className="text-3xl font-semibold text-white">{usage.tokensUsed.toLocaleString()}</div>
          <p className="text-sm text-slate-400 mt-2">Prompt: {usage.promptTokens} tokens • Completion: {usage.completionTokens} tokens</p>
          <p className="mt-4 text-sm text-slate-300">Estimated Cost: ${usage.estimatedCost.toFixed(4)}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Health Signals</p>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex justify-between"><span>Failed AI requests</span><span>{usage.failedRequests}</span></div>
            <div className="flex justify-between"><span>Quota violations</span><span>{usage.quotaViolations}</span></div>
            <div className="flex justify-between"><span>Last reset</span><span>{new Date(usage.lastReset).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-sm leading-6 text-slate-400">
        <p className="font-semibold text-white mb-3">Usage guidance</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>Keep AI queries concise to stay within daily chat limits.</li>
          <li>Use repository cloning sparingly and reuse indexed repos where possible.</li>
          <li>Save your own API key in Settings to offload platform quota.</li>
        </ul>
      </div>
    </div>
  );
}

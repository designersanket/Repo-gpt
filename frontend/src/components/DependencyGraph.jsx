import React, { useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  MarkerType, Panel, EdgeLabelRenderer, BaseEdge, getStraightPath, getBezierPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AppContext } from '../context/AppContext';
import api from '../services/api';
import { GitFork, RefreshCw, AlertCircle, Layout, Search, X, ArrowRight, FileCode } from 'lucide-react';

// ── Color map ────────────────────────────────────────────────────────────────
const EXT_COLOR = {
  js: '#f59e0b', jsx: '#f59e0b',
  ts: '#3b82f6', tsx: '#3b82f6',
  py: '#22c55e',
  java: '#ef4444',
  go: '#06b6d4',
  cpp: '#a855f7', cc: '#a855f7', h: '#a855f7', hpp: '#a855f7',
  rb: '#e11d48', rs: '#f97316',
};
const getColor = (ext) => EXT_COLOR[ext] || '#64748b';

// ── Force-directed layout ────────────────────────────────────────────────────
const forceLayout = (nodes, edges) => {
  const pos = {};
  const cols = Math.ceil(Math.sqrt(nodes.length));
  nodes.forEach((n, i) => {
    pos[n.id] = {
      x: (i % cols) * 220 + (Math.random() - 0.5) * 60,
      y: Math.floor(i / cols) * 160 + (Math.random() - 0.5) * 60,
    };
  });

  for (let iter = 0; iter < 150; iter++) {
    const force = {};
    nodes.forEach(n => { force[n.id] = { x: 0, y: 0 }; });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].id, b = nodes[j].id;
        const dx = pos[a].x - pos[b].x;
        const dy = pos[a].y - pos[b].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const rep = 12000 / (dist * dist);
        force[a].x += (dx / dist) * rep;
        force[a].y += (dy / dist) * rep;
        force[b].x -= (dx / dist) * rep;
        force[b].y -= (dy / dist) * rep;
      }
    }

    edges.forEach(e => {
      if (!pos[e.source] || !pos[e.target]) return;
      const dx = pos[e.target].x - pos[e.source].x;
      const dy = pos[e.target].y - pos[e.source].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const att = (dist - 240) * 0.035;
      force[e.source].x += (dx / dist) * att;
      force[e.source].y += (dy / dist) * att;
      force[e.target].x -= (dx / dist) * att;
      force[e.target].y -= (dy / dist) * att;
    });

    const cool = 1 - iter / 150;
    nodes.forEach(n => {
      pos[n.id].x += Math.max(-60, Math.min(60, force[n.id].x * cool));
      pos[n.id].y += Math.max(-60, Math.min(60, force[n.id].y * cool));
    });
  }
  return pos;
};

// ── Custom edge with visible label on the line ───────────────────────────────
const LabeledEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, markerEnd, style,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
          >
            <div
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold whitespace-nowrap select-none"
              style={{
                background: data.edgeColor ? `${data.edgeColor}22` : '#1e293b',
                border: `1px solid ${data.edgeColor ? `${data.edgeColor}55` : '#334155'}`,
                color: data.edgeColor || '#94a3b8',
                backdropFilter: 'blur(4px)',
              }}
            >
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const edgeTypes = { labeled: LabeledEdge };

// ── Custom file node ─────────────────────────────────────────────────────────
const FileNode = ({ data }) => {
  const color = getColor(data.ext);
  const isSelected = data.selected;
  const isConnected = data.connected;
  const isDimmed = data.dimmed;

  return (
    <div
      className="flex flex-col rounded-xl border transition-all duration-150 cursor-pointer"
      style={{
        background: isSelected ? `${color}22` : '#0f172a',
        borderColor: isSelected ? color : isConnected ? `${color}80` : '#1e293b',
        borderWidth: isSelected ? 2 : 1,
        boxShadow: isSelected
          ? `0 0 0 3px ${color}30, 0 0 20px ${color}25`
          : isConnected ? `0 0 10px ${color}20` : 'none',
        opacity: isDimmed ? 0.2 : 1,
        minWidth: 160,
        maxWidth: 220,
      }}
    >
      {/* Top bar — colored by language */}
      <div
        className="h-1 rounded-t-xl w-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }}
      />

      <div className="flex items-start gap-2 px-3 py-2">
        {/* Icon */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${color}20` }}
        >
          <FileCode className="w-3.5 h-3.5" style={{ color }} />
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0 flex-1">
          {/* File name — always fully visible */}
          <span
            className="text-[12px] font-bold leading-tight break-all"
            style={{ color: isSelected ? color : '#f1f5f9' }}
          >
            {data.label}
          </span>
          {/* Directory path */}
          {data.dir && (
            <span className="text-[9px] text-slate-500 leading-tight mt-0.5 break-all font-mono">
              {data.dir}/
            </span>
          )}
        </div>

        {/* Ext badge */}
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 self-start"
          style={{ background: `${color}20`, color }}
        >
          {data.ext}
        </span>
      </div>

      {/* Connection count badges */}
      {(data.imports > 0 || data.importedBy > 0) && (
        <div className="flex items-center gap-1.5 px-3 pb-2">
          {data.imports > 0 && (
            <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
              <ArrowRight className="w-2.5 h-2.5 text-indigo-400" />
              {data.imports} import{data.imports > 1 ? 's' : ''}
            </span>
          )}
          {data.importedBy > 0 && (
            <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
              <ArrowRight className="w-2.5 h-2.5 rotate-180 text-emerald-400" />
              used by {data.importedBy}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes = { file: FileNode };

// ── Main component ───────────────────────────────────────────────────────────
export default function DependencyGraph() {
  const { activeRepo, selectFile } = useContext(AppContext);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Store raw data for re-highlighting without re-fetching
  const rawRef = useRef({ nodes: [], edges: [] });

  const buildGraph = useCallback((rawNodes, rawEdges) => {
    rawRef.current = { nodes: rawNodes, edges: rawEdges };

    // Compute degree maps
    const outDegree = {}, inDegree = {};
    rawNodes.forEach(n => { outDegree[n.id] = 0; inDegree[n.id] = 0; });
    rawEdges.forEach(e => {
      outDegree[e.source] = (outDegree[e.source] || 0) + 1;
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });

    const positions = forceLayout(rawNodes, rawEdges);

    const formattedNodes = rawNodes.map(node => {
      const parts = node.id.split('/');
      const fileName = parts[parts.length - 1];
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      const ext = fileName.includes('.') ? fileName.split('.').pop() : '';

      return {
        id: node.id,
        type: 'file',
        position: positions[node.id] || { x: 0, y: 0 },
        data: {
          label: fileName,
          dir,
          ext,
          fullPath: node.id,
          color: getColor(ext),
          imports: outDegree[node.id] || 0,
          importedBy: inDegree[node.id] || 0,
          selected: false,
          connected: false,
          dimmed: false,
        },
        style: { padding: 0, border: 'none', background: 'transparent' },
      };
    });

    const formattedEdges = rawEdges.map(edge => {
      const srcExt = edge.source.split('.').pop();
      const color = getColor(srcExt);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'labeled',
        data: { label: edge.label || '', edgeColor: color },
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#475569' },
        style: { stroke: '#334155', strokeWidth: 1.5, opacity: 0.8 },
      };
    });

    setNodes(formattedNodes);
    setEdges(formattedEdges);
    setStats({ files: rawNodes.length, connections: rawEdges.length });
    setSelectedId(null);
  }, [setNodes, setEdges]);

  const loadGraph = useCallback(async () => {
    if (!activeRepo) return;
    setIsLoading(true);
    setError('');
    setSearch('');
    try {
      const res = await api.getDependencies(activeRepo._id);
      if (res?.success) buildGraph(res.data.nodes, res.data.edges);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load graph');
    } finally {
      setIsLoading(false);
    }
  }, [activeRepo, buildGraph]);

  useEffect(() => { loadGraph(); }, [activeRepo]);

  // ── Node click: highlight node + its direct connections ──────────────────
  const onNodeClick = useCallback((_, node) => {
    const id = node.id;
    setSelectedId(prev => {
      const newId = prev === id ? null : id;

      if (!newId) {
        // Deselect — reset all
        setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, selected: false, connected: false, dimmed: false } })));
        setEdges(es => es.map(e => ({
          ...e,
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#475569' },
          style: { stroke: '#334155', strokeWidth: 1.5, opacity: 0.8 },
        })));
        return null;
      }

      // Find directly connected node IDs
      const connectedIds = new Set();
      rawRef.current.edges.forEach(e => {
        if (e.source === newId) connectedIds.add(e.target);
        if (e.target === newId) connectedIds.add(e.source);
      });

      setNodes(ns => ns.map(n => ({
        ...n,
        data: {
          ...n.data,
          selected: n.id === newId,
          connected: connectedIds.has(n.id),
          dimmed: n.id !== newId && !connectedIds.has(n.id),
        },
      })));

      setEdges(es => es.map(e => {
        const isOut = e.source === newId;
        const isIn = e.target === newId;
        const active = isOut || isIn;
        const srcExt = e.source.split('.').pop();
        const activeColor = isOut ? '#6366f1' : '#22c55e';
        return {
          ...e,
          animated: active,
          data: { ...e.data, edgeColor: active ? activeColor : getColor(srcExt) },
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: active ? activeColor : '#475569' },
          style: {
            stroke: active ? activeColor : '#1e293b',
            strokeWidth: active ? 2.5 : 1,
            opacity: active ? 1 : 0.1,
          },
        };
      }));

      selectFile(newId);
      return newId;
    });
  }, [selectFile, setNodes, setEdges]);

  // ── Search filter ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nodes.length) return;
    if (!search.trim()) {
      setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, dimmed: false, selected: n.id === selectedId } })));
      setEdges(es => es.map(e => ({ ...e, style: { ...e.style, opacity: 0.8 } })));
      return;
    }
    const q = search.toLowerCase();
    const matchIds = new Set();
    setNodes(ns => ns.map(n => {
      const match = n.data.fullPath.toLowerCase().includes(q) || n.data.label.toLowerCase().includes(q);
      if (match) matchIds.add(n.id);
      return { ...n, data: { ...n.data, dimmed: !match, selected: false } };
    }));
    setEdges(es => es.map(e => ({
      ...e,
      style: { ...e.style, opacity: matchIds.has(e.source) && matchIds.has(e.target) ? 0.9 : 0.05 },
    })));
  }, [search]);

  const legend = useMemo(() => [
    { label: 'JS / JSX', color: '#f59e0b' },
    { label: 'TS / TSX', color: '#3b82f6' },
    { label: 'Python', color: '#22c55e' },
    { label: 'Java', color: '#ef4444' },
    { label: 'Go', color: '#06b6d4' },
    { label: 'C++ / H', color: '#a855f7' },
    { label: 'Other', color: '#64748b' },
  ], []);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);
  const connectedEdges = useMemo(() => {
    if (!selectedId) return [];
    return rawRef.current.edges.filter(e => e.source === selectedId || e.target === selectedId);
  }, [selectedId]);

  return (
    <div className="flex flex-col h-full bg-[#060910] text-white select-none">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-slate-800 bg-[#0a0e1a] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <GitFork className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dependency Graph</span>
          {stats && (
            <span className="text-[10px] text-slate-600 font-mono bg-slate-900 px-2 py-0.5 rounded-full">
              {stats.files} files · {stats.connections} connections
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files…"
              className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-7 py-1.5 text-[11px] text-slate-300 outline-none focus:border-blue-500/50 w-40 placeholder-slate-600 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-slate-500 hover:text-white transition-colors" />
              </button>
            )}
          </div>
          <button
            onClick={loadGraph}
            disabled={isLoading || !activeRepo}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
            title="Refresh graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border border-blue-500/40 animate-spin" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <GitFork className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">Building dependency graph…</span>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-8">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm font-semibold text-red-400">Graph Error</p>
            <p className="text-xs text-slate-500 max-w-xs">{error}</p>
          </div>
        ) : !activeRepo ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-8">
            <Layout className="w-12 h-12 text-slate-800" />
            <p className="text-sm font-semibold text-slate-500">Select a repository</p>
            <p className="text-xs text-slate-600">Open an indexed repo to visualize its import graph</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-8">
            <GitFork className="w-12 h-12 text-slate-800" />
            <p className="text-sm font-semibold text-slate-500">No import links detected</p>
            <p className="text-xs text-slate-600 max-w-xs">No relative imports were found between files in this repository.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={() => {
              if (selectedId) {
                setSelectedId(null);
                setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, selected: false, connected: false, dimmed: false } })));
                setEdges(es => es.map(e => ({
                  ...e, animated: false,
                  data: { ...e.data, edgeColor: getColor(e.source.split('.').pop()) },
                  markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#475569' },
                  style: { stroke: '#334155', strokeWidth: 1.5, opacity: 0.8 },
                })));
              }
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.05}
            maxZoom={3}
            attributionPosition="bottom-left"
          >
            <Controls className="!bg-slate-900/90 !border-slate-700 !rounded-xl !shadow-xl" />
            <MiniMap
              nodeColor={n => n.data?.color || '#334155'}
              maskColor="rgba(6,9,16,0.88)"
              className="!bg-slate-900/90 !border-slate-700 !rounded-xl !shadow-xl"
              nodeStrokeWidth={2}
            />
            <Background color="#1a2235" gap={28} size={1} variant="dots" />

            {/* ── Legend ── */}
            <Panel position="top-left">
              <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-sm">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Languages</p>
                <div className="flex flex-col gap-1.5">
                  {legend.map(l => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                      <span className="text-[10px] text-slate-400">{l.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Connections</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-indigo-400 rounded" />
                    <span className="text-[10px] text-slate-400">imports from</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-emerald-400 rounded" />
                    <span className="text-[10px] text-slate-400">imported by</span>
                  </div>
                </div>
              </div>
            </Panel>

            {/* ── Selected node detail panel ── */}
            {selectedNode && (
              <Panel position="bottom-center">
                <div className="bg-slate-900/98 border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-sm max-w-lg">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${selectedNode.data.color}20` }}
                    >
                      <FileCode className="w-4 h-4" style={{ color: selectedNode.data.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{selectedNode.data.label}</p>
                      <p className="text-[10px] text-slate-500 font-mono break-all">{selectedNode.data.fullPath}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedId(null);
                        setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, selected: false, connected: false, dimmed: false } })));
                        setEdges(es => es.map(e => ({
                          ...e, animated: false,
                          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#475569' },
                          style: { stroke: '#334155', strokeWidth: 1.5, opacity: 0.8 },
                        })));
                      }}
                      className="text-slate-600 hover:text-white transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Connection list */}
                  {connectedEdges.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                      {connectedEdges.map(e => {
                        const isOut = e.source === selectedId;
                        const other = isOut ? e.target : e.source;
                        const otherName = other.split('/').pop();
                        return (
                          <div key={e.id} className="flex items-center gap-1.5 text-[10px]">
                            <ArrowRight
                              className="w-3 h-3 shrink-0"
                              style={{
                                color: isOut ? '#6366f1' : '#22c55e',
                                transform: isOut ? 'none' : 'rotate(180deg)',
                              }}
                            />
                            <span className="text-slate-400 truncate font-mono" title={other}>{otherName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <ArrowRight className="w-2.5 h-2.5 text-indigo-400" />
                      {selectedNode.data.imports} outgoing
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowRight className="w-2.5 h-2.5 text-emerald-400 rotate-180" />
                      {selectedNode.data.importedBy} incoming
                    </span>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

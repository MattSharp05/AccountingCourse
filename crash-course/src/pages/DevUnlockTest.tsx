// TEMPORARY dev-only unlock-logic test harness — not linked from any UI.
// Renders map scenarios as a 2D graph and runs the REAL production
// functions (isNodeUnlocked, getPathState, buildMapConfig, validateMapConfig)
// so unlock behavior can be verified without Supabase data or auth.
// Click a checkpoint to complete/un-complete it and watch what unlocks.
import { useMemo, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { isNodeUnlocked } from '../utils/mapConfigToGameNodes';
import { mapConfigToGameNodes } from '../utils/mapConfigToGameNodes';
import { buildMapConfig, validateMapConfig } from '../utils/buildMap';
import { getPathState } from '../components/game/worldDecorator/WorldDecorator';
import type { Chapter, Checkpoint, ContentNodeData, MapConfig } from '../types/admin';

// ── Scenario definitions ────────────────────────────────
// Each scenario is defined in EDITOR terms (canvas nodes + edges) and run
// through the real buildMapConfig, exactly like hitting "Build map".

interface Scenario {
  key: string;
  label: string;
  description: string;
  expected: string;
  nodes: { id: string; title: string; chapter: string; x: number; y: number; isStart?: boolean }[];
  edges: { source: string; target: string; type?: 'prerequisite' | 'path' }[];
}

const SCENARIOS: Scenario[] = [
  {
    key: 'linear',
    label: 'Linear chain',
    description: 'A → B → C → D, all pre-req edges drawn in the right direction.',
    expected: 'Each checkpoint unlocks as soon as the previous one is completed.',
    nodes: [
      { id: 'A', title: 'A: Intro', chapter: 'ch1', x: 60, y: 140, isStart: true },
      { id: 'B', title: 'B: Basics', chapter: 'ch1', x: 240, y: 140 },
      { id: 'C', title: 'C: Practice', chapter: 'ch1', x: 420, y: 140 },
      { id: 'D', title: 'D: Quiz', chapter: 'ch1', x: 600, y: 140 },
    ],
    edges: [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
    ],
  },
  {
    key: 'reversed',
    label: 'Reversed edge (bug repro)',
    description: 'Same chain, but the B→C connection was dragged BACKWARDS (from C to B).',
    expected: 'C is unlocked from the start (nothing requires it), and B requires C — the lock points the wrong way. This is what a backwards drag does; the new arrowheads in the editor make it visible.',
    nodes: [
      { id: 'A', title: 'A: Intro', chapter: 'ch1', x: 60, y: 140, isStart: true },
      { id: 'B', title: 'B: Basics', chapter: 'ch1', x: 240, y: 140 },
      { id: 'C', title: 'C: Practice', chapter: 'ch1', x: 420, y: 140 },
      { id: 'D', title: 'D: Quiz', chapter: 'ch1', x: 600, y: 140 },
    ],
    edges: [
      { source: 'A', target: 'B' },
      { source: 'C', target: 'B' }, // drawn backwards!
      { source: 'C', target: 'D' },
    ],
  },
  {
    key: 'converge',
    label: 'Converging branches (AND)',
    description: 'A splits into B and C; both point at D.',
    expected: 'D needs BOTH B and C completed — prerequisites are AND, not OR. Complete only B and D stays locked. The map builder now warns about this on build.',
    nodes: [
      { id: 'A', title: 'A: Intro', chapter: 'ch1', x: 60, y: 140, isStart: true },
      { id: 'B', title: 'B: Debits', chapter: 'ch1', x: 280, y: 40 },
      { id: 'C', title: 'C: Credits', chapter: 'ch1', x: 280, y: 240 },
      { id: 'D', title: 'D: Exam', chapter: 'ch1', x: 520, y: 140 },
    ],
    edges: [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'D' },
      { source: 'C', target: 'D' },
    ],
  },
  {
    key: 'cycle',
    label: 'Cycle (bug repro)',
    description: 'B → C → D → B form a loop (e.g. two of the three were dragged backwards).',
    expected: 'B, C and D can NEVER unlock — each is waiting on another member of the loop. The map builder now flags this as a build warning.',
    nodes: [
      { id: 'A', title: 'A: Intro', chapter: 'ch1', x: 60, y: 140, isStart: true },
      { id: 'B', title: 'B: Basics', chapter: 'ch1', x: 260, y: 140 },
      { id: 'C', title: 'C: Practice', chapter: 'ch1', x: 440, y: 40 },
      { id: 'D', title: 'D: Review', chapter: 'ch1', x: 440, y: 240 },
    ],
    edges: [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'B' }, // closes the loop
    ],
  },
  {
    key: 'path-edges',
    label: 'Path edges (no locking)',
    description: 'A → B is a pre-req; B → C and C → D are "Path" connections (visual only).',
    expected: 'C and D are unlocked from the very start — Path edges draw a road but never lock anything. If a checkpoint should be gated, its incoming edge must be a Pre-req.',
    nodes: [
      { id: 'A', title: 'A: Intro', chapter: 'ch1', x: 60, y: 140, isStart: true },
      { id: 'B', title: 'B: Basics', chapter: 'ch1', x: 240, y: 140 },
      { id: 'C', title: 'C: Practice', chapter: 'ch1', x: 420, y: 140 },
      { id: 'D', title: 'D: Quiz', chapter: 'ch1', x: 600, y: 140 },
    ],
    edges: [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C', type: 'path' },
      { source: 'C', target: 'D', type: 'path' },
    ],
  },
  {
    key: 'chapters',
    label: 'Two chapters, auto-chain',
    description: 'Chapter 1 (A→B) and Chapter 2 (C→D) with NO connection drawn between them.',
    expected: 'The builder auto-links the closest pair (B→C) so Chapter 2 stays gated behind Chapter 1 — exactly one short link, no checkpoint-skipping paths.',
    nodes: [
      { id: 'A', title: 'A: Ch1 intro', chapter: 'ch1', x: 60, y: 140, isStart: true },
      { id: 'B', title: 'B: Ch1 wrap', chapter: 'ch1', x: 240, y: 140 },
      { id: 'C', title: 'C: Ch2 intro', chapter: 'ch2', x: 420, y: 140 },
      { id: 'D', title: 'D: Ch2 wrap', chapter: 'ch2', x: 600, y: 140 },
    ],
    edges: [
      { source: 'A', target: 'B' },
      { source: 'C', target: 'D' },
    ],
  },
];

// ── Run a scenario through the real build pipeline ──────

function buildScenario(s: Scenario): MapConfig {
  const chapterIds = [...new Set(s.nodes.map((n) => n.chapter))];
  const chapters: Chapter[] = chapterIds.map((id, i) => ({ id, mapId: 'test', title: `Chapter ${i + 1}`, order: i + 1 }));
  const checkpoints: Checkpoint[] = s.nodes.map((n, i) => ({
    id: n.id, chapterId: n.chapter, title: n.title, description: '', order: i + 1, createdAt: '',
  }));
  const rfNodes: Node<ContentNodeData>[] = s.nodes.map((n) => ({
    id: `node-${n.id}`,
    type: 'content',
    position: { x: n.x * 2, y: n.y * 2 },
    data: { checkpointId: n.id, title: n.title, isStart: n.isStart },
  }));
  const rfEdges: Edge[] = s.edges.map((e, i) => ({
    id: `e${i}`,
    source: `node-${e.source}`,
    target: `node-${e.target}`,
    type: e.type ?? 'prerequisite',
  }));
  return buildMapConfig(rfNodes, rfEdges, checkpoints, chapters);
}

const STATE_COLORS: Record<string, string> = {
  completed: '#10b981',
  available: '#f5b942',
  locked: '#4b5563',
};

// ── Component ───────────────────────────────────────────

export function DevUnlockTest() {
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key);
  const [completed, setCompleted] = useState<string[]>([]);

  const scenario = SCENARIOS.find((s) => s.key === scenarioKey)!;
  const config = useMemo(() => buildScenario(scenario), [scenario]);
  const gameNodes = useMemo(() => mapConfigToGameNodes(config.nodes), [config]);
  const warnings = useMemo(() => validateMapConfig(config), [config]);

  const posOf = (id: string) => scenario.nodes.find((n) => n.id === id)!;

  function toggle(id: string) {
    // Only allow completing unlocked checkpoints — same rule as the game.
    const unlocked = isNodeUnlocked(id, gameNodes, completed, config.startNodeId);
    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : unlocked ? [...prev, id] : prev,
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-semibold">Dev harness</p>
          <h1 className="text-lg font-bold">Checkpoint unlock logic tester</h1>
        </div>
        <div className="flex gap-2 flex-wrap" id="scenario-buttons">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => { setScenarioKey(s.key); setCompleted([]); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                s.key === scenarioKey
                  ? 'bg-brand-accent text-brand-dark border-brand-accent'
                  : 'text-[#9ca3af] border-white/15 hover:text-white hover:border-white/40'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-[#9ca3af] space-y-1 max-w-3xl">
        <p><span className="text-white font-medium">Setup:</span> {scenario.description}</p>
        <p><span className="text-brand-accent font-medium">Expected:</span> {scenario.expected}</p>
        <p className="text-xs">Click an <span className="text-amber-300">unlocked</span> checkpoint to complete it (click again to undo). Locked checkpoints can't be completed — just like in the game.</p>
      </div>

      {/* Build warnings — same validator that runs on "Build map" */}
      {warnings.length > 0 && (
        <div id="warnings" className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 max-w-3xl space-y-1">
          <p className="font-semibold uppercase tracking-[0.15em] text-amber-300">Build warnings (what the professor now sees)</p>
          {warnings.map((w, i) => <p key={i}>• {w}</p>)}
        </div>
      )}

      {/* Graph */}
      <svg viewBox="0 0 700 300" className="w-full max-w-4xl bg-white/5 rounded-2xl border border-white/10">
        {/* Edges, colored by the REAL getPathState */}
        {config.edges.map((e) => {
          const from = gameNodes.find((n) => n.id === e.source);
          const to = gameNodes.find((n) => n.id === e.target);
          if (!from || !to) return null;
          const state = getPathState({ from, to }, completed);
          const p1 = posOf(e.source);
          const p2 = posOf(e.target);
          const isAuto = e.id.startsWith('auto-chain');
          const isPath = scenario.edges.some(
            (se) => se.source === e.source && se.target === e.target && se.type === 'path',
          );
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
          return (
            <g key={e.id}>
              <line
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={STATE_COLORS[state]}
                strokeWidth={state === 'locked' ? 2 : 4}
                strokeDasharray={isPath ? '7 5' : isAuto ? '2 4' : undefined}
                opacity={state === 'locked' ? 0.5 : 1}
              />
              {/* Direction arrow */}
              <polygon
                points="-7,-5 7,0 -7,5"
                fill={STATE_COLORS[state]}
                opacity={state === 'locked' ? 0.6 : 1}
                transform={`translate(${mx},${my}) rotate(${angle})`}
              />
              {isAuto && (
                <text x={mx} y={my - 10} textAnchor="middle" fontSize="9" fill="#9ca3af">auto</text>
              )}
            </g>
          );
        })}

        {/* Nodes, colored by the REAL isNodeUnlocked */}
        {config.nodes.map((n) => {
          const isDone = completed.includes(n.id);
          const unlocked = isNodeUnlocked(n.id, gameNodes, completed, config.startNodeId);
          const state = isDone ? 'completed' : unlocked ? 'available' : 'locked';
          const p = posOf(n.id);
          const missing = n.prerequisites.filter((x) => !completed.includes(x));
          return (
            <g
              key={n.id}
              onClick={() => toggle(n.id)}
              style={{ cursor: unlocked || isDone ? 'pointer' : 'not-allowed' }}
              data-node={n.id}
              data-state={state}
            >
              <circle cx={p.x} cy={p.y} r={26} fill={STATE_COLORS[state]} opacity={state === 'locked' ? 0.45 : 1} stroke="#0b1512" strokeWidth={2} />
              {config.startNodeId === n.id && (
                <text x={p.x} y={p.y - 34} textAnchor="middle" fontSize="10" fill="#f5b942" fontWeight="bold">START</text>
              )}
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0b1512">{n.id}</text>
              <text x={p.x} y={p.y + 44} textAnchor="middle" fontSize="10" fill="#d1d5db">{n.title.split(': ')[1] ?? n.title}</text>
              <text x={p.x} y={p.y + 57} textAnchor="middle" fontSize="9" fill={state === 'locked' ? '#f87171' : '#6b7280'}>
                {state === 'locked' ? `needs ${missing.join(' + ')}` : state}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Machine-readable state for automated verification */}
      <div id="state-dump" className="text-[10px] font-mono text-[#6b7280]">
        {config.nodes.map((n) => {
          const isDone = completed.includes(n.id);
          const unlocked = isNodeUnlocked(n.id, gameNodes, completed, config.startNodeId);
          return `${n.id}=${isDone ? 'completed' : unlocked ? 'available' : 'locked'}`;
        }).join(' ')}
      </div>

      <div className="flex items-center gap-4 text-xs text-[#9ca3af]">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: STATE_COLORS.completed }} /> completed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: STATE_COLORS.available }} /> unlocked</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block opacity-50" style={{ background: STATE_COLORS.locked }} /> locked</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-dashed border-[#9ca3af]" /> path edge (no lock)</span>
        <button onClick={() => setCompleted([])} className="ml-auto px-3 py-1 rounded-full border border-white/15 hover:border-white/40">Reset progress</button>
      </div>
    </div>
  );
}

export default DevUnlockTest;

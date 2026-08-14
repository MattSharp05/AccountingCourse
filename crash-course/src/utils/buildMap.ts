import type { Node, Edge } from '@xyflow/react';
import type { ContentNodeData, MapConfig, MapConfigNode, MapConfigEdge, Checkpoint, Chapter } from '../types/admin';

const XP_PER_CHECKPOINT = 100;

export const SECTION_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16',
] as const;

// Scale factor from React Flow canvas pixels → 3D world units. Bumped
// from 0.05 to 0.08 so existing canvas layouts produce a more spread-out
// 3D world. NOTE: existing rows in `maps.map_config` already have world
// coordinates baked in at the old scale — to see the new spread on a
// previously-built map, hit "Build Map" in the editor again.
const SCALE_X = 0.08;
const SCALE_Z = 0.08;
const Y_POSITION = 0.5;

export function buildMapConfig(
  rawNodes: Node<ContentNodeData>[],
  edges: Edge[],
  checkpoints: Checkpoint[],
  chapters?: Chapter[]
): MapConfig {
  // Cards saved by the pre-checkpoint editor have no data.checkpointId.
  // Including them would emit game nodes with null ids (breaking unlock
  // checks) and a start flag that silently resolves to "no start". Exclude
  // them here; the editor warns the professor to re-add those cards.
  const nodes = rawNodes.filter((n) => !!n.data.checkpointId);
  if (nodes.length !== rawNodes.length) {
    console.warn(`[buildMap] Skipped ${rawNodes.length - nodes.length} legacy card(s) with no linked checkpoint.`);
  }

  const checkpointLookup = new Map(checkpoints.map((cp) => [cp.id, cp]));

  const chapterColorMap = new Map<string, string>();
  if (chapters && chapters.length > 0) {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    sorted.forEach((ch, i) => {
      chapterColorMap.set(ch.id, SECTION_COLORS[i % SECTION_COLORS.length]);
    });
  }

  const incomingEdges = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === 'path') continue;
    const existing = incomingEdges.get(edge.target) || [];
    existing.push(edge.source);
    incomingEdges.set(edge.target, existing);
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of nodes) {
    if (node.position.x < minX) minX = node.position.x;
    if (node.position.x > maxX) maxX = node.position.x;
    if (node.position.y < minY) minY = node.position.y;
    if (node.position.y > maxY) maxY = node.position.y;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const mapNodes: MapConfigNode[] = nodes.map((node) => {
    const data = node.data;
    const checkpoint = checkpointLookup.get(data.checkpointId);

    const worldX = (node.position.x - centerX) * SCALE_X;
    const worldZ = (node.position.y - centerY) * SCALE_Z;

    const prereqNodeIds = incomingEdges.get(node.id) || [];
    const prerequisites = prereqNodeIds
      .map((nid) => {
        const prereqNode = nodes.find((n) => n.id === nid);
        return prereqNode?.data.checkpointId;
      })
      .filter((id): id is string => !!id);

    const chapterId = checkpoint?.chapterId;
    const groupColor = chapterId ? chapterColorMap.get(chapterId) : undefined;

    return {
      id: data.checkpointId,
      checkpointId: data.checkpointId,
      // Prefer the checkpoint's current title — the canvas node copy goes
      // stale when the checkpoint is renamed after being placed.
      title: checkpoint?.title ?? data.title,
      description: checkpoint?.description || '',
      position: [worldX, Y_POSITION, worldZ] as [number, number, number],
      xpReward: XP_PER_CHECKPOINT,
      prerequisites,
      groupId: chapterId,
      groupColor,
    };
  });

  const mapEdges: MapConfigEdge[] = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    return {
      id: edge.id,
      source: sourceNode?.data.checkpointId || edge.source,
      target: targetNode?.data.checkpointId || edge.target,
    };
  });

  const startCanvasNode = nodes.find((n) => n.data.isStart);
  const startNodeId = startCanvasNode?.data.checkpointId;

  if (startNodeId) {
    const startMapNode = mapNodes.find((n) => n.id === startNodeId);
    if (startMapNode) startMapNode.prerequisites = [];
  }

  // Auto-chain chapters
  if (chapters && chapters.length > 1) {
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
    const chapterNodes = new Map<string, MapConfigNode[]>();
    for (const mn of mapNodes) {
      if (!mn.groupId) continue;
      const list = chapterNodes.get(mn.groupId) || [];
      list.push(mn);
      chapterNodes.set(mn.groupId, list);
    }

    const chapterOf = (checkpointId: string) => checkpointLookup.get(checkpointId)?.chapterId;

    for (let i = 0; i < sortedChapters.length - 1; i++) {
      const currentChId = sortedChapters[i].id;
      const nextChId = sortedChapters[i + 1].id;
      const currentNodes = chapterNodes.get(currentChId);
      const nextNodes = chapterNodes.get(nextChId);
      if (!currentNodes?.length || !nextNodes?.length) continue;

      // If the professor already drew any connection between these two
      // chapters (prerequisite or path, either direction), respect it and
      // skip the auto-chain — otherwise we draw a second, redundant path
      // that appears to skip checkpoints.
      const alreadyConnected = mapEdges.some((e) => {
        const a = chapterOf(e.source);
        const b = chapterOf(e.target);
        return (a === currentChId && b === nextChId) || (a === nextChId && b === currentChId);
      });
      if (alreadyConnected) continue;

      const hasOutgoing = new Set<string>();
      for (const mn of currentNodes) {
        for (const other of currentNodes) {
          if (other.prerequisites.includes(mn.id)) hasOutgoing.add(mn.id);
        }
      }
      const exitCandidates = currentNodes.filter((n) => !hasOutgoing.has(n.id));
      if (exitCandidates.length === 0) exitCandidates.push(currentNodes[currentNodes.length - 1]);

      const nextIds = new Set(nextNodes.map((n) => n.id));
      const hasIncoming = new Set<string>();
      for (const mn of nextNodes) {
        for (const prereq of mn.prerequisites) {
          if (nextIds.has(prereq)) hasIncoming.add(mn.id);
        }
      }
      const entryCandidates = nextNodes.filter((n) => !hasIncoming.has(n.id));
      if (entryCandidates.length === 0) entryCandidates.push(nextNodes[0]);

      // Pick the closest exit→entry pair so the auto path is a short local
      // link between neighboring checkpoints, not a long line cutting
      // across the map past other checkpoints.
      let exitNode = exitCandidates[0];
      let entryNode = entryCandidates[0];
      let bestDistSq = Infinity;
      for (const ex of exitCandidates) {
        for (const en of entryCandidates) {
          const dx = ex.position[0] - en.position[0];
          const dz = ex.position[2] - en.position[2];
          const distSq = dx * dx + dz * dz;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            exitNode = ex;
            entryNode = en;
          }
        }
      }

      if (entryNode && exitNode && !entryNode.prerequisites.includes(exitNode.id)) {
        entryNode.prerequisites.push(exitNode.id);
        const edgeId = `auto-chain-${exitNode.id}-${entryNode.id}`;
        if (!mapEdges.some((e) => e.source === exitNode.id && e.target === entryNode.id)) {
          mapEdges.push({ id: edgeId, source: exitNode.id, target: entryNode.id });
        }
      }
    }
  }

  // Strip prerequisites that don't reference a node on this map — they can
  // never be completed, which permanently locks the checkpoint. (Legacy
  // configs could contain these; current canvas edges always reference
  // placed nodes, but keep the guard so bad data can't brick a map.)
  const nodeIds = new Set(mapNodes.map((n) => n.id));
  for (const mn of mapNodes) {
    const valid = mn.prerequisites.filter((p) => nodeIds.has(p));
    if (valid.length !== mn.prerequisites.length) {
      console.warn(`[buildMap] "${mn.title}" had prerequisites referencing nodes not on the map — removed.`);
      mn.prerequisites = valid;
    }
  }

  return { nodes: mapNodes, edges: mapEdges, startNodeId, builtAt: new Date().toISOString() };
}

// ── Build-time validation ─────────────────────────────────
// Returns human-readable warnings about unlock problems the professor
// should fix before publishing: unreachable checkpoints, prerequisite
// cycles, and a missing start node. Run on the result of buildMapConfig.

export function validateMapConfig(config: MapConfig): string[] {
  const warnings: string[] = [];
  const { nodes, startNodeId } = config;
  if (nodes.length === 0) return warnings;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  if (!startNodeId) {
    warnings.push(
      'No start checkpoint set (right-click a card → "Set as start"). The game will guess where the player spawns.',
    );
  }

  // Fixpoint: a node is completable if it's the start node, has no
  // prerequisites, or all of its prerequisites are completable. Anything
  // outside the fixpoint can NEVER unlock — cycles and orphaned branches
  // both land here.
  const completable = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes) {
      if (completable.has(n.id)) continue;
      const ok =
        n.id === startNodeId ||
        n.prerequisites.length === 0 ||
        n.prerequisites.every((p) => completable.has(p) || !byId.has(p));
      if (ok) {
        completable.add(n.id);
        changed = true;
      }
    }
  }

  const stuck = nodes.filter((n) => !completable.has(n.id));
  if (stuck.length > 0) {
    // Distinguish cycles (mutual dependency) from plain blocked chains for
    // a clearer message. A stuck node whose blockers are all stuck too is
    // part of (or downstream of) a cycle.
    const stuckIds = new Set(stuck.map((n) => n.id));
    const inCycle = stuck.filter((n) =>
      n.prerequisites.some((p) => stuckIds.has(p)),
    );
    if (inCycle.length > 0) {
      warnings.push(
        `Circular prerequisites: ${inCycle.map((n) => `"${n.title}"`).join(', ')} depend on each other and can NEVER unlock. Check the arrow direction on their connections.`,
      );
    }
    const rest = stuck.filter((n) => !inCycle.includes(n));
    if (rest.length > 0) {
      warnings.push(
        `${rest.map((n) => `"${n.title}"`).join(', ')} can never unlock because of the problem above.`,
      );
    }
  }

  // Converging prerequisites are legal but often accidental — surface them.
  const converging = nodes.filter((n) => n.prerequisites.length > 1);
  for (const n of converging) {
    const names = n.prerequisites
      .map((p) => byId.get(p)?.title ?? p)
      .map((t) => `"${t}"`)
      .join(' AND ');
    warnings.push(
      `"${n.title}" requires ALL of ${names} before it unlocks. If you meant "either one", delete one of the incoming pre-req arrows (or make it a Path connection).`,
    );
  }

  return warnings;
}

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
  nodes: Node<ContentNodeData>[],
  edges: Edge[],
  checkpoints: Checkpoint[],
  chapters?: Chapter[]
): MapConfig {
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
      title: data.title,
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

    for (let i = 0; i < sortedChapters.length - 1; i++) {
      const currentChId = sortedChapters[i].id;
      const nextChId = sortedChapters[i + 1].id;
      const currentNodes = chapterNodes.get(currentChId);
      const nextNodes = chapterNodes.get(nextChId);
      if (!currentNodes?.length || !nextNodes?.length) continue;

      const hasOutgoing = new Set<string>();
      for (const mn of currentNodes) {
        for (const other of currentNodes) {
          if (other.prerequisites.includes(mn.id)) hasOutgoing.add(mn.id);
        }
      }
      const terminalNodes = currentNodes.filter((n) => !hasOutgoing.has(n.id));
      const exitNode = terminalNodes.length > 0 ? terminalNodes[terminalNodes.length - 1] : currentNodes[currentNodes.length - 1];

      const nextIds = new Set(nextNodes.map((n) => n.id));
      const hasIncoming = new Set<string>();
      for (const mn of nextNodes) {
        for (const prereq of mn.prerequisites) {
          if (nextIds.has(prereq)) hasIncoming.add(mn.id);
        }
      }
      const entryNodes = nextNodes.filter((n) => !hasIncoming.has(n.id));
      const entryNode = entryNodes.length > 0 ? entryNodes[0] : nextNodes[0];

      if (entryNode && exitNode && !entryNode.prerequisites.includes(exitNode.id)) {
        entryNode.prerequisites.push(exitNode.id);
        const edgeId = `auto-chain-${exitNode.id}-${entryNode.id}`;
        if (!mapEdges.some((e) => e.source === exitNode.id && e.target === entryNode.id)) {
          mapEdges.push({ id: edgeId, source: exitNode.id, target: entryNode.id });
        }
      }
    }
  }

  return { nodes: mapNodes, edges: mapEdges, startNodeId, builtAt: new Date().toISOString() };
}

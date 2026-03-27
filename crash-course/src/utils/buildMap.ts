import type { Node, Edge } from '@xyflow/react';
import type { ContentNodeData, MapConfig, MapConfigNode, MapConfigEdge, ContentItem, Chapter } from '../types/admin';

// XP rewards by content type
const XP_BY_TYPE: Record<string, number> = {
  video: 100,
  pdf: 75,
  text: 50,
  file: 50,
  quiz: 200,
};

// Color palette for section grouping — distinct, vibrant colors
export const SECTION_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#84cc16', // Lime
] as const;

// Scale factor to convert 2D canvas coordinates to 3D world coordinates
const SCALE_X = 0.05;
const SCALE_Z = 0.05; // positive so canvas layout maps to screen layout (camera at +Z looks toward -Z)
const Y_POSITION = 0.5; // fixed Y height for all nodes in the 3D world

/**
 * Converts a React Flow canvas graph into a 3D map configuration
 * that the GameMap component can render.
 *
 * Canvas X → 3D X (scaled down)
 * Canvas Y → 3D Z (scaled down, inverted)
 * All nodes sit at Y=0.5 in 3D space
 *
 * When chapters are provided, nodes are assigned groupId and groupColor
 * based on which chapter their content item belongs to.
 */
export function buildMapConfig(
  nodes: Node<ContentNodeData>[],
  edges: Edge[],
  contentItems: ContentItem[],
  chapters?: Chapter[]
): MapConfig {
  // Build a lookup for content items
  const itemLookup = new Map(contentItems.map((ci) => [ci.id, ci]));

  // Build chapter color mapping (sorted by chapter order)
  const chapterColorMap = new Map<string, string>();
  if (chapters && chapters.length > 0) {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    sorted.forEach((ch, i) => {
      chapterColorMap.set(ch.id, SECTION_COLORS[i % SECTION_COLORS.length]);
    });
  }

  // Build adjacency: all edges are prerequisites unless explicitly marked as "path"
  const incomingEdges = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === 'path') continue;
    const existing = incomingEdges.get(edge.target) || [];
    existing.push(edge.source);
    incomingEdges.set(edge.target, existing);
  }

  // Center the canvas positions around origin
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const x = node.position.x;
    const y = node.position.y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Convert nodes
  const mapNodes: MapConfigNode[] = nodes.map((node) => {
    const data = node.data;
    const contentItem = itemLookup.get(data.contentItemId);

    // Convert 2D canvas position to 3D world position (centered)
    const worldX = (node.position.x - centerX) * SCALE_X;
    const worldZ = (node.position.y - centerY) * SCALE_Z;

    // Find prerequisite node IDs by mapping edge sources back to contentItemIds
    const prereqNodeIds = incomingEdges.get(node.id) || [];
    const prerequisites = prereqNodeIds
      .map((nid) => {
        const prereqNode = nodes.find((n) => n.id === nid);
        return prereqNode?.data.contentItemId;
      })
      .filter((id): id is string => !!id);

    // Resolve group (chapter) color
    const chapterId = contentItem?.chapterId;
    const groupColor = chapterId ? chapterColorMap.get(chapterId) : undefined;

    return {
      id: data.contentItemId,
      contentItemId: data.contentItemId,
      type: data.type,
      title: data.title,
      description: contentItem?.description || '',
      position: [worldX, Y_POSITION, worldZ] as [number, number, number],
      xpReward: XP_BY_TYPE[data.type] || 50,
      prerequisites,
      groupId: chapterId,
      groupColor,
    };
  });

  // Convert edges
  const mapEdges: MapConfigEdge[] = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    return {
      id: edge.id,
      source: sourceNode?.data.contentItemId || edge.source,
      target: targetNode?.data.contentItemId || edge.target,
    };
  });

  // Find the start node (the one with isStart flag, or fall back to first node with no prerequisites)
  const startCanvasNode = nodes.find((n) => n.data.isStart);
  const startNodeId = startCanvasNode?.data.contentItemId;

  // The start node must have no prerequisites — clear any incoming edges
  if (startNodeId) {
    const startMapNode = mapNodes.find((n) => n.id === startNodeId);
    if (startMapNode) {
      startMapNode.prerequisites = [];
    }
  }

  // ── Auto-chain chapters ──────────────────────────────────
  // For each consecutive pair of chapters (sorted by order), link the last
  // node of chapter N → first node of chapter N+1 as a prerequisite.
  // This ensures completing all of chapter N unlocks the start of chapter N+1.
  if (chapters && chapters.length > 1) {
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

    // Group map nodes by chapter (groupId)
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

      // Find terminal nodes in current chapter (nodes with no outgoing
      // prerequisite edges to other nodes in the same chapter)
      const currentIds = new Set(currentNodes.map((n) => n.id));
      void currentIds;
      const hasOutgoing = new Set<string>();
      for (const mn of currentNodes) {
        // Check if any other node in this chapter lists mn as a prerequisite
        for (const other of currentNodes) {
          if (other.prerequisites.includes(mn.id)) {
            hasOutgoing.add(mn.id);
          }
        }
      }
      const terminalNodes = currentNodes.filter((n) => !hasOutgoing.has(n.id));
      // Use the last terminal node (or last node) as the chapter exit
      const exitNode = terminalNodes.length > 0 ? terminalNodes[terminalNodes.length - 1] : currentNodes[currentNodes.length - 1];

      // Find entry nodes in next chapter (nodes with no incoming
      // prerequisite edges from other nodes in the same chapter)
      const nextIds = new Set(nextNodes.map((n) => n.id));
      const hasIncoming = new Set<string>();
      for (const mn of nextNodes) {
        for (const prereq of mn.prerequisites) {
          if (nextIds.has(prereq)) {
            hasIncoming.add(mn.id);
          }
        }
      }
      const entryNodes = nextNodes.filter((n) => !hasIncoming.has(n.id));
      const entryNode = entryNodes.length > 0 ? entryNodes[0] : nextNodes[0];

      // Add cross-chapter prerequisite if not already present
      if (entryNode && exitNode && !entryNode.prerequisites.includes(exitNode.id)) {
        entryNode.prerequisites.push(exitNode.id);

        // Also add a visual edge for the path renderer
        const edgeId = `auto-chain-${exitNode.id}-${entryNode.id}`;
        if (!mapEdges.some((e) => e.source === exitNode.id && e.target === entryNode.id)) {
          mapEdges.push({ id: edgeId, source: exitNode.id, target: entryNode.id });
        }
      }
    }
  }

  return {
    nodes: mapNodes,
    edges: mapEdges,
    startNodeId,
    builtAt: new Date().toISOString(),
  };
}

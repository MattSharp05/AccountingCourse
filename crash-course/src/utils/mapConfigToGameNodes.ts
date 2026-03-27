import type { MapConfigNode } from '../types/admin';
import type { ContentNode, ContentType } from '../types/game';

const ADMIN_TO_GAME_TYPE: Record<string, ContentType> = {
  video: 'video',
  pdf: 'reading',
  text: 'reading',
  file: 'exercise',
  quiz: 'quiz-boss',
};

export function mapConfigNodeToGameNode(node: MapConfigNode): ContentNode {
  return {
    id: node.contentItemId,
    type: ADMIN_TO_GAME_TYPE[node.type] || 'reading',
    title: node.title,
    description: node.description,
    position: node.position,
    prerequisites: node.prerequisites,
    xpReward: node.xpReward,
    moduleId: 0,
    groupId: node.groupId,
    groupColor: node.groupColor,
  };
}

export function mapConfigToGameNodes(nodes: MapConfigNode[]): ContentNode[] {
  return nodes.map(mapConfigNodeToGameNode);
}

/**
 * Generic version of isNodeUnlocked — works with any node array.
 * If startNodeId is provided, that node is always unlocked.
 */
export function isNodeUnlocked(
  nodeId: string,
  nodes: ContentNode[],
  completedNodes: string[],
  startNodeId?: string,
): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  // Explicit start node is always unlocked
  if (startNodeId && nodeId === startNodeId) return true;
  // Nodes with no prerequisites are always unlocked.
  // Chapter-first auto-unlock is prevented at build time via auto-chaining
  // (buildMapConfig adds cross-chapter prerequisite edges).
  if (node.prerequisites.length === 0) return true;
  return node.prerequisites.every((prereqId) => completedNodes.includes(prereqId));
}

/**
 * Calculate progress percentage for a set of nodes.
 */
export function getMapProgress(nodes: ContentNode[], completedNodes: string[]): number {
  if (nodes.length === 0) return 0;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const completed = completedNodes.filter((id) => nodeIds.has(id));
  return Math.round((completed.length / nodes.length) * 100);
}

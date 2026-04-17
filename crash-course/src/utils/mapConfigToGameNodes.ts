import type { MapConfigNode } from '../types/admin';
import type { ContentNode } from '../types/game';

export function mapConfigNodeToGameNode(node: MapConfigNode): ContentNode {
  return {
    id: node.checkpointId,
    type: 'reading', // checkpoint type is determined by its content items at runtime
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

export function isNodeUnlocked(
  nodeId: string,
  nodes: ContentNode[],
  completedNodes: string[],
  startNodeId?: string,
): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  if (startNodeId && nodeId === startNodeId) return true;
  if (node.prerequisites.length === 0) return true;
  return node.prerequisites.every((prereqId) => completedNodes.includes(prereqId));
}

export function getMapProgress(nodes: ContentNode[], completedNodes: string[]): number {
  if (nodes.length === 0) return 0;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const completed = completedNodes.filter((id) => nodeIds.has(id));
  return Math.round((completed.length / nodes.length) * 100);
}

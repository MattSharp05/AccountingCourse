import type { ContentNode } from '../../types/game';

// Module 1: Introduction to Financial Statements
// 8 content nodes arranged in a learning path

export const MODULE_1_NODES: ContentNode[] = [
  {
    id: 'm1-welcome',
    type: 'video',
    title: 'Welcome to Financial Statements',
    description: 'Introduction to the course and what you will learn',
    position: [-5, 0.5, -5],
    prerequisites: [], // First node, no prerequisites
    xpReward: 50,
    moduleId: 1,
  },
  {
    id: 'm1-what-are-fs',
    type: 'reading',
    title: 'What Are Financial Statements?',
    description: 'Overview of the three main financial statements and their purposes',
    position: [-2, 0.5, -3],
    prerequisites: ['m1-welcome'],
    xpReward: 75,
    moduleId: 1,
  },
  {
    id: 'm1-balance-sheet-intro',
    type: 'video',
    title: 'The Balance Sheet',
    description: 'Learn about assets, liabilities, and equity',
    position: [2, 0.5, -4],
    prerequisites: ['m1-what-are-fs'],
    xpReward: 100,
    moduleId: 1,
  },
  {
    id: 'm1-balance-sheet-exercise',
    type: 'exercise',
    title: 'Balance Sheet Practice',
    description: 'Practice identifying balance sheet items',
    position: [5, 0.5, -2],
    prerequisites: ['m1-balance-sheet-intro'],
    xpReward: 100,
    moduleId: 1,
  },
  {
    id: 'm1-income-statement',
    type: 'reading',
    title: 'The Income Statement',
    description: 'Understanding revenue, expenses, and net income',
    position: [3, 0.5, 2],
    prerequisites: ['m1-balance-sheet-exercise'],
    xpReward: 100,
    moduleId: 1,
  },
  {
    id: 'm1-quiz-checkpoint',
    type: 'quiz-boss',
    title: 'Quiz Boss: Balance & Income',
    description: 'Test your knowledge of balance sheets and income statements',
    position: [-1, 0.5, 4],
    prerequisites: ['m1-income-statement'],
    xpReward: 200,
    moduleId: 1,
  },
  {
    id: 'm1-cash-flow',
    type: 'video',
    title: 'The Cash Flow Statement',
    description: 'Operating, investing, and financing activities',
    position: [-4, 0.5, 3],
    prerequisites: ['m1-quiz-checkpoint'],
    xpReward: 100,
    moduleId: 1,
  },
  {
    id: 'm1-final-boss',
    type: 'quiz-boss',
    title: 'Module 1 Boss: Financial Foundations',
    description: 'Defeat this boss to complete Module 1!',
    position: [0, 0.5, 7],
    prerequisites: ['m1-cash-flow'],
    xpReward: 500,
    moduleId: 1,
  },
];

// Helper function to check if a node is unlocked
export function isNodeUnlocked(
  nodeId: string,
  completedNodes: string[]
): boolean {
  const node = MODULE_1_NODES.find((n) => n.id === nodeId);
  if (!node) return false;

  // No prerequisites means it's always unlocked
  if (node.prerequisites.length === 0) return true;

  // All prerequisites must be completed
  return node.prerequisites.every((prereqId) =>
    completedNodes.includes(prereqId)
  );
}

// Get total XP for completing Module 1
export function getModule1TotalXp(): number {
  return MODULE_1_NODES.reduce((sum, node) => sum + node.xpReward, 0);
}

// Get progress percentage
export function getModule1Progress(completedNodes: string[]): number {
  const moduleNodeIds = MODULE_1_NODES.map((n) => n.id);
  const completed = completedNodes.filter((id) => moduleNodeIds.includes(id));
  return Math.round((completed.length / MODULE_1_NODES.length) * 100);
}

import type { BattleQuestion } from '../../components/quiz';

// Quiz Checkpoint: Balance & Income
export const QUIZ_CHECKPOINT_QUESTIONS: BattleQuestion[] = [
  {
    id: 'qc1',
    question: 'What is the fundamental accounting equation?',
    options: [
      'Assets = Liabilities + Equity',
      'Revenue = Expenses + Profit',
      'Cash = Income - Expenses',
      'Assets = Revenue - Liabilities'
    ],
    correctAnswer: 0,
    explanation: 'The fundamental accounting equation is Assets = Liabilities + Equity. This equation must always balance and forms the basis of the balance sheet.',
    difficulty: 'easy',
    topic: 'balance-sheet'
  },
  {
    id: 'qc2',
    question: 'Which of the following is classified as a current asset?',
    options: [
      'Building',
      'Accounts Receivable',
      'Long-term investments',
      'Equipment'
    ],
    correctAnswer: 1,
    explanation: 'Accounts Receivable is a current asset because it represents money owed to the company that will be collected within one year. Buildings and equipment are fixed assets.',
    difficulty: 'easy',
    topic: 'balance-sheet'
  },
  {
    id: 'qc3',
    question: 'Net Income is calculated as:',
    options: [
      'Total Assets - Total Liabilities',
      'Revenue - Cost of Goods Sold',
      'Revenue - All Expenses',
      'Gross Profit - Cost of Goods Sold'
    ],
    correctAnswer: 2,
    explanation: 'Net Income (the "bottom line") is calculated by subtracting all expenses from revenue. This includes COGS, operating expenses, interest, and taxes.',
    difficulty: 'medium',
    topic: 'income-statement'
  },
  {
    id: 'qc4',
    question: 'A company has $100,000 in revenue and $60,000 in COGS. What is the gross profit margin?',
    options: [
      '60%',
      '40%',
      '100%',
      '166%'
    ],
    correctAnswer: 1,
    explanation: 'Gross Profit = Revenue - COGS = $100,000 - $60,000 = $40,000. Gross Profit Margin = $40,000 / $100,000 = 40%',
    difficulty: 'medium',
    topic: 'income-statement'
  },
  {
    id: 'qc5',
    question: 'Which financial statement shows a company\'s financial position at a specific point in time?',
    options: [
      'Income Statement',
      'Cash Flow Statement',
      'Balance Sheet',
      'Statement of Changes in Equity'
    ],
    correctAnswer: 2,
    explanation: 'The Balance Sheet is a "snapshot" showing assets, liabilities, and equity at a specific date. The Income Statement covers a period of time.',
    difficulty: 'easy',
    topic: 'financial-statements'
  },
  {
    id: 'qc6',
    question: 'If a company takes out a $50,000 loan, how does this affect the balance sheet?',
    options: [
      'Assets increase, Liabilities decrease',
      'Assets increase, Liabilities increase',
      'Assets decrease, Equity increases',
      'Liabilities increase, Equity decreases'
    ],
    correctAnswer: 1,
    explanation: 'Taking a loan increases Cash (an asset) and increases Notes Payable (a liability). The equation stays balanced: both sides increase by $50,000.',
    difficulty: 'medium',
    topic: 'balance-sheet'
  },
  {
    id: 'qc7',
    question: 'What is "retained earnings"?',
    options: [
      'Money held in the bank',
      'Accumulated profits not distributed as dividends',
      'Revenue earned but not yet received',
      'Expenses paid in advance'
    ],
    correctAnswer: 1,
    explanation: 'Retained Earnings represents the cumulative net income that has been kept in the business rather than distributed to shareholders as dividends.',
    difficulty: 'hard',
    topic: 'balance-sheet'
  },
  {
    id: 'qc8',
    question: 'Operating expenses include all of the following EXCEPT:',
    options: [
      'Rent',
      'Salaries',
      'Cost of raw materials',
      'Advertising'
    ],
    correctAnswer: 2,
    explanation: 'Cost of raw materials is part of Cost of Goods Sold (COGS), not operating expenses. Operating expenses are costs not directly tied to production.',
    difficulty: 'medium',
    topic: 'income-statement'
  }
];

// Final Boss: Financial Foundations
export const FINAL_BOSS_QUESTIONS: BattleQuestion[] = [
  {
    id: 'fb1',
    question: 'A company has Assets of $500,000 and Liabilities of $300,000. What is the Equity?',
    options: [
      '$800,000',
      '$200,000',
      '$500,000',
      '$300,000'
    ],
    correctAnswer: 1,
    explanation: 'Using the accounting equation: Equity = Assets - Liabilities = $500,000 - $300,000 = $200,000',
    difficulty: 'easy',
    topic: 'balance-sheet'
  },
  {
    id: 'fb2',
    question: 'Which item would appear on the Cash Flow Statement?',
    options: [
      'Depreciation expense',
      'Accounts receivable balance',
      'Cash paid for equipment',
      'Gross profit margin'
    ],
    correctAnswer: 2,
    explanation: 'Cash paid for equipment is an investing activity that appears on the Cash Flow Statement. It represents an actual cash outflow.',
    difficulty: 'medium',
    topic: 'cash-flow'
  },
  {
    id: 'fb3',
    question: 'What are the three sections of the Cash Flow Statement?',
    options: [
      'Assets, Liabilities, Equity',
      'Revenue, Expenses, Profit',
      'Operating, Investing, Financing',
      'Current, Fixed, Intangible'
    ],
    correctAnswer: 2,
    explanation: 'The Cash Flow Statement is divided into Operating (day-to-day), Investing (buying/selling assets), and Financing (loans, stock, dividends) activities.',
    difficulty: 'easy',
    topic: 'cash-flow'
  },
  {
    id: 'fb4',
    question: 'A company shows positive net income but negative cash flow. This could happen because:',
    options: [
      'They sold a lot on credit (accounts receivable increased)',
      'They paid off all their debt',
      'Their expenses were too low',
      'This is impossible'
    ],
    correctAnswer: 0,
    explanation: 'Revenue is recognized when earned, not when cash is received. High credit sales increase net income but delay cash collection.',
    difficulty: 'hard',
    topic: 'cash-flow'
  },
  {
    id: 'fb5',
    question: 'EBITDA stands for:',
    options: [
      'Earnings Before Interest, Taxes, Depreciation, and Amortization',
      'Equity Before Income, Taxes, Debt, and Assets',
      'Earnings By Internal Trading, Dividends, and Adjustments',
      'Expenses Before Interest, Taxes, and Dividends Accrued'
    ],
    correctAnswer: 0,
    explanation: 'EBITDA = Earnings Before Interest, Taxes, Depreciation, and Amortization. It\'s a measure of operating performance.',
    difficulty: 'medium',
    topic: 'income-statement'
  },
  {
    id: 'fb6',
    question: 'Depreciation is:',
    options: [
      'The increase in value of an asset over time',
      'The systematic allocation of an asset\'s cost over its useful life',
      'The interest paid on borrowed money',
      'The decrease in cash due to expenses'
    ],
    correctAnswer: 1,
    explanation: 'Depreciation spreads the cost of a fixed asset over its useful life. It\'s a non-cash expense that reduces net income but doesn\'t affect cash.',
    difficulty: 'medium',
    topic: 'income-statement'
  },
  {
    id: 'fb7',
    question: 'If total liabilities increase and equity stays the same, what happens to assets?',
    options: [
      'Assets decrease',
      'Assets stay the same',
      'Assets increase',
      'Cannot be determined'
    ],
    correctAnswer: 2,
    explanation: 'From A = L + E: if L increases and E stays constant, A must increase to keep the equation balanced.',
    difficulty: 'medium',
    topic: 'balance-sheet'
  },
  {
    id: 'fb8',
    question: 'Which ratio measures a company\'s ability to pay short-term obligations?',
    options: [
      'Debt-to-Equity ratio',
      'Current ratio',
      'Profit margin',
      'Return on equity'
    ],
    correctAnswer: 1,
    explanation: 'Current Ratio = Current Assets / Current Liabilities. It measures liquidity - the ability to pay short-term debts.',
    difficulty: 'hard',
    topic: 'ratios'
  },
  {
    id: 'fb9',
    question: 'When a company issues stock to investors, this appears as:',
    options: [
      'An increase in revenue',
      'An increase in liabilities',
      'An increase in equity',
      'A decrease in assets'
    ],
    correctAnswer: 2,
    explanation: 'Issuing stock increases equity (specifically common stock/paid-in capital). It also increases cash (assets), keeping the equation balanced.',
    difficulty: 'easy',
    topic: 'balance-sheet'
  },
  {
    id: 'fb10',
    question: 'The "bottom line" refers to:',
    options: [
      'Total assets',
      'Gross profit',
      'Net income',
      'Total equity'
    ],
    correctAnswer: 2,
    explanation: 'Net Income is called the "bottom line" because it appears at the bottom of the income statement after all expenses are subtracted from revenue.',
    difficulty: 'easy',
    topic: 'income-statement'
  }
];

// Get questions for a specific boss
export function getQuizQuestions(nodeId: string): BattleQuestion[] {
  switch (nodeId) {
    case 'm1-quiz-checkpoint':
      return QUIZ_CHECKPOINT_QUESTIONS;
    case 'm1-final-boss':
      return FINAL_BOSS_QUESTIONS;
    default:
      return [];
  }
}

// Get boss configuration
export interface BossConfig {
  name: string;
  emoji: string;
  passingScore: number;
}

export function getBossConfig(nodeId: string): BossConfig {
  switch (nodeId) {
    case 'm1-quiz-checkpoint':
      return {
        name: 'Quiz Boss: Balance & Income',
        emoji: '🧙‍♂️',
        passingScore: 70,
      };
    case 'm1-final-boss':
      return {
        name: 'Financial Foundations Boss',
        emoji: '🐉',
        passingScore: 70,
      };
    default:
      return {
        name: 'Quiz Boss',
        emoji: '👾',
        passingScore: 70,
      };
  }
}

// Module 1 Content Data
// Contains reading content, exercise questions, and metadata for each node

export interface NodeContent {
  nodeId: string;
  readingContent?: string;
  estimatedReadTime?: number;
  exerciseQuestions?: ExerciseQuestion[];
  exerciseInstructions?: string;
}

export interface ExerciseQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'fill-blank';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

export const MODULE_1_CONTENT: Record<string, NodeContent> = {
  'm1-welcome': {
    nodeId: 'm1-welcome',
    // Video content - no reading or exercises
  },

  'm1-what-are-fs': {
    nodeId: 'm1-what-are-fs',
    estimatedReadTime: 5,
    readingContent: `# What Are Financial Statements?

Financial statements are **formal records** that document the financial activities and position of a business, organization, or individual. They serve as a window into the financial health of any entity.

## The Three Core Financial Statements

Every company prepares three primary financial statements:

### 1. The Balance Sheet
The balance sheet shows what a company **owns** (assets) and what it **owes** (liabilities), along with the **owner's stake** (equity) at a specific point in time. Think of it as a financial snapshot.

> **Key Equation:** Assets = Liabilities + Equity

### 2. The Income Statement
Also called the **Profit & Loss Statement**, this shows how much money a company earned (revenue) and spent (expenses) over a period of time. The difference is either profit or loss.

> **Key Equation:** Net Income = Revenue - Expenses

### 3. The Cash Flow Statement
This tracks the **actual movement of cash** in and out of the business. It's divided into three categories:
- Operating activities (day-to-day business)
- Investing activities (buying/selling assets)
- Financing activities (loans, stock, dividends)

## Why Do Financial Statements Matter?

Financial statements help answer critical questions:

- Is the company making money?
- Can it pay its bills?
- How is it using investor money?
- Is it growing or shrinking?

**Investors**, **creditors**, **managers**, and **regulators** all rely on these statements to make informed decisions.

## Key Takeaways

- Financial statements provide a standardized way to communicate financial information
- The three main statements work together to tell a complete story
- Understanding them is essential for making smart business and investment decisions
`,
  },

  'm1-balance-sheet-intro': {
    nodeId: 'm1-balance-sheet-intro',
    // Video content
  },

  'm1-balance-sheet-exercise': {
    nodeId: 'm1-balance-sheet-exercise',
    exerciseInstructions: 'Classify each item as an Asset, Liability, or Equity. Think about whether the item represents something the company owns, owes, or belongs to shareholders.',
    exerciseQuestions: [
      {
        id: 'ex1-q1',
        question: 'A company owns a delivery truck worth $25,000. How should this be classified?',
        type: 'multiple-choice',
        options: ['Asset', 'Liability', 'Equity', 'Expense'],
        correctAnswer: 0,
        explanation: 'A delivery truck is an Asset because it\'s something the company owns that has value. Specifically, it\'s a Fixed Asset or Property, Plant & Equipment (PPE).',
      },
      {
        id: 'ex1-q2',
        question: 'The company took out a $50,000 bank loan to expand. How is this classified?',
        type: 'multiple-choice',
        options: ['Asset', 'Liability', 'Equity', 'Revenue'],
        correctAnswer: 1,
        explanation: 'A bank loan is a Liability because it represents money the company owes to the bank. It must be repaid in the future.',
      },
      {
        id: 'ex1-q3',
        question: 'Shareholders invested $100,000 into the company. This is classified as:',
        type: 'multiple-choice',
        options: ['Asset', 'Liability', 'Equity', 'Expense'],
        correctAnswer: 2,
        explanation: 'Shareholder investment is Equity (specifically, Common Stock or Paid-in Capital). It represents the owners\' stake in the company.',
      },
      {
        id: 'ex1-q4',
        question: 'The company has $15,000 in its bank account. This is:',
        type: 'multiple-choice',
        options: ['Cash (Asset)', 'Accounts Payable (Liability)', 'Retained Earnings (Equity)', 'None of the above'],
        correctAnswer: 0,
        explanation: 'Money in a bank account is Cash, which is an Asset. It\'s usually listed first on the balance sheet as a Current Asset.',
      },
      {
        id: 'ex1-q5',
        question: 'The company owes suppliers $8,000 for inventory purchased on credit. This is:',
        type: 'multiple-choice',
        options: ['Inventory (Asset)', 'Accounts Payable (Liability)', 'Accounts Receivable (Asset)', 'Equity'],
        correctAnswer: 1,
        explanation: 'Money owed to suppliers is Accounts Payable, which is a Liability. It represents a short-term obligation to pay for goods received.',
      },
    ],
  },

  'm1-income-statement': {
    nodeId: 'm1-income-statement',
    estimatedReadTime: 6,
    readingContent: `# The Income Statement

The Income Statement, also known as the **Profit and Loss Statement (P&L)**, tells you whether a company made or lost money during a specific period.

## The Basic Structure

The income statement follows a simple flow:

\`\`\`
Revenue (Sales)
- Cost of Goods Sold (COGS)
= Gross Profit
- Operating Expenses
= Operating Income
- Interest & Taxes
= Net Income
\`\`\`

## Key Components

### Revenue (The Top Line)
This is the total amount of money earned from selling products or services. It's called the "top line" because it appears first.

> **Example:** A coffee shop's revenue is all the money received from selling coffee and pastries.

### Cost of Goods Sold (COGS)
These are the **direct costs** of making the products or services sold. For a manufacturer, this includes raw materials and labor.

### Gross Profit
This is Revenue minus COGS. It shows how much money is left after covering the cost of what was sold.

> **Gross Profit = Revenue - COGS**

### Operating Expenses
These are the costs of running the business that aren't directly tied to production:
- **Rent** and utilities
- **Salaries** for office staff
- **Marketing** and advertising
- **Depreciation** on equipment

### Operating Income
Also called **EBIT** (Earnings Before Interest and Taxes), this shows profit from core operations.

### Net Income (The Bottom Line)
After subtracting interest expenses and taxes, you get **Net Income** — the final profit or loss. This is the "bottom line."

## Important Ratios

### Gross Profit Margin
\`Gross Profit / Revenue × 100\`

Shows what percentage of sales is left after covering production costs.

### Net Profit Margin
\`Net Income / Revenue × 100\`

Shows what percentage of each dollar of sales becomes profit.

## Key Takeaways

- Revenue is not the same as profit!
- The income statement covers a **period of time** (month, quarter, year)
- Watch both the top line (revenue) and bottom line (net income)
- Profit margins help compare companies of different sizes
`,
  },

  'm1-quiz-checkpoint': {
    nodeId: 'm1-quiz-checkpoint',
    // Quiz boss content will be handled by the quiz system
  },

  'm1-cash-flow': {
    nodeId: 'm1-cash-flow',
    // Video content
  },

  'm1-final-boss': {
    nodeId: 'm1-final-boss',
    // Final quiz boss
  },
};

// Get content for a specific node
export function getNodeContent(nodeId: string): NodeContent | undefined {
  return MODULE_1_CONTENT[nodeId];
}

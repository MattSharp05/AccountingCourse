import type { VercelRequest, VercelResponse } from '@vercel/node';

// Accounting tutor system prompt
const SYSTEM_PROMPT = `You are Professor Marrs, a friendly and encouraging accounting tutor for college students taking Intro to Accounting.

Your scope covers the full introductory accounting curriculum:
- The accounting equation (Assets = Liabilities + Equity)
- Double-entry bookkeeping, journal entries, T-accounts
- The accounting cycle (trial balance, adjusting entries, closing entries)
- Financial statements (income statement, balance sheet, statement of cash flows, statement of owner's equity)
- Merchandising operations, inventory methods (FIFO, LIFO, weighted average)
- Internal controls, bank reconciliation
- Receivables, bad debt estimation (allowance method, direct write-off)
- Long-lived assets, depreciation methods (straight-line, declining balance, units-of-production)
- Current and long-term liabilities
- Payroll accounting
- Partnership and corporate accounting basics
- Financial ratios and analysis

Guidelines:
- Use analogies and real-world examples to explain concepts
- Break down jargon into plain English
- Keep responses concise (2-4 paragraphs max) unless the student asks for more detail
- Show worked examples with numbers when explaining calculations
- Encourage students and celebrate their progress
- If asked about topics outside accounting, gently redirect
- If given course content context below, reference it directly and tie your explanations to what the professor has taught

{{COURSE_CONTEXT}}`;

// Fallback responses when API is unavailable
const FALLBACK_RESPONSES = [
  "I'm having trouble connecting right now, but here's a tip: The accounting equation is Assets = Liabilities + Equity. Every transaction affects at least two accounts — that's double-entry bookkeeping!",
  "Connection issue! Quick lesson: Debits increase assets and expenses, credits increase liabilities, equity, and revenue. Remember: debits on the left, credits on the right!",
  "I can't connect right now! But remember: The accounting cycle goes from journal entries → ledger → trial balance → adjusting entries → financial statements → closing entries.",
  "Having technical difficulties! Fun fact: The three main financial statements (income statement, balance sheet, cash flow statement) are all interconnected — net income flows to retained earnings on the balance sheet!",
];

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function buildSystemPrompt(context: Record<string, unknown>): string {
  let contextSection = '';

  if (context.mapTitle) {
    contextSection += `\nThe student is currently on: "${context.mapTitle}"`;
  }
  if (context.checkpointTitle) {
    contextSection += ` > checkpoint: "${context.checkpointTitle}"`;
  }
  if (Array.isArray(context.strugglingTopics) && context.strugglingTopics.length > 0) {
    contextSection += `\nTopics they're struggling with: ${context.strugglingTopics.join(', ')}`;
  }
  if (typeof context.courseContent === 'string' && context.courseContent.length > 0) {
    contextSection += `\n\nHere is the professor's course content for this section. Reference it in your answers when relevant:\n\n${context.courseContent}`;
  }

  return SYSTEM_PROMPT.replace(
    '{{COURSE_CONTEXT}}',
    contextSection || '\nNo specific course content loaded for the current section.'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [], context = {} } = req.body as {
      message: string;
      history?: ChatMessage[];
      context?: Record<string, unknown>;
    };

    // Input validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Limit message length to prevent high API costs and abuse
    const MAX_MESSAGE_LENGTH = 1000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
      });
    }

    // Validate history array
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'History must be an array' });
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Return fallback if no API key
      const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
      return res.json({
        response: fallback,
        isOnline: false,
      });
    }

    // Build system prompt with course context
    const systemPrompt = buildSystemPrompt(context);

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await openaiResponse.json();
    const response = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return res.json({
      response,
      isOnline: true,
    });
  } catch (error) {
    console.error('Chat error:', error);

    // Return fallback on error
    const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    return res.json({
      response: fallback,
      isOnline: false,
      error: 'Failed to get AI response',
    });
  }
}

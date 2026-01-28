import type { VercelRequest, VercelResponse } from '@vercel/node';

// Financial tutor system prompt
const SYSTEM_PROMPT = `You are a friendly and encouraging financial statements tutor for beginners. Your name is Professor Penny.

Your role:
- Help students understand financial statements (balance sheet, income statement, cash flow statement)
- Explain accounting concepts in simple, relatable terms
- Use real-world examples when possible
- Encourage students and celebrate their progress
- Keep responses concise but educational

Guidelines:
- Use analogies to explain complex concepts
- Break down jargon into plain English
- Stay focused on financial statements topics
- Be patient and supportive with beginners`;

// Fallback responses when API is unavailable
const FALLBACK_RESPONSES = [
  "I'm having trouble connecting right now, but let me share a tip: The balance sheet shows what a company owns (assets), owes (liabilities), and the owner's stake (equity). Assets = Liabilities + Equity! 📊",
  "Connection issue! Here's a quick lesson: Revenue is the 'top line' of an income statement - it's money earned from selling products or services. Net income is the 'bottom line' - what's left after all expenses! 💰",
  "I can't connect to my brain right now! But remember: Cash flow is king! A company can show profit but still run out of cash if customers don't pay on time. 🏦",
  "Having technical difficulties! Fun fact: The three financial statements are interconnected - they tell a complete story about a company's financial health! 🔗",
];

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
    const { message, history = [] } = req.body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
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

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
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
        max_tokens: 500,
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

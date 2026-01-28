import { Router } from 'express';
import OpenAI from 'openai';

export const chatRouter = Router();

// Financial tutor system prompt
const SYSTEM_PROMPT = `You are a friendly and encouraging financial statements tutor for beginners. Your name is Professor Penny.

Your role:
- Help students understand financial statements (balance sheet, income statement, cash flow statement)
- Explain accounting concepts in simple, relatable terms
- Use real-world examples when possible
- Encourage students and celebrate their progress
- Keep responses concise but educational

Guidelines:
- Use analogies to explain complex concepts (e.g., "Think of assets like your piggy bank")
- Break down jargon into plain English
- If a student is confused, try a different explanation approach
- Sprinkle in relevant emojis to keep it engaging 📊💰
- Stay focused on financial statements topics
- If asked about unrelated topics, gently redirect to course material

Remember: You're teaching absolute beginners who may have never seen a financial statement before. Be patient and supportive!`;

// Initialize OpenAI client (will fail gracefully if no API key)
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('OpenAI client not initialized:', error);
}

// Fallback responses when API is unavailable
const FALLBACK_RESPONSES = [
  "I'm having trouble connecting right now, but let me share a tip: The balance sheet shows what a company owns (assets), owes (liabilities), and the owner's stake (equity). Assets = Liabilities + Equity! 📊",
  "Connection issue! Here's a quick lesson: Revenue is the 'top line' of an income statement - it's money earned from selling products or services. Net income is the 'bottom line' - what's left after all expenses! 💰",
  "I can't connect to my brain right now! But remember: Cash flow is king! A company can show profit but still run out of cash if customers don't pay on time. The cash flow statement tracks actual money movement. 🏦",
  "Having technical difficulties! Fun fact: The three financial statements are interconnected. Net income from the income statement flows to retained earnings on the balance sheet, and adjustments for non-cash items connect to the cash flow statement! 🔗",
];

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Chat completion endpoint
chatRouter.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If OpenAI is not available, use fallback
    if (!openai) {
      const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
      return res.json({
        response: fallback,
        isOnline: false,
      });
    }

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

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
});

// Streaming chat endpoint
chatRouter.post('/stream', async (req, res) => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If OpenAI is not available, stream fallback
    if (!openai) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];

      // Simulate streaming by sending word by word
      const words = fallback.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ content: word + ' ' })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    // Stream from OpenAI
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    return res.end();
  } catch (error) {
    console.error('Stream error:', error);
    return res.status(500).json({ error: 'Streaming failed' });
  }
});

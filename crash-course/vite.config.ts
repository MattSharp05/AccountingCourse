import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function devChatApi(): Plugin {
  let openaiKey: string | undefined

  return {
    name: 'dev-chat-api',
    configResolved(config) {
      // Load .env.local vars (not just VITE_ prefixed ones)
      const env = loadEnv(config.mode, config.root, '')
      openaiKey = env.OPENAI_API_KEY
    },
    configureServer(server) {
      // Handle /api/chat-stream
      server.middlewares.use('/api/chat-stream', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 200
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        // Parse body
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const body = JSON.parse(Buffer.concat(chunks).toString())

        const { message, history = [], context = {} } = body

        if (!message || typeof message !== 'string') {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Message is required' }))
          return
        }

        if (!openaiKey) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            response: "I'm having trouble connecting right now, but here's a tip: The accounting equation is Assets = Liabilities + Equity. Every transaction affects at least two accounts — that's double-entry bookkeeping!",
            isOnline: false,
          }))
          return
        }

        // Build system prompt
        const systemPrompt = buildSystemPrompt(context)
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
          { role: 'user', content: message },
        ]

        try {
          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages,
              max_tokens: 800,
              temperature: 0.7,
              stream: true,
            }),
          })

          if (!openaiRes.ok) {
            const errText = await openaiRes.text()
            console.error('OpenAI error:', openaiRes.status, errText)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ response: 'OpenAI API error. Check your API key.', isOnline: false }))
            return
          }

          // Stream SSE
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')

          const reader = openaiRes.body!.getReader()
          const decoder = new TextDecoder()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(decoder.decode(value, { stream: true }))
          }

          res.end()
        } catch (err) {
          console.error('Chat dev API error:', err)
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ response: 'Failed to connect to OpenAI.', isOnline: false }))
          } else {
            res.end()
          }
        }
      })

      // Handle /api/chat (non-streaming fallback)
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 200
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const body = JSON.parse(Buffer.concat(chunks).toString())

        const { message, history = [], context = {} } = body

        if (!openaiKey) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            response: "I'm having trouble connecting right now, but here's a tip: The accounting equation is Assets = Liabilities + Equity.",
            isOnline: false,
          }))
          return
        }

        const systemPrompt = buildSystemPrompt(context)
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
          { role: 'user', content: message },
        ]

        try {
          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages,
              max_tokens: 800,
              temperature: 0.7,
            }),
          })

          const data = await openaiRes.json() as {
            choices?: Array<{ message?: { content?: string } }>
          }
          const response = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ response, isOnline: true }))
        } catch {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ response: 'Failed to connect to OpenAI.', isOnline: false }))
        }
      })
    },
  }
}

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

{{COURSE_CONTEXT}}`

function buildSystemPrompt(context: Record<string, unknown>): string {
  let contextSection = ''

  if (context.mapTitle) {
    contextSection += `\nThe student is currently on: "${context.mapTitle}"`
  }
  if (context.checkpointTitle) {
    contextSection += ` > checkpoint: "${context.checkpointTitle}"`
  }
  if (Array.isArray(context.strugglingTopics) && context.strugglingTopics.length > 0) {
    contextSection += `\nTopics they're struggling with: ${context.strugglingTopics.join(', ')}`
  }
  if (typeof context.courseContent === 'string' && context.courseContent.length > 0) {
    contextSection += `\n\nHere is the professor's course content for this section. Reference it in your answers when relevant:\n\n${context.courseContent}`
  }

  return SYSTEM_PROMPT.replace(
    '{{COURSE_CONTEXT}}',
    contextSection || '\nNo specific course content loaded for the current section.'
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devChatApi()],
  server: {
    // Required for @ffmpeg/ffmpeg (SharedArrayBuffer). Mirror these in
    // vercel.json for production. If they break embedded third-party
    // resources, scope them to /admin/* instead.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})

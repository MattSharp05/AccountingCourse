// Supabase Edge Function: extract-quiz-from-pdf
//
// Takes a past-exam document (PDF or .docx, already uploaded to the
// `course-content` bucket) that contains questions WITH their answers,
// extracts the text (unpdf for PDF, mammoth for docx), and asks GPT-4o-mini
// to parse every graded question into a typed QuizQuestion
// (mcq / short_answer / numeric). The professor picks which questions to
// keep in the client modal.
//
// Older binary `.doc` files are NOT supported — they need a heavyweight
// converter and aren't worth the complexity. Re-save as .docx in Word.
//
// Function name kept as `extract-quiz-from-pdf` for backwards-compat with
// the deployed function URL; the request payload accepts `documentUrl` and
// falls back to legacy `pdfUrl`.
//
// Unlike generate-quiz, this function does NOT invent questions — it only
// parses questions that are literally present in the PDF.
//
// Deploy: `supabase functions deploy extract-quiz-from-pdf`
// Required secret: `supabase secrets set OPENAI_API_KEY=sk-...`  (shared with
// generate-quiz / the Vercel chat function).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1';
import mammoth from 'npm:mammoth@1.8.0';
import { Buffer } from 'node:buffer';

const MAX_TEXT_LENGTH = 50_000;
const MAX_QUESTIONS = 80;

type SourceFormat = 'pdf' | 'docx';

/** Detect format from a public URL by file extension. */
function detectFormat(url: string): SourceFormat | null {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (path.endsWith('.docx')) return 'docx';
  return null;
}

async function extractDocText(buffer: ArrayBuffer, format: SourceFormat): Promise<string> {
  if (format === 'pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return typeof text === 'string' ? text : text.join('\n\n');
  }
  // docx — mammoth's npm package resolves to its Node entrypoint inside
  // the Deno runtime, which accepts `{ buffer: Buffer }` (NOT
  // `{ arrayBuffer }` — that's the browser-only API).
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value ?? '';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface CleanMCQ {
  id: string;
  type: 'mcq';
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}
interface CleanShortAnswer {
  id: string;
  type: 'short_answer';
  question: string;
  expectedAnswer: string;
  acceptableAnswers?: string[];
  explanation?: string;
}
interface CleanNumeric {
  id: string;
  type: 'numeric';
  question: string;
  expectedValue: number;
  tolerance?: number;
  unit?: string;
  explanation?: string;
}
type CleanQuestion = CleanMCQ | CleanShortAnswer | CleanNumeric;

interface SkippedQuestion {
  stem: string;
  reason: string;
}

interface CleanQuiz {
  passingScore: number;
  questions: CleanQuestion[];
  skipped: SkippedQuestion[];
}

function buildSystemPrompt(pdfText: string): string {
  return `You are parsing a past-exam PDF for a college accounting course. The document contains questions AND the correct answers (the professor's key). Extract every graded question and convert each to one of three structured formats.

Question types:
- "mcq" — multiple-choice with 2-6 options and ONE correct answer. Use for True/False (2 options), A/B/C style questions, and any question where a short list of choices is given. For True/False, use exactly ["True", "False"].
- "short_answer" — a text answer like a principle name or a canonical journal entry. Set "expectedAnswer" to the canonical wording. Add 2-4 "acceptableAnswers" with reasonable alternate phrasings when possible.
- "numeric" — a numeric answer (dollars, units, years, counts, etc.). Set "expectedValue" to the exact number (never a string, strip commas and currency symbols). Set "unit" to "$" / "%" / etc. when cosmetic. Set a small "tolerance" (e.g. 1 for dollars near rounding) when appropriate; otherwise omit.

Rules:
- Each (sub)question becomes its own entry. A prompt like "8. (a) ... (b) ... (c) ..." produces 3 separate entries. Preserve context from the parent stem when needed so each question stands alone.
- Include bonus questions.
- If a question is impossible to auto-grade (e.g. multi-line financial statement completion, multi-cell tables, or ambiguous phrasing), add it to "skipped" with a short reason. Do NOT put it in "questions".
- Do NOT invent questions that aren't in the PDF, and do NOT invent answers — use the answer that's already written in the PDF.
- For MCQ, when the PDF uses a format like "(True / False)" with the correct answer bolded or followed by an explanation, pick the right "correctIndex".
- Preserve the original question wording in the "question" field. Trim leading numbering like "1.", "8b.", "(a)", etc.
- Add a brief "explanation" field (1-2 sentences) when the PDF itself shows reasoning; otherwise omit.
- Include at most ${MAX_QUESTIONS} questions.

Output ONLY valid JSON in this exact shape (no prose, no markdown fences):

{
  "passingScore": 70,
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "...",
      "options": ["...", "..."],
      "correctIndex": 0,
      "explanation": "..."
    },
    {
      "id": "q2",
      "type": "short_answer",
      "question": "...",
      "expectedAnswer": "...",
      "acceptableAnswers": ["..."]
    },
    {
      "id": "q3",
      "type": "numeric",
      "question": "...",
      "expectedValue": 650,
      "unit": "$",
      "tolerance": 1
    }
  ],
  "skipped": [
    { "stem": "...", "reason": "Multi-row table, can't auto-grade" }
  ]
}

PDF TEXT:

${pdfText}`;
}

function validateAndClean(raw: unknown): CleanQuiz {
  if (!raw || typeof raw !== 'object') throw new Error('Quiz is not an object');
  const d = raw as Record<string, unknown>;

  let passingScore = typeof d.passingScore === 'number' ? d.passingScore : 70;
  if (passingScore > 0 && passingScore <= 1) passingScore = passingScore * 100;

  if (!Array.isArray(d.questions)) throw new Error('questions is not an array');

  const skipped: SkippedQuestion[] = Array.isArray(d.skipped)
    ? d.skipped.flatMap((s: unknown) => {
        if (!s || typeof s !== 'object') return [];
        const row = s as Record<string, unknown>;
        if (typeof row.stem !== 'string') return [];
        return [{
          stem: row.stem,
          reason: typeof row.reason === 'string' ? row.reason : 'Unspecified',
        }];
      })
    : [];

  const questions: CleanQuestion[] = [];
  for (let i = 0; i < d.questions.length && questions.length < MAX_QUESTIONS; i++) {
    const rawQ = d.questions[i];
    if (!rawQ || typeof rawQ !== 'object') continue;
    const q = rawQ as Record<string, unknown>;
    const id = typeof q.id === 'string' && q.id.length > 0 ? q.id : `q${i + 1}`;
    const question = typeof q.question === 'string' ? q.question.trim() : '';
    if (!question) continue;
    const explanation = typeof q.explanation === 'string' ? q.explanation : undefined;

    const type = typeof q.type === 'string' ? q.type : 'mcq';

    if (type === 'mcq') {
      if (!Array.isArray(q.options)) continue;
      const options = (q.options as unknown[]).filter(
        (o): o is string => typeof o === 'string' && o.length > 0,
      );
      if (options.length < 2 || options.length > 6) continue;
      const correctIndex = typeof q.correctIndex === 'number' ? Math.floor(q.correctIndex) : -1;
      if (correctIndex < 0 || correctIndex >= options.length) continue;
      questions.push({ id, type: 'mcq', question, options, correctIndex, explanation });
    } else if (type === 'short_answer') {
      const expectedAnswer = typeof q.expectedAnswer === 'string' ? q.expectedAnswer.trim() : '';
      if (!expectedAnswer) continue;
      const acceptableAnswers = Array.isArray(q.acceptableAnswers)
        ? (q.acceptableAnswers as unknown[]).filter((a): a is string => typeof a === 'string')
        : undefined;
      questions.push({
        id,
        type: 'short_answer',
        question,
        expectedAnswer,
        acceptableAnswers: acceptableAnswers && acceptableAnswers.length > 0 ? acceptableAnswers : undefined,
        explanation,
      });
    } else if (type === 'numeric') {
      const expectedValue = typeof q.expectedValue === 'number' ? q.expectedValue : NaN;
      if (!Number.isFinite(expectedValue)) continue;
      const tolerance =
        typeof q.tolerance === 'number' && q.tolerance > 0 ? q.tolerance : undefined;
      const unit = typeof q.unit === 'string' ? q.unit : undefined;
      questions.push({ id, type: 'numeric', question, expectedValue, tolerance, unit, explanation });
    }
    // Unknown types are dropped silently.
  }

  if (questions.length === 0) {
    throw new Error('No parseable questions were produced');
  }

  return { passingScore, questions, skipped };
}

/**
 * Shuffle MCQ options so the correct answer isn't always in position A.
 * (Same reasoning as generate-quiz — LLMs bias toward A.)
 */
function shuffleMCQOptions(quiz: CleanQuiz): CleanQuiz {
  return {
    ...quiz,
    questions: quiz.questions.map((q) => {
      if (q.type !== 'mcq') return q;
      const indexed = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correctIndex }));
      for (let i = indexed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
      }
      return {
        ...q,
        options: indexed.map((x) => x.opt),
        correctIndex: indexed.findIndex((x) => x.isCorrect),
      };
    }),
  };
}

Deno.serve(async (req) => {
  console.log(`[extract-quiz-from-pdf] ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'Missing Authorization header' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(500, { error: 'Server misconfigured: Supabase env vars missing' });
    }
    if (!openaiKey) {
      return jsonResponse(500, {
        error: 'OPENAI_API_KEY is not set. Run: supabase secrets set OPENAI_API_KEY=sk-...',
      });
    }

    // We inherit the caller's JWT so their user is identified; this endpoint
    // doesn't need RLS checks on content_items (it only reads a PDF by URL)
    // but auth still gates access.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse(401, { error: 'Not signed in' });
    }

    const body = await req.json().catch(() => null);
    console.log('[extract-quiz-from-pdf] body keys:', body ? Object.keys(body) : 'null');
    // Accept `documentUrl` going forward, fall back to legacy `pdfUrl`.
    const documentUrl: string | undefined = body?.documentUrl ?? body?.pdfUrl;
    if (!documentUrl || typeof documentUrl !== 'string') {
      console.warn('[extract-quiz-from-pdf] 400: missing documentUrl/pdfUrl in body');
      return jsonResponse(400, { error: 'documentUrl is required' });
    }
    console.log('[extract-quiz-from-pdf] documentUrl host:', new URL(documentUrl).host, 'pathname:', new URL(documentUrl).pathname);

    const format = detectFormat(documentUrl);
    if (!format) {
      console.warn('[extract-quiz-from-pdf] 400: unsupported extension on URL', documentUrl);
      return jsonResponse(400, {
        error: 'Unsupported file type. Upload a .pdf or .docx file.',
      });
    }
    console.log('[extract-quiz-from-pdf] detected format:', format);

    // Bucket is public — plain fetch is sufficient.
    const fileRes = await fetch(documentUrl);
    if (!fileRes.ok) {
      console.error('[extract-quiz-from-pdf] download failed', fileRes.status);
      return jsonResponse(502, { error: `Failed to download document: ${fileRes.status}` });
    }

    const buffer = await fileRes.arrayBuffer();
    console.log('[extract-quiz-from-pdf] downloaded bytes:', buffer.byteLength);

    const rawText = await extractDocText(buffer, format);
    const docText = rawText.slice(0, MAX_TEXT_LENGTH);
    console.log('[extract-quiz-from-pdf] extracted text length:', docText.length);

    if (!docText || docText.trim().length < 100) {
      console.warn('[extract-quiz-from-pdf] 400: extracted text too short', docText.length);
      return jsonResponse(400, {
        error: `Could not extract enough text from this ${format.toUpperCase()} to parse questions.`,
      });
    }

    const systemPrompt = buildSystemPrompt(docText);

    let cleanQuiz: CleanQuiz | null = null;
    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        return jsonResponse(502, {
          error: `OpenAI API error: ${openaiRes.status} ${errText.slice(0, 200)}`,
        });
      }

      const data = await openaiRes.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = 'OpenAI returned an empty response';
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        cleanQuiz = validateAndClean(parsed);
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown parse error';
        console.warn(`[extract-quiz-from-pdf] attempt ${attempt + 1} failed: ${lastError}`);
      }
    }

    if (!cleanQuiz) {
      return jsonResponse(502, { error: `Failed to parse quiz: ${lastError}` });
    }

    const shuffled = shuffleMCQOptions(cleanQuiz);

    return jsonResponse(200, { success: true, quiz: shuffled });
  } catch (err) {
    console.error('[extract-quiz-from-pdf] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});

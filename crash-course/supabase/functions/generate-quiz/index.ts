// Supabase Edge Function: generate-quiz
//
// Generates a multiple-choice quiz from the text content of a checkpoint
// using OpenAI gpt-4o-mini. Auth is enforced inside the function via the
// caller's JWT + RLS on content_items (verify_jwt is off at the gateway —
// see supabase/config.toml).
//
// Deploy: `supabase functions deploy generate-quiz`
// Required secret: `supabase secrets set OPENAI_API_KEY=sk-...`

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_CONTENT_LENGTH = 20_000;
const ALLOWED_QUESTION_COUNTS = [3, 5, 10] as const;
type QuestionCount = typeof ALLOWED_QUESTION_COUNTS[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ContentItemRow {
  id: string;
  type: string;
  title: string;
  text_content: string | null;
  metadata: Record<string, unknown> | null;
}

interface CleanQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface CleanQuiz {
  passingScore: number;
  questions: CleanQuestion[];
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Build a markdown summary of all extractable text under the checkpoint. */
function buildContentSummary(items: ContentItemRow[]): string {
  let total = 0;
  const sections: string[] = [];

  for (const item of items) {
    if (total >= MAX_CONTENT_LENGTH) break;
    const remaining = MAX_CONTENT_LENGTH - total;
    let section: string | null = null;

    if (item.type === 'text' && item.text_content) {
      section = `## ${item.title}\n${item.text_content.slice(0, remaining)}`;
    } else if (item.type === 'pdf') {
      const extracted = item.metadata?.extractedText;
      if (typeof extracted === 'string' && extracted.length > 0) {
        section = `## ${item.title} (PDF)\n${extracted.slice(0, remaining)}`;
      }
    } else if (item.type === 'video') {
      const transcript = item.metadata?.transcript;
      if (typeof transcript === 'string' && transcript.length > 0) {
        section = `## ${item.title} (Video transcript)\n${transcript.slice(0, remaining)}`;
      }
    }

    if (section) {
      sections.push(section);
      total += section.length;
    }
  }

  return sections.join('\n\n');
}

function buildSystemPrompt(content: string, questionCount: number): string {
  return `You are a quiz generator for a college accounting course. Given the educational content below, generate a multiple-choice quiz that tests understanding of the material.

Requirements:
- Generate exactly ${questionCount} questions
- Each question has exactly 4 options
- Test understanding and application, not rote memorization
- Wrong answers must be plausible but clearly incorrect to someone who understands the material
- Use facts and concepts from the provided content only — do not invent information
- Vary difficulty: mix conceptual and applied questions
- Output ONLY valid JSON in this exact shape (no prose, no markdown fences):

{
  "passingScore": 70,
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0
    }
  ]
}

passingScore is the percentage (0–100) of correct answers required to pass.

correctIndex is the 0-based index of the correct option.

Content to base the quiz on:

${content}`;
}

/**
 * Shuffle each question's options so the correct answer isn't biased toward
 * position A. LLMs have a strong training-data bias toward putting the
 * correct answer first; prompt instructions don't reliably fix this, but a
 * Fisher–Yates shuffle does.
 */
function shuffleQuizOptions(quiz: CleanQuiz): CleanQuiz {
  return {
    ...quiz,
    questions: quiz.questions.map((q) => {
      const indexed = q.options.map((opt, i) => ({
        opt,
        isCorrect: i === q.correctIndex,
      }));
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

/** Validate the LLM output and coerce into our QuizData shape. Throws on invalid input. */
function validateAndCleanQuiz(raw: unknown): CleanQuiz {
  if (!raw || typeof raw !== 'object') throw new Error('Quiz is not an object');
  const q = raw as Record<string, unknown>;

  // passingScore is a percentage (0–100). If the LLM returns a 0–1 fraction
  // anyway (it sometimes ignores the prompt), convert it.
  let passingScore =
    typeof q.passingScore === 'number' ? q.passingScore : 70;
  if (passingScore > 0 && passingScore <= 1) passingScore = passingScore * 100;
  if (!Array.isArray(q.questions)) {
    throw new Error('questions field is not an array');
  }
  if (q.questions.length === 0) {
    throw new Error('No questions generated');
  }

  const cleanQuestions: CleanQuestion[] = q.questions.map((rawQ, i) => {
    if (!rawQ || typeof rawQ !== 'object') {
      throw new Error(`Question ${i + 1} is not an object`);
    }
    const qq = rawQ as Record<string, unknown>;
    if (typeof qq.question !== 'string' || qq.question.trim().length === 0) {
      throw new Error(`Question ${i + 1}: question text missing`);
    }
    if (!Array.isArray(qq.options) || qq.options.length !== 4) {
      throw new Error(`Question ${i + 1}: must have exactly 4 options`);
    }
    if (qq.options.some((o) => typeof o !== 'string')) {
      throw new Error(`Question ${i + 1}: all options must be strings`);
    }
    if (
      typeof qq.correctIndex !== 'number' ||
      qq.correctIndex < 0 ||
      qq.correctIndex > 3 ||
      !Number.isInteger(qq.correctIndex)
    ) {
      throw new Error(`Question ${i + 1}: correctIndex must be an integer 0–3`);
    }
    return {
      id: typeof qq.id === 'string' ? qq.id : `q${i + 1}`,
      question: qq.question,
      options: qq.options as string[],
      correctIndex: qq.correctIndex,
    };
  });

  return { passingScore, questions: cleanQuestions };
}

Deno.serve(async (req) => {
  console.log(`[generate-quiz] ${req.method} request received`);

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
        error:
          'OPENAI_API_KEY is not set for this function. Run: supabase secrets set OPENAI_API_KEY=sk-...',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => null);
    const checkpointId = body?.checkpointId;
    const questionCount = body?.questionCount;

    if (!checkpointId || typeof checkpointId !== 'string') {
      return jsonResponse(400, { error: 'checkpointId is required' });
    }
    if (!ALLOWED_QUESTION_COUNTS.includes(questionCount as QuestionCount)) {
      return jsonResponse(400, {
        error: `questionCount must be one of: ${ALLOWED_QUESTION_COUNTS.join(', ')}`,
      });
    }

    // Fetch all content items under the checkpoint. RLS blocks non-owners.
    const { data: items, error: fetchErr } = await supabase
      .from('content_items')
      .select('id, type, title, text_content, metadata')
      .eq('checkpoint_id', checkpointId)
      .order('order', { ascending: true });

    if (fetchErr) {
      return jsonResponse(500, { error: `Failed to fetch content: ${fetchErr.message}` });
    }

    const content = buildContentSummary((items as ContentItemRow[]) || []);
    if (!content || content.length < 100) {
      return jsonResponse(400, {
        error:
          'Add some text, PDF, or video content to this checkpoint before generating a quiz.',
      });
    }

    console.log(
      `[generate-quiz] content length: ${content.length}, requesting ${questionCount} questions`,
    );

    const systemPrompt = buildSystemPrompt(content, questionCount);

    // Call OpenAI with one retry on JSON parse / validation failure.
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
          temperature: 0.7,
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        return jsonResponse(502, {
          error: `OpenAI API error: ${openaiRes.status} ${errText.slice(0, 200)}`,
        });
      }

      const data = await openaiRes.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        lastError = 'OpenAI returned an empty response';
        continue;
      }

      try {
        const parsed = JSON.parse(text);
        cleanQuiz = validateAndCleanQuiz(parsed);
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown parse error';
        console.warn(
          `[generate-quiz] attempt ${attempt + 1} failed: ${lastError}`,
        );
      }
    }

    if (!cleanQuiz) {
      return jsonResponse(502, {
        error: `Failed to generate a valid quiz: ${lastError}`,
      });
    }

    // Shuffle so the correct answer isn't always position A.
    const shuffled = shuffleQuizOptions(cleanQuiz);

    return jsonResponse(200, { success: true, quiz: shuffled });
  } catch (err) {
    console.error('[generate-quiz] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});

import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { QuizData } from '../types/admin';
import { normalizeQuizData } from '../types/admin';

export type QuestionCount = 3 | 5 | 10;

interface GenerateQuizArgs {
  checkpointId: string;
  questionCount: QuestionCount;
}

/**
 * Try to extract a useful error message from a Supabase Functions error.
 * FunctionsHttpError attaches the original Response on `context`; reading
 * it as JSON gets us the function's `{ error: string }` body.
 */
async function extractErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!error || typeof error !== 'object') return fallback;
  const ctx = (error as { context?: unknown }).context;
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = await (ctx as Response).json();
      if (body && typeof body === 'object' && typeof body.error === 'string') {
        return body.error;
      }
    } catch {
      // fall through
    }
  }
  if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}

/**
 * Invoke the `generate-quiz` Supabase Edge Function. Does NOT save the
 * result — the caller is responsible for showing the preview UI and
 * persisting the quiz via useAddContentItem.
 */
export function useGenerateQuiz() {
  return useMutation({
    mutationFn: async ({ checkpointId, questionCount }: GenerateQuizArgs): Promise<QuizData> => {
      // Explicit JWT attachment, same pattern as useExtractPdf — supabase-js
      // doesn't reliably auto-attach the user session token across versions.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Not signed in — please log in again to generate quizzes.');
      }

      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { checkpointId, questionCount },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        const message = await extractErrorMessage(error, 'Quiz generation failed');
        console.error('[useGenerateQuiz]', message);
        throw new Error(message);
      }
      if (!data?.success || !data?.quiz) {
        throw new Error(data?.error || 'Quiz generation failed');
      }

      // Normalize so legacy-shape (no `type` field) quizzes from the
      // existing edge function produce a discriminated-union QuizData.
      return normalizeQuizData(data.quiz);
    },
  });
}

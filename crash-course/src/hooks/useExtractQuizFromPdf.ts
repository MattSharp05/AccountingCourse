import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import { useAuthStore } from '../stores/authStore';
import { normalizeQuizData, type QuizData } from '../types/admin';

export interface SkippedQuestion {
  stem: string;
  reason: string;
}

export interface PdfExtractionResult {
  quiz: QuizData;
  skipped: SkippedQuestion[];
  documentUrl: string;
}

interface ExtractArgs {
  file: File;
}

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
 * Upload a past-exam document (PDF or .docx) to the `course-content` bucket
 * under a `quiz-sources/` folder, then invoke the `extract-quiz-from-pdf`
 * Edge Function to turn it into a typed QuizData + a list of skipped
 * questions.
 *
 * The file is retained in storage (obfuscated filename via the existing
 * `uploadFile` helper) — it's not added as a public content item, but a
 * future re-extract or audit can use the same file.
 */
export function useExtractQuizFromPdf() {
  return useMutation({
    mutationFn: async ({ file }: ExtractArgs): Promise<PdfExtractionResult> => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        throw new Error('Not signed in — please log in again.');
      }

      const documentUrl = await uploadFile(userId, file, 'quiz-sources');

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Not signed in — please log in again.');
      }

      const { data, error } = await supabase.functions.invoke('extract-quiz-from-pdf', {
        body: { documentUrl },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        const message = await extractErrorMessage(error, 'Quiz extraction failed');
        throw new Error(message);
      }
      if (!data?.success || !data?.quiz) {
        throw new Error(data?.error || 'Quiz extraction failed');
      }

      const quiz = normalizeQuizData(data.quiz);
      const skipped: SkippedQuestion[] = Array.isArray(data.quiz.skipped)
        ? (data.quiz.skipped as unknown[]).flatMap((s) => {
            if (!s || typeof s !== 'object') return [];
            const row = s as Record<string, unknown>;
            if (typeof row.stem !== 'string') return [];
            return [{
              stem: row.stem,
              reason: typeof row.reason === 'string' ? row.reason : 'Unspecified',
            }];
          })
        : [];

      return { quiz, skipped, documentUrl };
    },
  });
}

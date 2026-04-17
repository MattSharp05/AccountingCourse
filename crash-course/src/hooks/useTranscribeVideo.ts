import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { contentItemKeys } from './useContentItems';

interface TranscribeVideoResult {
  success: true;
  length: number;
  model: string;
}

interface TranscribeVideoArgs {
  contentItemId: string;
  mapId: string;
}

/**
 * Invoke the `transcribe-video` Supabase Edge Function to transcribe a
 * video content_item's audio sidecar via Whisper and write the transcript
 * into its metadata column.
 *
 * The audio sidecar must already be uploaded and its public URL stored at
 * `content_items.metadata.audioUrl` before calling this — the edge function
 * fetches the audio from there.
 */
export function useTranscribeVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentItemId }: TranscribeVideoArgs): Promise<TranscribeVideoResult> => {
      console.debug('[useTranscribeVideo] start', { contentItemId });

      // Same flakiness workaround as useExtractPdf — supabase.functions.invoke
      // doesn't reliably attach the session token across versions, and the
      // function rejects 401 before any code runs if the header is missing.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Not signed in — please log in again to transcribe videos.');
      }

      console.debug('[useTranscribeVideo] invoking edge function');
      const { data, error } = await supabase.functions.invoke('transcribe-video', {
        body: { contentItemId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.debug('[useTranscribeVideo] invoke returned', { hasData: !!data, hasError: !!error, data, error });

      if (error) {
        console.error('[useTranscribeVideo] invoke failed:', error);
        throw error;
      }
      if (!data?.success) {
        const message = data?.error || 'Video transcription failed';
        console.error('[useTranscribeVideo]', message);
        throw new Error(message);
      }

      return data as TranscribeVideoResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: contentItemKeys.forMap(variables.mapId),
      });
    },
  });
}

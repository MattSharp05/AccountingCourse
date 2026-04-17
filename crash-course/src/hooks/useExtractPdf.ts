import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { contentItemKeys } from './useContentItems';

interface ExtractPdfResult {
  success: true;
  pageCount: number;
  length: number;
}

interface ExtractPdfArgs {
  contentItemId: string;
  mapId: string;
}

/**
 * Invoke the `extract-pdf` Supabase Edge Function to scrape a PDF
 * content_item's text into its metadata column.
 */
export function useExtractPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentItemId }: ExtractPdfArgs): Promise<ExtractPdfResult> => {
      console.debug('[useExtractPdf] start', { contentItemId });

      // Explicitly attach the user's JWT — supabase.functions.invoke is
      // supposed to do this automatically but it's flaky across versions, and
      // the Edge Function gateway rejects with 401 before the function code
      // runs if Verify JWT is on and the header is missing.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      console.debug('[useExtractPdf] session resolved, has token:', !!accessToken);
      if (!accessToken) {
        throw new Error('Not signed in — please log in again to extract PDFs.');
      }

      console.debug('[useExtractPdf] invoking edge function');
      const { data, error } = await supabase.functions.invoke('extract-pdf', {
        body: { contentItemId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.debug('[useExtractPdf] invoke returned', { hasData: !!data, hasError: !!error, data, error });

      if (error) {
        console.error('[useExtractPdf] invoke failed:', error);
        throw error;
      }
      if (!data?.success) {
        const message = data?.error || 'PDF extraction failed';
        console.error('[useExtractPdf]', message);
        throw new Error(message);
      }

      return data as ExtractPdfResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: contentItemKeys.forMap(variables.mapId),
      });
    },
  });
}

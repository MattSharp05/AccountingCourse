// Supabase Edge Function: extract-pdf
//
// Downloads a PDF from the course-content bucket via its public URL,
// extracts the text with `unpdf`, and writes
// { extractedText, pageCount, extractedAt } into content_items.metadata.
//
// Auth: caller's JWT is forwarded so RLS enforces ownership — a user can
// only trigger extraction for content_items they own (their own courses).
//
// Deploy: `supabase functions deploy extract-pdf`

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1';

const MAX_TEXT_LENGTH = 50_000;

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

Deno.serve(async (req) => {
  console.log(`[extract-pdf] ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log(`[extract-pdf] auth header present: ${!!authHeader}`);
    if (!authHeader) {
      return jsonResponse(401, { error: 'Missing Authorization header' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(500, { error: 'Server misconfigured' });
    }

    // Client inherits the caller's JWT — RLS will block content items the
    // user doesn't own.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => null);
    const contentItemId = body?.contentItemId;
    if (!contentItemId || typeof contentItemId !== 'string') {
      return jsonResponse(400, { error: 'contentItemId is required' });
    }

    const { data: item, error: fetchErr } = await supabase
      .from('content_items')
      .select('id, type, file_url')
      .eq('id', contentItemId)
      .single();

    if (fetchErr || !item) {
      return jsonResponse(404, {
        error: 'Content item not found or access denied',
      });
    }
    if (item.type !== 'pdf') {
      return jsonResponse(400, { error: 'Content item is not a PDF' });
    }
    if (!item.file_url) {
      return jsonResponse(400, { error: 'Content item has no file URL' });
    }

    // Bucket is public, so a plain fetch is sufficient.
    const pdfRes = await fetch(item.file_url);
    if (!pdfRes.ok) {
      return jsonResponse(502, {
        error: `Failed to download PDF: ${pdfRes.status}`,
      });
    }

    const buffer = await pdfRes.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const extractedText = (typeof text === 'string' ? text : text.join('\n\n'))
      .slice(0, MAX_TEXT_LENGTH);

    const metadata = {
      extractedText,
      pageCount: totalPages,
      extractedAt: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('content_items')
      .update({ metadata })
      .eq('id', contentItemId);

    if (updateErr) {
      return jsonResponse(500, {
        error: `Failed to save extracted text: ${updateErr.message}`,
      });
    }

    return jsonResponse(200, {
      success: true,
      pageCount: totalPages,
      length: extractedText.length,
    });
  } catch (err) {
    console.error('[extract-pdf] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});

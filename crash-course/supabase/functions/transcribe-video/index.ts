// Supabase Edge Function: transcribe-video
//
// Downloads the audio sidecar that was extracted client-side and uploaded
// alongside a video content_item, sends it to OpenAI's transcription API
// (`gpt-4o-mini-transcribe`, the cheapest model at $0.003/min), and writes
// the resulting transcript into content_items.metadata.transcript.
//
// The client extracts audio in the browser via @ffmpeg/ffmpeg before calling
// this function. Whisper has a 25MB upload cap, but a 16kHz mono 32kbps audio
// track of a typical lecture is well under that.
//
// Auth: caller's JWT is forwarded so RLS enforces ownership — a user can
// only trigger transcription for content_items they own.
//
// Deploy: `supabase functions deploy transcribe-video`
// Required secret: `supabase secrets set OPENAI_API_KEY=sk-...`
//   (already set if extract-pdf / generate-quiz are working — same key)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_TEXT_LENGTH = 50_000;
const TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';

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
  console.log(`[transcribe-video] ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log(`[transcribe-video] auth header present: ${!!authHeader}`);
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
      .select('id, type, file_url, metadata')
      .eq('id', contentItemId)
      .single();

    if (fetchErr || !item) {
      return jsonResponse(404, {
        error: 'Content item not found or access denied',
      });
    }
    if (item.type !== 'video') {
      return jsonResponse(400, { error: 'Content item is not a video' });
    }

    const existingMetadata =
      (item.metadata as Record<string, unknown> | null) ?? {};
    const audioUrl = existingMetadata.audioUrl;
    if (typeof audioUrl !== 'string' || !audioUrl) {
      return jsonResponse(400, {
        error:
          'Content item has no audio sidecar URL — was the audio extracted and uploaded before calling transcribe-video?',
      });
    }

    // Bucket is public, so a plain fetch is sufficient.
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return jsonResponse(502, {
        error: `Failed to download audio sidecar: ${audioRes.status}`,
      });
    }

    const audioBuffer = await audioRes.arrayBuffer();
    console.log(
      `[transcribe-video] audio downloaded, size: ${audioBuffer.byteLength} bytes`,
    );

    // OpenAI's audio endpoint takes multipart/form-data, not JSON.
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', TRANSCRIPTION_MODEL);
    formData.append('response_format', 'text');

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error(
        `[transcribe-video] OpenAI error ${openaiRes.status}: ${errText.slice(0, 500)}`,
      );
      return jsonResponse(502, {
        error: `OpenAI transcription error: ${openaiRes.status} ${errText.slice(0, 200)}`,
      });
    }

    // response_format=text returns the raw transcript as text/plain.
    const rawTranscript = await openaiRes.text();
    const transcript = rawTranscript.trim().slice(0, MAX_TEXT_LENGTH);

    if (transcript.length === 0) {
      return jsonResponse(502, {
        error: 'OpenAI returned an empty transcript',
      });
    }

    // Merge into existing metadata so we don't blow away audioUrl (or any
    // other future metadata fields).
    const metadata = {
      ...existingMetadata,
      transcript,
      transcribedAt: new Date().toISOString(),
      transcriptionModel: TRANSCRIPTION_MODEL,
    };

    const { error: updateErr } = await supabase
      .from('content_items')
      .update({ metadata })
      .eq('id', contentItemId);

    if (updateErr) {
      return jsonResponse(500, {
        error: `Failed to save transcript: ${updateErr.message}`,
      });
    }

    return jsonResponse(200, {
      success: true,
      length: transcript.length,
      model: TRANSCRIPTION_MODEL,
    });
  } catch (err) {
    console.error('[transcribe-video] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(500, { error: message });
  }
});

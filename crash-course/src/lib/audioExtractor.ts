// Client-side audio extraction for video uploads.
//
// We extract just the audio track from uploaded videos before sending them
// to OpenAI's transcription API, because Whisper has a hard 25MB upload cap
// per request. A 1-hour 1080p lecture is hundreds of MB, but its audio track
// re-encoded to 16kHz mono AAC at 32kbps is ~14MB — well under the limit and
// still plenty for speech transcription.
//
// ffmpeg.wasm needs SharedArrayBuffer, which requires the page to be served
// with COOP: same-origin and COEP: require-corp. See vercel.json (prod) and
// vite.config.ts (dev) for those headers.
//
// All ffmpeg files live in public/ and are served as plain static assets:
//   public/ffmpeg-core.js   — @ffmpeg/core@0.12.10 UMD build
//   public/ffmpeg-core.wasm — the WASM binary (~31MB)
//   public/ffmpeg-worker.js — @ffmpeg/ffmpeg@0.12.15 internal worker (814.ffmpeg.js)
//
// This avoids CDN latency, blob URL issues, and Vite's ESM Worker transforms
// that break blob-URL-based loading.

import type { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpegSingleton: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;

  ffmpegSingleton = (async () => {
    // Lazy-load the heavy modules so they only land in the bundle when a
    // professor actually uploads a video.
    console.log('[audioExtractor] Loading ffmpeg modules...');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    console.log('[audioExtractor] Module loaded, initializing ffmpeg (WASM is cached by the browser after first load)...');

    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.debug('[ffmpeg]', message);
    });
    ffmpeg.on('progress', ({ progress, time }) => {
      const pct = Math.round(progress * 100);
      console.log(`[audioExtractor] Encoding: ${pct}% (${Math.round(time / 1_000_000)}s processed)`);
    });

    // All files served from public/ as plain static assets — no CDN fetch,
    // no blob URLs, no Vite ESM transforms.
    await ffmpeg.load({
      coreURL: '/ffmpeg-core.js',
      wasmURL: '/ffmpeg-core.wasm',
      classWorkerURL: '/ffmpeg-worker.js',
    });
    console.log('[audioExtractor] ffmpeg ready');

    return ffmpeg;
  })();

  try {
    return await ffmpegSingleton;
  } catch (err) {
    // Reset so a future call can retry — otherwise a transient CDN failure
    // would brick the upload flow until a page reload.
    ffmpegSingleton = null;
    throw err;
  }
}

/**
 * Extract the audio track from a video File and return it as a small,
 * speech-tuned audio Blob (16kHz mono AAC at 32kbps, in an MP4 container).
 *
 * Throws if the browser is not cross-origin-isolated, if ffmpeg fails to
 * load, or if the video has no audio track.
 */
export async function extractAudioFromVideo(file: File): Promise<Blob> {
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
    throw new Error(
      'Audio extraction requires the page to be cross-origin-isolated. ' +
        'Check that COOP/COEP headers are set on this domain.',
    );
  }

  const sizeMB = (file.size / 1_048_576).toFixed(1);
  console.log(`[audioExtractor] Starting audio extraction: ${file.name} (${sizeMB} MB)`);

  const ffmpeg = await getFfmpeg();
  const { fetchFile } = await import('@ffmpeg/util');

  // Pick an input filename that preserves the original extension so ffmpeg
  // can sniff the container format. Fall back to .mp4 if missing.
  const inputName = `input.${(file.name.split('.').pop() || 'mp4').toLowerCase()}`;
  const outputName = 'output.m4a';

  console.log('[audioExtractor] Reading video file into memory...');
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // -vn: drop video    -ac 1: mono     -ar 16000: 16kHz sample rate
  // -b:a 32k: 32kbps    -c:a aac: AAC codec (small + universally readable)
  console.log('[audioExtractor] Extracting & encoding audio track (this may take a minute for long videos)...');
  const startTime = performance.now();
  await ffmpeg.exec([
    '-i', inputName,
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-b:a', '32k',
    '-c:a', 'aac',
    outputName,
  ]);
  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
  console.log(`[audioExtractor] Encoding done in ${elapsed}s`);

  const data = await ffmpeg.readFile(outputName);

  // Clean up the in-memory FS so repeated uploads don't accumulate.
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (err) {
    console.debug('[audioExtractor] cleanup warning', err);
  }

  // ffmpeg.wasm returns FileData (Uint8Array | string) — we know it's binary
  // because we wrote a binary file. The Uint8Array is backed by a SharedArrayBuffer
  // and Blob's typings reject that, so we copy into a fresh ArrayBuffer.
  if (typeof data === 'string') {
    throw new Error('ffmpeg returned text data for a binary read — this should never happen');
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const blob = new Blob([copy], { type: 'audio/mp4' });

  console.debug('[audioExtractor] done', { outputSize: blob.size });

  if (blob.size === 0) {
    throw new Error('Extracted audio is empty — the video may have no audio track.');
  }

  return blob;
}

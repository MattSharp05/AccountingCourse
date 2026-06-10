# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Crash Course

Educational gamification platform: professors build course content as 2D graphs in an admin editor; students explore those graphs as a 3D world to learn the material. Stack is Vite + React 19 + TypeScript on the frontend, Supabase for data/auth/storage, and Vercel serverless functions for the AI tutor.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server. Includes a custom plugin (`devChatApi` in `vite.config.ts`) that mounts `/api/chat` and `/api/chat-stream` locally so the chat widget works without `vercel dev`. |
| `npm run build` | `tsc -b && vite build`. The TypeScript build is part of CI — must pass for Vercel deploys. |
| `npm run lint` | ESLint over the project. |
| `npm run preview` | Preview the built `dist/`. |

There is no test runner configured.

## Architecture

### Two apps in one Vite bundle
The router in `src/App.tsx` serves two distinct experiences from the same SPA:

- **Admin / professor** (`/admin/*`) — gated by `AuthGuard` (Supabase email/password). Builds courses → modules → maps → chapters → checkpoints → content items. The Map Editor (`src/pages/admin/MapEditor.tsx`) uses `@xyflow/react` to lay out checkpoint nodes on a 2D canvas.
- **Student** (`/`, `/course/:id`, `/game`, `/game/map/:mapId`) — gated by `StudentAuthGuard`. The 3D world in `src/pages/GameMap.tsx` uses `@react-three/fiber` + `@react-three/rapier` + `ecctrl` for character control. It consumes the same map data the editor produces. Reaching a quiz checkpoint launches a turn-based "boss battle" (`src/components/quiz/QuizBattle.tsx`, driven by `quizStore`); progress/XP/level-up feedback is rendered by the components in `src/components/gamification/`.

### The 2D-to-3D pipeline
This is the central concept of the codebase — touch it carefully.

1. In the editor, the professor arranges nodes on a React Flow canvas. State is persisted as `maps.canvas_data` (jsonb) in Supabase.
2. When the map is "built", `src/utils/buildMap.ts` converts the canvas into a `MapConfig` (typed in `src/types/admin.ts`) and stores it in `maps.map_config`.
3. `src/utils/mapConfigToGameNodes.ts` converts the `MapConfig` into the runtime objects the 3D scene expects.
4. The student GameMap reads the published `map_config` and renders nodes via `src/components/game/ContentNode.tsx`, paths via `PathRenderer.tsx`, and terrain via `MapTerrain.tsx`.

So `canvas_data` is the editable source of truth, `map_config` is the compiled artifact the 3D world consumes. When changing node/edge shape, expect to update **both** sides of the pipeline plus the type definitions.

### Data layer
- `src/lib/supabase.ts` — typed Supabase client (`Database` from `src/types/database.types.ts`).
- `src/hooks/use*.ts` — one hook file per entity (`useCourses`, `useModules`, `useMaps`, `useChapters`, `useCheckpoints`, `useContentItems`, `usePublicMaps`, `useStudentData`). All use TanStack Query; query keys are exported as `xxxKeys` objects from each file. Mutations always invalidate the relevant `forMap` / `forChapter` keys — follow this pattern when adding new mutations or you'll get stale UI.
- The hierarchy is **course → module → map → chapter → checkpoint → content_item**. There is no checked-in schema file — `src/types/admin.ts` and the hook files are the source of truth for table shape.
- RLS: professors CRUD their own content; anyone (including anonymous) can read rows belonging to a `published` map. Public read policies cascade up the hierarchy.

### State stores (Zustand)
`src/stores/`: `authStore`, `gameStore`, `quizStore`, `chatStore`. Re-exported from `src/stores/index.ts` along with selector hooks (e.g. `useCurrentNode`, `useChatMessages`). Prefer the named selector hooks over reaching into the store directly — they keep re-renders scoped.

**Auth gotcha — never `await` Supabase inside `onAuthStateChange`.** supabase-js v2 serializes token access behind the GoTrue lock (`navigator.locks`), and the `onAuthStateChange` callback runs *while that lock is held*. Any Supabase call inside it — including a plain `.from(...)` query, which acquires the lock to attach the JWT — deadlocks the entire client: the callback waits on the query, the query waits on the lock, the lock waits on the callback. Once stuck, **all** subsequent requests hang (e.g. courses never load, course creation spins forever). The callback in `authStore.initialize` must set auth state synchronously and defer any profile/DB fetch to a macrotask (`setTimeout(0)`) so the lock releases first. This is timing-dependent, so it can pass on a fresh login and only deadlock on a returning/refreshed session — don't reintroduce it.

### Chat / AI tutor
The "Professor Marrs" chatbot lives in `src/components/chat/ChatWidget.tsx` and calls `/api/chat` (or `/api/chat-stream` for SSE). Two implementations exist and **must be kept in sync**:

- `api/chat.ts` and `api/chat-stream.ts` — Vercel serverless functions used in production.
- The `devChatApi` plugin in `vite.config.ts` — local dev shim with the same `SYSTEM_PROMPT` and `buildSystemPrompt` logic copy-pasted in.

If you change the system prompt, context-building, model, or token limits, update **all three** call sites. Both paths read `OPENAI_API_KEY` from the environment and fall back to canned responses if it's missing.

`src/hooks/useChatWithContent.ts` is the wiring layer that pulls the current map's content into the chat context so the tutor can reference it. PDFs feed in via `content_items.metadata.extractedText` (see PDF extraction below).

### Edge Functions (Supabase)

Four functions live under `supabase/functions/`: `extract-pdf`, `generate-quiz`, `extract-quiz-from-pdf`, and `transcribe-video`. All have `verify_jwt = false` set in `supabase/config.toml` because the gateway-level JWT check was rejecting valid user JWTs for unidentified reasons. Auth is enforced **inside** each function: it creates a Supabase client using the caller's `Authorization` header and queries `content_items`, which RLS blocks for non-owners. Same security model, enforced one layer down. All four share the single `OPENAI_API_KEY` Supabase secret.

Every client hook (`useExtractPdf`, `useGenerateQuiz`, `useExtractQuizFromPdf`, `useTranscribeVideo`) explicitly attaches the user's JWT in the `headers` option of `supabase.functions.invoke` — supabase-js doesn't reliably auto-attach the session token across versions. Don't drop the explicit attachment.

#### `extract-pdf` — PDF text extraction
PDFs uploaded to a checkpoint are auto-scraped server-side so the AI tutor can reference their contents.

- **Function:** `supabase/functions/extract-pdf/index.ts`. Uses [`unpdf`](https://github.com/unjs/unpdf). Takes `{ contentItemId }`, downloads the PDF from the public `course-content` bucket, extracts text (capped at 50K chars), and writes `{ extractedText, pageCount, extractedAt }` into `content_items.metadata`.
- **Client hook:** `src/hooks/useExtractPdf.ts`, called from `EditorSidebar.tsx` immediately after a PDF upload completes.
- **Failure mode:** if extraction fails, the PDF is still uploaded — only the extracted text is missing. A dismissible warning banner appears in the editor sidebar. No manual re-scrape button; the professor re-uploads if they need the text indexed.

#### `generate-quiz` — AI quiz generation
Manual, professor-triggered. Generates a multiple-choice quiz from the text content under a checkpoint using `gpt-4o-mini`.

- **Function:** `supabase/functions/generate-quiz/index.ts`. Takes `{ checkpointId, questionCount }` (3, 5, or 10), pulls all `text` items and PDF `extractedText` under the checkpoint (capped at ~20K chars), calls OpenAI with `response_format: { type: 'json_object' }`, validates the returned shape, returns a `QuizData`. **Does not save to the DB** — the client gets the result and renders a preview/edit UI.
- **OpenAI key:** function reads `OPENAI_API_KEY` from Supabase secrets. Set with `supabase secrets set OPENAI_API_KEY=sk-...` (same key used by the Vercel `/api/chat` function — they share). Set this once per project; secrets persist across deploys.
- **Client hook:** `src/hooks/useGenerateQuiz.ts`. Returns the `QuizData` to the caller; doesn't invalidate any query keys.
- **UI:** `src/components/admin/AIQuizModal.tsx`. Single modal: title input + question-count dropdown + Generate button → loading state → editable questions list (textarea + 4 option inputs + radio for correct) → footer with Discard / Regenerate / Save. Save creates a `quiz`-typed `content_item` with `quiz_data` populated in one round trip via the extended `useAddContentItem` (which now accepts an optional `quizData` field).
- **Trigger:** sixth option in the "Add content" dropdown next to each checkpoint in `EditorSidebar.tsx`. The `'ai-quiz'` `UploadKind` bypasses the regular upload modal and opens `AIQuizModal` directly.
- **Cost:** ~$0.001 per quiz at `gpt-4o-mini` rates.
- **Validation:** the function does one retry on JSON parse / schema validation failure before giving up. Each question must have exactly 4 string options and an integer `correctIndex` in 0–3, or the function returns 502 with the validation error. The professor sees the actual error in the modal's amber banner.

#### `extract-quiz-from-pdf` — parse an existing exam into a quiz
Unlike `generate-quiz`, this does **not** invent questions — it parses questions that are literally present in an uploaded past-exam document (PDF via `unpdf`, or `.docx` via `mammoth`; legacy binary `.doc` is unsupported). Uses `gpt-4o-mini` to emit typed `QuizQuestion`s (`mcq` / `short_answer` / `numeric`, up to 80). The function name is kept for backwards-compat with the deployed URL; its payload accepts `documentUrl` (falls back to legacy `pdfUrl`). Client hook: `src/hooks/useExtractQuizFromPdf.ts`; UI: `src/components/admin/PdfQuizModal.tsx`. The professor chooses which parsed questions to keep.

#### `transcribe-video` — lecture video transcription
Audio is extracted **client-side in the browser** via `@ffmpeg/ffmpeg` (16kHz mono ~32kbps) and uploaded as a sidecar alongside the video `content_item`; this function downloads that audio and sends it to OpenAI `gpt-4o-mini-transcribe`, writing the result into `content_items.metadata.transcript`. Keeping audio small dodges Whisper's 25MB upload cap. Client hook: `src/hooks/useTranscribeVideo.ts`. Like PDF `extractedText`, the transcript feeds the AI tutor's context.

#### Deploy
```
supabase functions deploy extract-pdf
supabase functions deploy generate-quiz
supabase functions deploy extract-quiz-from-pdf
supabase functions deploy transcribe-video
```

The CLI reads `supabase/config.toml` and applies the per-function settings. If your CLI version doesn't honor those, append `--no-verify-jwt` to each command.

## Conventions

- Path-style imports are relative (`../lib/supabase`), no `@/` alias is configured.
- DB rows are snake_case; TS types are camelCase. Each hook file defines a `rowToX` mapper. Follow this pattern for new entities — don't sprinkle conversion logic at call sites.
- Type definitions live in `src/types/`. `admin.ts` covers the editor + course hierarchy; `content.ts` covers chat / content presentation; `database.types.ts` is the generated Supabase types (don't edit by hand).
- Vite env vars must be prefixed `VITE_` to reach the client. `OPENAI_API_KEY` is server-only and is read by both the Vercel functions and the `devChatApi` Vite plugin (which uses `loadEnv(..., '')` to read non-prefixed vars).
- 3D assets and terrain decorators live under `src/components/game/`. The toon shading helpers are in `toonGradient.ts`.

## Environment

Required env vars (place in `.env.local` — gitignored via `*.local`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...        # server-only; chat falls back to canned replies if missing
```

## Deployment

Vercel, configured by `vercel.json`. The `/api/*` routes map to the files in `api/`; everything else is rewritten to `index.html` for client-side routing. `npm run build` runs `tsc -b` first, so a TypeScript error will fail the deploy — run `npm run build` locally before pushing if you've touched types.

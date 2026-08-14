import { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, X, AlertTriangle, Video, FileText, Paperclip, PenLine, HelpCircle, Sparkles, GripVertical, FileQuestion } from 'lucide-react';
import { useChaptersForMap, useAddChapter, useUpdateChapter, useDeleteChapter } from '../../../hooks/useChapters';
import { useCheckpointsForMap, useAddCheckpoint, useUpdateCheckpoint, useDeleteCheckpoint } from '../../../hooks/useCheckpoints';
import { useContentItemsForMap, useAddContentItem, useUpdateContentItem, useDeleteContentItem } from '../../../hooks/useContentItems';
import { useAuthStore } from '../../../stores/authStore';
import { uploadFile } from '../../../lib/storage';
import { useExtractPdf } from '../../../hooks/useExtractPdf';
import { useTranscribeVideo } from '../../../hooks/useTranscribeVideo';
import { extractAudioFromVideo } from '../../../lib/audioExtractor';
import { AIQuizModal } from '../AIQuizModal';
import { PdfQuizModal } from '../PdfQuizModal';
import type { ContentItemType, Checkpoint } from '../../../types/admin';
import { SECTION_COLORS } from '../../../utils/buildMap';

// ── Constants ───────────────────────────────────────────

const TYPE_ICONS: Record<ContentItemType, string> = {
  video: '\u{1F3AC}',
  pdf: '\u{1F4C4}',
  text: '\u{1F4DD}',
  file: '\u{1F4CE}',
  quiz: '\u2694\uFE0F',
};

const TYPE_COLORS: Record<ContentItemType, string> = {
  video: 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/20',
  pdf: 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/20',
  text: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20',
  file: 'bg-amber-500/15 text-amber-300 border border-amber-400/20',
  quiz: 'bg-rose-500/15 text-rose-300 border border-rose-400/20',
};

type UploadKind = 'video' | 'pdf' | 'file' | 'text' | 'quiz' | 'ai-quiz' | 'pdf-quiz';

const ADD_CONTENT_OPTIONS: { kind: UploadKind; label: string; icon: string; accept?: string }[] = [
  { kind: 'video', label: 'Video', icon: '\u{1F3AC}', accept: 'video/*' },
  { kind: 'pdf', label: 'PDF', icon: '\u{1F4C4}', accept: 'application/pdf' },
  { kind: 'file', label: 'File', icon: '\u{1F4CE}', accept: '*/*' },
  { kind: 'text', label: 'Text', icon: '\u{1F4DD}' },
  { kind: 'quiz', label: 'Quiz', icon: '\u2694\uFE0F' },
  { kind: 'ai-quiz', label: 'AI Quiz', icon: '\u{1F916}' },
  { kind: 'pdf-quiz', label: 'Quiz from PDF/Word', icon: '\u{1F4DD}' },
];

const LUCIDE_FOR_KIND: Record<UploadKind, React.ComponentType<{ className?: string }>> = {
  video: Video,
  pdf: FileText,
  file: Paperclip,
  text: PenLine,
  quiz: HelpCircle,
  'ai-quiz': Sparkles,
  'pdf-quiz': FileQuestion,
};

// ── Props ───────────────────────────────────────────────

interface EditorSidebarProps {
  mapId: string;
  placedCheckpointIds?: string[];
  onRemoveNode?: (checkpointId: string) => void;
  onRenameCheckpoint?: (checkpointId: string, title: string) => void;
}

// ── Component ───────────────────────────────────────────

export function EditorSidebar({ mapId, placedCheckpointIds = [], onRemoveNode, onRenameCheckpoint }: EditorSidebarProps) {
  const { data: chapters = [] } = useChaptersForMap(mapId);
  const { data: checkpoints = [] } = useCheckpointsForMap(mapId);
  const { data: contentItems = [] } = useContentItemsForMap(mapId);
  const addChapterMut = useAddChapter();
  const updateChapterMut = useUpdateChapter();
  const deleteChapterMut = useDeleteChapter();
  const addCheckpointMut = useAddCheckpoint();
  const updateCheckpointMut = useUpdateCheckpoint();
  const deleteCheckpointMut = useDeleteCheckpoint();
  const addContentItemMut = useAddContentItem();
  const updateContentItemMut = useUpdateContentItem();
  const deleteContentItemMut = useDeleteContentItem();
  const extractPdfMut = useExtractPdf();
  const transcribeVideoMut = useTranscribeVideo();
  const userId = useAuthStore((s) => s.user?.id);

  const placedSet = useMemo(() => new Set(placedCheckpointIds), [placedCheckpointIds]);

  // Accordion state: open chapters and open checkpoints
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [openCheckpoints, setOpenCheckpoints] = useState<Set<string>>(new Set());

  // Inline rename state — one chapter or checkpoint title at a time
  const [renaming, setRenaming] = useState<{ kind: 'chapter' | 'checkpoint'; id: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  function startRename(kind: 'chapter' | 'checkpoint', id: string, currentTitle: string) {
    setRenaming({ kind, id });
    setRenameDraft(currentTitle);
  }

  function commitRename() {
    if (!renaming) return;
    const title = renameDraft.trim();
    if (title) {
      if (renaming.kind === 'chapter') {
        updateChapterMut.mutate({ id: renaming.id, mapId, title });
      } else {
        updateCheckpointMut.mutate({ id: renaming.id, mapId, title });
        // Keep the canvas card label in sync with the new name
        onRenameCheckpoint?.(renaming.id, title);
      }
    }
    setRenaming(null);
  }

  // Add content dropdown state
  const [addDropdownCheckpointId, setAddDropdownCheckpointId] = useState<string | null>(null);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  // Upload modal state
  const [uploadModal, setUploadModal] = useState<{
    kind: UploadKind;
    fileName?: string;
    targetCheckpointId: string;
  } | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTextContent, setModalTextContent] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // AI Quiz modal state — separate from the regular upload modal because it
  // has its own preview/edit flow.
  const [aiQuizCheckpointId, setAIQuizCheckpointId] = useState<string | null>(null);

  // PDF Quiz modal state — upload a past-exam PDF, extract questions, then
  // pick which ones to keep.
  const [pdfQuizCheckpointId, setPdfQuizCheckpointId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadKindRef = useRef<UploadKind>('file');
  const pendingCheckpointIdRef = useRef<string>('');

  // Close dropdown on outside click
  useEffect(() => {
    if (!addDropdownCheckpointId) return;
    const handler = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddDropdownCheckpointId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addDropdownCheckpointId]);

  // ── Helpers ─────────────────────────────────────────

  function toggleChapter(id: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleCheckpoint(id: string) {
    setOpenCheckpoints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAddChapter() {
    const title = `Chapter ${chapters.length + 1}`;
    const chapter = await addChapterMut.mutateAsync({ mapId, title });
    setOpenChapters((prev) => new Set(prev).add(chapter.id));
  }

  function handleDeleteChapter(e: React.MouseEvent, chapterId: string) {
    e.stopPropagation();
    // Remove all placed checkpoints in this chapter from canvas
    const chapterCheckpoints = checkpoints.filter((cp) => cp.chapterId === chapterId);
    for (const cp of chapterCheckpoints) {
      if (placedSet.has(cp.id)) onRemoveNode?.(cp.id);
    }
    deleteChapterMut.mutate({ id: chapterId, mapId });
  }

  async function handleAddCheckpoint(chapterId: string) {
    const chapterCheckpoints = checkpoints.filter((cp) => cp.chapterId === chapterId);
    const title = `Checkpoint ${chapterCheckpoints.length + 1}`;
    const cp = await addCheckpointMut.mutateAsync({ chapterId, title, mapId });
    setOpenCheckpoints((prev) => new Set(prev).add(cp.id));
  }

  function handleDeleteCheckpoint(e: React.MouseEvent, checkpointId: string) {
    e.stopPropagation();
    if (placedSet.has(checkpointId)) onRemoveNode?.(checkpointId);
    deleteCheckpointMut.mutate({ id: checkpointId, mapId });
  }

  function handleDeleteContentItem(e: React.MouseEvent, itemId: string) {
    e.stopPropagation();
    deleteContentItemMut.mutate({ id: itemId, mapId });
  }

  function getCheckpointsForChapter(chapterId: string) {
    return checkpoints.filter((cp) => cp.chapterId === chapterId).sort((a, b) => a.order - b.order);
  }

  function getItemsForCheckpoint(checkpointId: string) {
    return contentItems.filter((ci) => ci.checkpointId === checkpointId).sort((a, b) => a.order - b.order);
  }

  function handleDragStart(e: React.DragEvent, checkpoint: Checkpoint, chapterId: string) {
    e.dataTransfer.setData('application/json', JSON.stringify({
      checkpointId: checkpoint.id,
      title: checkpoint.title,
      chapterId,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }

  // ── Upload handlers ─────────────────────────────────

  function handleUploadClick(kind: UploadKind, checkpointId: string) {
    setAddDropdownCheckpointId(null);
    if (kind === 'ai-quiz') {
      setAIQuizCheckpointId(checkpointId);
      return;
    }
    if (kind === 'pdf-quiz') {
      setPdfQuizCheckpointId(checkpointId);
      return;
    }
    if (kind === 'text' || kind === 'quiz') {
      openUploadModal(kind, checkpointId);
      return;
    }
    pendingUploadKindRef.current = kind;
    pendingCheckpointIdRef.current = checkpointId;
    if (fileInputRef.current) {
      const opt = ADD_CONTENT_OPTIONS.find((o) => o.kind === kind);
      fileInputRef.current.accept = opt?.accept || '*/*';
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
    openUploadModal(pendingUploadKindRef.current, pendingCheckpointIdRef.current, file.name);
  }

  function openUploadModal(kind: UploadKind, checkpointId: string, fileName?: string) {
    setUploadModal({ kind, fileName, targetCheckpointId: checkpointId });
    setModalTitle(fileName ? fileName.replace(/\.[^.]+$/, '') : '');
    setModalTextContent('');
  }

  function closeUploadModal() {
    setUploadModal(null);
    setModalTitle('');
    setModalTextContent('');
    setPendingFile(null);
    setUploading(false);
    setExtractingAudio(false);
    setTranscribing(false);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const [extracting, setExtracting] = useState(false);
  const [extractingAudio, setExtractingAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleConfirmUpload() {
    console.debug('[EditorSidebar] handleConfirmUpload start', {
      kind: uploadModal?.kind,
      title: modalTitle,
      hasFile: !!pendingFile,
      fileName: pendingFile?.name,
      fileSize: pendingFile?.size,
      userId,
    });
    if (!uploadModal || !modalTitle.trim()) {
      console.warn('[EditorSidebar] aborted: missing modal or title');
      return;
    }
    // 'ai-quiz' never reaches this branch (handled before the upload modal opens)
    // but the Record type still needs every key.
    const typeMap: Record<UploadKind, ContentItemType> = { video: 'video', pdf: 'pdf', file: 'file', text: 'text', quiz: 'quiz', 'ai-quiz': 'quiz', 'pdf-quiz': 'quiz' };
    setUploading(true);
    setExtractionError(null);
    setUploadError(null);
    try {
      let fileUrl: string | undefined;
      if (pendingFile && userId && ['video', 'pdf', 'file'].includes(uploadModal.kind)) {
        console.debug('[EditorSidebar] step 1/4: uploading file to Storage');
        fileUrl = await uploadFile(userId, pendingFile, mapId);
        console.debug('[EditorSidebar] step 1/4 done, fileUrl:', fileUrl);
      } else {
        console.debug('[EditorSidebar] step 1/4 skipped (no file or text/quiz item)');
      }

      console.debug('[EditorSidebar] step 2/4: creating content_item row');
      const item = await addContentItemMut.mutateAsync({
        checkpointId: uploadModal.targetCheckpointId,
        type: typeMap[uploadModal.kind],
        title: modalTitle.trim(),
        mapId,
      });
      console.debug('[EditorSidebar] step 2/4 done, item id:', item.id);

      if (fileUrl) {
        console.debug('[EditorSidebar] step 3/4: saving file_url to content_item');
        await updateContentItemMut.mutateAsync({ id: item.id, mapId, fileUrl });
        console.debug('[EditorSidebar] step 3/4 done');
      } else {
        console.debug('[EditorSidebar] step 3/4 skipped (no fileUrl)');
      }

      if (uploadModal.kind === 'text' && modalTextContent.trim()) {
        console.debug('[EditorSidebar] saving text content');
        await updateContentItemMut.mutateAsync({ id: item.id, mapId, textContent: modalTextContent.trim() });
        console.debug('[EditorSidebar] text content saved');
      }

      // Extract text from PDFs server-side. Done after the file_url is saved
      // so the edge function can fetch it from Storage.
      if (uploadModal.kind === 'pdf' && fileUrl) {
        console.debug('[EditorSidebar] step 4/4: invoking extract-pdf edge function');
        setExtracting(true);
        try {
          const result = await extractPdfMut.mutateAsync({ contentItemId: item.id, mapId });
          console.debug('[EditorSidebar] step 4/4 done, extracted', result);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'PDF text extraction failed';
          console.error('[EditorSidebar] step 4/4 failed:', err);
          setExtractionError(
            `${message}. The PDF was uploaded but the AI tutor won't be able to reference its contents until extraction succeeds.`,
          );
        }
        setExtracting(false);
      }

      // Transcribe videos via Whisper. We extract the audio track in the
      // browser first (Whisper has a 25MB upload cap) and upload it as a
      // sidecar, then the edge function fetches that audio and transcribes
      // it. Same failure mode as PDFs: if anything goes wrong the video is
      // still uploaded and playable, just without an AI-readable transcript.
      if (uploadModal.kind === 'video' && pendingFile && fileUrl && userId) {
        try {
          console.debug('[EditorSidebar] step 4/6: extracting audio in browser');
          setExtractingAudio(true);
          const audioBlob = await extractAudioFromVideo(pendingFile);
          const audioFileName = `${pendingFile.name.replace(/\.[^.]+$/, '')}.m4a`;
          const audioFile = new File([audioBlob], audioFileName, { type: 'audio/mp4' });
          console.debug('[EditorSidebar] step 4/6 done, audio size:', audioFile.size);

          console.debug('[EditorSidebar] step 5/6: uploading audio sidecar');
          const audioUrl = await uploadFile(userId, audioFile, mapId);
          console.debug('[EditorSidebar] step 5/6 done, audioUrl:', audioUrl);

          await updateContentItemMut.mutateAsync({
            id: item.id,
            mapId,
            metadata: { audioUrl },
          });
          setExtractingAudio(false);

          console.debug('[EditorSidebar] step 6/6: invoking transcribe-video edge function');
          setTranscribing(true);
          const result = await transcribeVideoMut.mutateAsync({ contentItemId: item.id, mapId });
          console.debug('[EditorSidebar] step 6/6 done, transcribed', result);
          setTranscribing(false);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Video transcription failed';
          console.error('[EditorSidebar] video transcription failed:', err);
          setExtractionError(
            `${message}. The video was uploaded but the AI tutor won't be able to reference its contents until transcription succeeds.`,
          );
          setExtractingAudio(false);
          setTranscribing(false);
        }
      }

      console.debug('[EditorSidebar] all steps complete, closing modal');
      closeUploadModal();
    } catch (err) {
      console.error('[EditorSidebar] Upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploading(false);
      setExtracting(false);
      setExtractingAudio(false);
      setTranscribing(false);
    }
  }

  // ── Render ──────────────────────────────────────────

  return (
    <div className="w-80 h-full border-l border-white/10 bg-brand-dark-card flex flex-col overflow-hidden">
      <div className="flex items-center border-b border-white/10 shrink-0 px-4 py-3">
        <span className="text-[10px] font-medium tracking-[0.18em] uppercase text-brand-accent">Content</span>
      </div>

      {extractionError && (
        <div className="shrink-0 mx-3 mt-3 px-3 py-2 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-xs text-brand-accent flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="flex-1">{extractionError}</span>
          <button
            onClick={() => setExtractionError(null)}
            className="text-brand-accent/70 hover:text-brand-accent leading-none"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
          {chapters.length === 0 && (
            <p className="text-sm text-[#6b7280] text-center py-8">No chapters yet. Add one to get started.</p>
          )}

          {chapters.map((chapter, chapterIndex) => {
            const isChapterOpen = openChapters.has(chapter.id);
            const chapterCheckpoints = getCheckpointsForChapter(chapter.id);
            const sectionColor = SECTION_COLORS[chapterIndex % SECTION_COLORS.length];

            return (
              <div key={chapter.id} className="border border-white/10 rounded-xl overflow-hidden bg-brand-dark-lighter">
                <div className="h-1" style={{ backgroundColor: sectionColor }} />

                {/* Chapter header */}
                <div
                  onClick={() => toggleChapter(chapter.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 transition-colors text-left cursor-pointer group/chapter"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20" style={{ backgroundColor: sectionColor }} />
                  <motion.span animate={{ rotate: isChapterOpen ? 90 : 0 }} transition={{ duration: 0.15 }} className="text-[#6b7280] inline-flex">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.span>
                  {renaming?.kind === 'chapter' && renaming.id === chapter.id ? (
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      autoFocus
                      className="flex-1 min-w-0 text-sm font-medium text-white bg-white/10 border border-brand-accent/50 rounded-md outline-none px-1.5 py-0.5"
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm font-medium text-white/90 truncate"
                      onDoubleClick={(e) => { e.stopPropagation(); startRename('chapter', chapter.id, chapter.title); }}
                      title="Double-click to rename"
                    >
                      {chapter.title}
                    </span>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); startRename('chapter', chapter.id, chapter.title); }}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-[#6b7280] hover:text-brand-accent hover:bg-brand-accent/10 transition-colors opacity-0 group-hover/chapter:opacity-100"
                    title="Rename chapter"
                  >
                    <PenLine className="w-3 h-3" />
                  </span>
                  <span className="text-[10px] text-[#6b7280] tabular-nums font-medium">{chapterCheckpoints.length}</span>
                  <span role="button" tabIndex={0} onClick={(e) => handleDeleteChapter(e, chapter.id)} className="ml-1 w-6 h-6 flex items-center justify-center rounded-full text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Checkpoints within chapter */}
                <AnimatePresence initial={false}>
                  {isChapterOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="p-2 space-y-1.5 bg-brand-dark-card">
                        {chapterCheckpoints.length === 0 && (
                          <p className="text-xs text-[#6b7280] text-center py-2">No checkpoints yet.</p>
                        )}

                        {chapterCheckpoints.map((checkpoint) => {
                          const isPlaced = placedSet.has(checkpoint.id);
                          const isCheckpointOpen = openCheckpoints.has(checkpoint.id);
                          const items = getItemsForCheckpoint(checkpoint.id);

                          return (
                            <div key={checkpoint.id} className="border border-white/10 rounded-lg bg-white/[0.03]">
                              {/* Checkpoint header — draggable (except while renaming) */}
                              <div
                                draggable={!(renaming?.kind === 'checkpoint' && renaming.id === checkpoint.id)}
                                onDragStart={(e) => handleDragStart(e, checkpoint, chapter.id)}
                                className="flex items-center gap-2 px-2.5 py-2 cursor-grab active:cursor-grabbing group"
                              >
                                <GripVertical className="w-3.5 h-3.5 text-[#6b7280]/70 group-hover:text-[#9ca3af] shrink-0" />
                                <button onClick={(e) => { e.stopPropagation(); toggleCheckpoint(checkpoint.id); }} className="shrink-0">
                                  <motion.span animate={{ rotate: isCheckpointOpen ? 90 : 0 }} transition={{ duration: 0.12 }} className="text-[#6b7280] inline-flex">
                                    <ChevronRight className="w-3 h-3" />
                                  </motion.span>
                                </button>
                                {renaming?.kind === 'checkpoint' && renaming.id === checkpoint.id ? (
                                  <input
                                    value={renameDraft}
                                    onChange={(e) => setRenameDraft(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={commitRename}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') commitRename();
                                      if (e.key === 'Escape') setRenaming(null);
                                    }}
                                    autoFocus
                                    className="flex-1 min-w-0 text-sm font-medium text-white bg-white/10 border border-brand-accent/50 rounded-md outline-none px-1.5 py-0.5"
                                  />
                                ) : (
                                  <span
                                    className="flex-1 text-sm text-white/90 truncate font-medium"
                                    onDoubleClick={(e) => { e.stopPropagation(); startRename('checkpoint', checkpoint.id, checkpoint.title); }}
                                    title="Double-click to rename"
                                  >
                                    {checkpoint.title}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); startRename('checkpoint', checkpoint.id, checkpoint.title); }}
                                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[#6b7280] hover:text-brand-accent hover:bg-brand-accent/10 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Rename checkpoint"
                                >
                                  <PenLine className="w-3 h-3" />
                                </button>
                                {items.length > 0 && (
                                  <span className="text-[10px] text-[#6b7280] tabular-nums">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                                )}
                                {isPlaced && <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0" title="Placed on canvas" />}
                                <button onClick={(e) => handleDeleteCheckpoint(e, checkpoint.id)} className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Delete checkpoint">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Content items within checkpoint */}
                              <AnimatePresence initial={false}>
                                {isCheckpointOpen && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                                    <div className="px-2 pb-2 space-y-1 border-t border-white/10 pt-1.5">
                                      {items.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 group/item">
                                          <span className="shrink-0">{TYPE_ICONS[item.type]}</span>
                                          <span className="flex-1 text-[#9ca3af] truncate">{item.title}</span>
                                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[item.type]}`}>{item.type}</span>
                                          <button onClick={(e) => handleDeleteContentItem(e, item.id)} className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover/item:opacity-100">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}

                                      {/* Add content dropdown */}
                                      <AddContentButton
                                        checkpointId={checkpoint.id}
                                        isOpen={addDropdownCheckpointId === checkpoint.id}
                                        onToggle={() => setAddDropdownCheckpointId(addDropdownCheckpointId === checkpoint.id ? null : checkpoint.id)}
                                        onSelect={(kind) => handleUploadClick(kind, checkpoint.id)}
                                        dropdownRef={addDropdownCheckpointId === checkpoint.id ? addDropdownRef : undefined}
                                      />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}

                        {/* Add checkpoint button */}
                        <button
                          onClick={() => handleAddCheckpoint(chapter.id)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-[#9ca3af] hover:text-brand-accent hover:bg-brand-accent/5 rounded-lg border border-dashed border-white/15 hover:border-brand-accent/40 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Checkpoint
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <button onClick={handleAddChapter} className="w-full py-2.5 border-2 border-dashed border-white/15 rounded-xl text-sm text-[#9ca3af] hover:border-brand-accent/40 hover:text-brand-accent hover:bg-brand-accent/5 transition-colors">
            <span className="inline-flex items-center gap-1.5 justify-center"><Plus className="w-4 h-4" /> Add Chapter</span>
          </button>
        </div>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {uploadModal && (
          <UploadModal
            kind={uploadModal.kind}
            fileName={uploadModal.fileName}
            checkpointName={checkpoints.find((cp) => cp.id === uploadModal.targetCheckpointId)?.title ?? ''}
            title={modalTitle}
            textContent={modalTextContent}
            uploading={uploading}
            extracting={extracting}
            extractingAudio={extractingAudio}
            transcribing={transcribing}
            uploadError={uploadError}
            onTitleChange={setModalTitle}
            onTextContentChange={setModalTextContent}
            onConfirm={handleConfirmUpload}
            onCancel={closeUploadModal}
          />
        )}
      </AnimatePresence>

      {/* AI Quiz modal */}
      <AnimatePresence>
        {aiQuizCheckpointId && (
          <AIQuizModal
            checkpointId={aiQuizCheckpointId}
            checkpointName={checkpoints.find((cp) => cp.id === aiQuizCheckpointId)?.title ?? ''}
            mapId={mapId}
            onClose={() => setAIQuizCheckpointId(null)}
          />
        )}
      </AnimatePresence>

      {/* PDF Quiz modal */}
      <AnimatePresence>
        {pdfQuizCheckpointId && (
          <PdfQuizModal
            checkpointId={pdfQuizCheckpointId}
            checkpointName={checkpoints.find((cp) => cp.id === pdfQuizCheckpointId)?.title ?? ''}
            mapId={mapId}
            onClose={() => setPdfQuizCheckpointId(null)}
          />
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelected(file); }} />
    </div>
  );
}

// ── Add Content Button ───────────────────────────────────

function AddContentButton({ checkpointId: _cp, isOpen, onToggle, onSelect, dropdownRef }: {
  checkpointId: string; isOpen: boolean; onToggle: () => void; onSelect: (kind: UploadKind) => void; dropdownRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    } else {
      setMenuPos(null);
    }
  }, [isOpen]);

  return (
    <>
      <button ref={buttonRef} onClick={(e) => { e.stopPropagation(); onToggle(); }} className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-[#9ca3af] hover:text-brand-accent hover:bg-brand-accent/5 rounded-lg border border-dashed border-white/10 hover:border-brand-accent/40 transition-colors">
        <Plus className="w-3 h-3" />
        Add content
      </button>
      {isOpen && menuPos && createPortal(
        <div ref={dropdownRef} className="fixed bg-brand-dark-card rounded-xl shadow-2xl border border-white/10 py-1 z-[60]" style={{ top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 160) }}>
          {ADD_CONTENT_OPTIONS.map((opt) => {
            const Icon = LUCIDE_FOR_KIND[opt.kind];
            return (
              <button key={opt.kind} onClick={(e) => { e.stopPropagation(); onSelect(opt.kind); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/90 hover:bg-white/5 hover:text-brand-accent transition-colors text-left">
                <Icon className="w-3.5 h-3.5 text-[#9ca3af]" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Upload Modal ─────────────────────────────────────────

function UploadModal({ kind, fileName, checkpointName, title, textContent, uploading, extracting, extractingAudio, transcribing, uploadError, onTitleChange, onTextContentChange, onConfirm, onCancel }: {
  kind: UploadKind; fileName?: string; checkpointName: string; title: string; textContent: string; uploading: boolean; extracting?: boolean; extractingAudio?: boolean; transcribing?: boolean;
  uploadError?: string | null;
  onTitleChange: (v: string) => void; onTextContentChange: (v: string) => void; onConfirm: () => void; onCancel: () => void;
}) {
  const isValid = title.trim().length > 0 && !uploading && !extracting && !extractingAudio && !transcribing;
  const buttonLabel = extractingAudio
    ? 'Extracting audio...'
    : transcribing
      ? 'Transcribing video...'
      : extracting
        ? 'Extracting text...'
        : uploading
          ? 'Uploading...'
          : 'Add Item';
  // 'ai-quiz' uses its own modal so this label is unused for that kind, but
  // the Record type still needs every key.
  const kindLabel: Record<UploadKind, string> = { video: 'Video', pdf: 'PDF', file: 'File', text: 'Text Content', quiz: 'Quiz', 'ai-quiz': 'AI Quiz', 'pdf-quiz': 'Quiz from PDF/Word' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl w-[360px] max-h-[80vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-brand-accent mb-1">New Item</div>
          <h3 className="text-base font-semibold text-white">Add {kindLabel[kind]}</h3>
          <p className="text-xs text-[#6b7280] mt-1">Adding to <span className="font-medium text-[#9ca3af]">{checkpointName}</span></p>
          {fileName && <p className="text-xs text-[#6b7280] mt-0.5 truncate">{fileName}</p>}
        </div>
        <div className="px-5 py-5 space-y-4">
          {uploadError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-400/30 text-xs text-red-300 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-medium tracking-[0.12em] uppercase text-[#9ca3af] mb-1.5">Title</label>
            <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Enter a title..." className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors" autoFocus />
          </div>
          {kind === 'text' && (
            <div>
              <label className="block text-[10px] font-medium tracking-[0.12em] uppercase text-[#9ca3af] mb-1.5">Content</label>
              <textarea value={textContent} onChange={(e) => onTextContentChange(e.target.value)} placeholder="Enter your text content..." rows={5} className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 resize-none transition-colors" />
            </div>
          )}
          {kind === 'quiz' && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-4 text-center">
              <p className="text-sm text-[#6b7280]">Quiz builder coming soon.</p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={onCancel} disabled={uploading} className="flex-1 px-4 py-2 text-sm font-medium text-[#9ca3af] bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 rounded-full transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={onConfirm} disabled={!isValid} className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-colors ${isValid ? 'text-brand-dark bg-brand-accent hover:bg-brand-accent/90' : 'text-[#6b7280] bg-white/5 border border-white/10 cursor-not-allowed'}`}>{buttonLabel}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

import { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChaptersForMap, useAddChapter, useDeleteChapter } from '../../../hooks/useChapters';
import { useContentItemsForMap, useAddContentItem, useUpdateContentItem, useDeleteContentItem } from '../../../hooks/useContentItems';
import { useAuthStore } from '../../../stores/authStore';
import { uploadFile } from '../../../lib/storage';
import type { ContentItemType, Chapter } from '../../../types/admin';
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
  video: 'bg-indigo-100 text-indigo-700',
  pdf: 'bg-cyan-100 text-cyan-700',
  text: 'bg-green-100 text-green-700',
  file: 'bg-amber-100 text-amber-700',
  quiz: 'bg-red-100 text-red-700',
};

type UploadKind = 'video' | 'pdf' | 'file' | 'text' | 'quiz';

const ADD_OPTIONS: { kind: UploadKind; label: string; icon: string; accept?: string }[] = [
  { kind: 'video', label: 'Video', icon: '\u{1F3AC}', accept: 'video/*' },
  { kind: 'pdf', label: 'PDF', icon: '\u{1F4C4}', accept: 'application/pdf' },
  { kind: 'file', label: 'File', icon: '\u{1F4CE}', accept: '*/*' },
  { kind: 'text', label: 'Text', icon: '\u{1F4DD}' },
  { kind: 'quiz', label: 'Quiz', icon: '\u2694\uFE0F' },
];

// ── Props ───────────────────────────────────────────────

interface EditorSidebarProps {
  mapId: string;
  placedItemIds?: string[];
  onRemoveNode?: (contentItemId: string) => void;
}

// ── Component ───────────────────────────────────────────

export function EditorSidebar({ mapId, placedItemIds = [], onRemoveNode }: EditorSidebarProps) {
  const { data: chapters = [] } = useChaptersForMap(mapId);
  const { data: contentItems = [] } = useContentItemsForMap(mapId);
  const addChapterMut = useAddChapter();
  const deleteChapterMut = useDeleteChapter();
  const addContentItemMut = useAddContentItem();
  const updateContentItemMut = useUpdateContentItem();
  const deleteContentItemMut = useDeleteContentItem();
  const userId = useAuthStore((s) => s.user?.id);

  const placedSet = useMemo(() => new Set(placedItemIds), [placedItemIds]);

  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());

  // "Add content" dropdown state — which chapter's dropdown is open
  const [addDropdownChapterId, setAddDropdownChapterId] = useState<string | null>(null);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  // Upload modal state
  const [uploadModal, setUploadModal] = useState<{
    kind: UploadKind;
    fileName?: string;
    targetChapterId: string;
  } | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTextContent, setModalTextContent] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadKindRef = useRef<UploadKind>('file');
  const pendingChapterIdRef = useRef<string>('');

  // Close add-dropdown on outside click
  useEffect(() => {
    if (!addDropdownChapterId) return;
    const handler = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddDropdownChapterId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addDropdownChapterId]);

  // ── Helpers ─────────────────────────────────────────

  function toggleChapter(id: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    deleteChapterMut.mutate({ id: chapterId, mapId });
    setOpenChapters((prev) => {
      const next = new Set(prev);
      next.delete(chapterId);
      return next;
    });
  }

  function handleDeleteContentItem(e: React.MouseEvent, itemId: string) {
    e.stopPropagation();
    // If placed on canvas, remove the node first
    if (placedSet.has(itemId)) {
      onRemoveNode?.(itemId);
    }
    deleteContentItemMut.mutate({ id: itemId, mapId });
  }

  function handleDragStart(
    e: React.DragEvent,
    item: { contentItemId: string; type: ContentItemType; title: string; chapterId: string },
  ) {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  }

  function getItemsForChapter(chapterId: string) {
    return contentItems
      .filter((ci) => ci.chapterId === chapterId)
      .sort((a, b) => a.order - b.order);
  }

  // ── Upload handlers ─────────────────────────────────

  function handleUploadClick(kind: UploadKind, chapterId: string) {
    setAddDropdownChapterId(null);
    if (kind === 'text' || kind === 'quiz') {
      openUploadModal(kind, chapterId);
      return;
    }
    pendingUploadKindRef.current = kind;
    pendingChapterIdRef.current = chapterId;
    if (fileInputRef.current) {
      const opt = ADD_OPTIONS.find((o) => o.kind === kind);
      fileInputRef.current.accept = opt?.accept || '*/*';
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
    openUploadModal(pendingUploadKindRef.current, pendingChapterIdRef.current, file.name);
  }

  function openUploadModal(kind: UploadKind, chapterId: string, fileName?: string) {
    setUploadModal({ kind, fileName, targetChapterId: chapterId });
    setModalTitle(fileName ? fileName.replace(/\.[^.]+$/, '') : '');
    setModalTextContent('');
  }

  function closeUploadModal() {
    setUploadModal(null);
    setModalTitle('');
    setModalTextContent('');
    setPendingFile(null);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleConfirmUpload() {
    if (!uploadModal || !modalTitle.trim()) return;

    const typeMap: Record<UploadKind, ContentItemType> = {
      video: 'video',
      pdf: 'pdf',
      file: 'file',
      text: 'text',
      quiz: 'quiz',
    };

    setUploading(true);
    console.log('[EditorSidebar] Starting upload:', { kind: uploadModal.kind, chapterId: uploadModal.targetChapterId, title: modalTitle });

    try {
      let fileUrl: string | undefined;
      if (pendingFile && userId && ['video', 'pdf', 'file'].includes(uploadModal.kind)) {
        fileUrl = await uploadFile(userId, pendingFile, mapId);
      }

      const item = await addContentItemMut.mutateAsync({
        chapterId: uploadModal.targetChapterId,
        type: typeMap[uploadModal.kind],
        title: modalTitle.trim(),
        mapId,
      });

      if (fileUrl) {
        await updateContentItemMut.mutateAsync({ id: item.id, mapId, fileUrl });
      }
      if (uploadModal.kind === 'text' && modalTextContent.trim()) {
        await updateContentItemMut.mutateAsync({ id: item.id, mapId, textContent: modalTextContent.trim() });
      }

      console.log('[EditorSidebar] Upload complete, item:', item.id);
      closeUploadModal();
    } catch (err) {
      console.error('[EditorSidebar] Upload failed:', err);
      setUploading(false);
    }
  }

  // ── Render ──────────────────────────────────────────

  return (
    <div className="w-80 h-full border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-gray-200 shrink-0 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">Content</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
          {chapters.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No chapters yet. Add one to get started.
            </p>
          )}

          {chapters.map((chapter, chapterIndex) => {
            const isOpen = openChapters.has(chapter.id);
            const items = getItemsForChapter(chapter.id);
            const sectionColor = SECTION_COLORS[chapterIndex % SECTION_COLORS.length];

            return (
              <div key={chapter.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Color accent bar */}
                <div className="h-1" style={{ backgroundColor: sectionColor }} />

                {/* Chapter header */}
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
                    style={{ backgroundColor: sectionColor }}
                  />
                  <motion.span
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-gray-400 text-xs"
                  >
                    {'\u25B6'}
                  </motion.span>
                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                    {chapter.title}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {items.length}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleDeleteChapter(e, chapter.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDeleteChapter(e as unknown as React.MouseEvent, chapter.id);
                      }
                    }}
                    className="ml-1 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {'\u00D7'}
                  </span>
                </button>

                {/* Content items + add dropdown */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 space-y-1.5 bg-white">
                        {items.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-2">
                            No items yet.
                          </p>
                        )}

                        {items.map((item) => {
                          const isPlaced = placedSet.has(item.id);

                          return (
                            <div
                              key={item.id}
                              draggable="true"
                              onDragStart={(e) =>
                                handleDragStart(e, {
                                  contentItemId: item.id,
                                  type: item.type,
                                  title: item.title,
                                  chapterId: item.chapterId,
                                })
                              }
                              className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                            >
                              {/* Drag handle */}
                              <span className="text-gray-300 group-hover:text-gray-400 text-xs select-none leading-none">
                                {'\u22EE\u22EE'}
                              </span>

                              {/* Type icon */}
                              <span className="text-sm shrink-0">
                                {TYPE_ICONS[item.type]}
                              </span>

                              {/* Title */}
                              <span className="flex-1 text-sm text-gray-700 truncate">
                                {item.title}
                              </span>

                              {/* Placed indicator */}
                              {isPlaced && (
                                <span
                                  className="w-2 h-2 rounded-full bg-green-400 shrink-0"
                                  title="Placed on canvas"
                                />
                              )}

                              {/* Type badge */}
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[item.type]}`}
                              >
                                {item.type}
                              </span>

                              {/* Delete button */}
                              <button
                                onClick={(e) => handleDeleteContentItem(e, item.id)}
                                className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete item"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}

                        {/* Add content dropdown */}
                        <div className="pt-1">
                          <AddContentButton
                            chapterId={chapter.id}
                            isOpen={addDropdownChapterId === chapter.id}
                            onToggle={() =>
                              setAddDropdownChapterId(
                                addDropdownChapterId === chapter.id ? null : chapter.id
                              )
                            }
                            onSelect={(kind) => handleUploadClick(kind, chapter.id)}
                            dropdownRef={addDropdownChapterId === chapter.id ? addDropdownRef : undefined}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Add Chapter button */}
          <button
            onClick={handleAddChapter}
            className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            + Add Chapter
          </button>
        </div>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {uploadModal && (
          <UploadModal
            kind={uploadModal.kind}
            fileName={uploadModal.fileName}
            chapterName={chapters.find((c) => c.id === uploadModal.targetChapterId)?.title ?? ''}
            title={modalTitle}
            textContent={modalTextContent}
            uploading={uploading}
            onTitleChange={setModalTitle}
            onTextContentChange={setModalTextContent}
            onConfirm={handleConfirmUpload}
            onCancel={closeUploadModal}
          />
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />
    </div>
  );
}

// ── Add Content Button with fixed-position dropdown ──────

function AddContentButton({
  chapterId,
  isOpen,
  onToggle,
  onSelect,
  dropdownRef,
}: {
  chapterId: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (kind: UploadKind) => void;
  dropdownRef?: React.RefObject<HTMLDivElement | null>;
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
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-dashed border-gray-200 hover:border-indigo-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add content
      </button>

      {isOpen && menuPos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[60]"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {ADD_OPTIONS.map((opt) => (
            <button
              key={opt.kind}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(opt.kind);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Upload Modal ──────────────────────────────────────────

function UploadModal({
  kind,
  fileName,
  chapterName,
  title,
  textContent,
  uploading,
  onTitleChange,
  onTextContentChange,
  onConfirm,
  onCancel,
}: {
  kind: UploadKind;
  fileName?: string;
  chapterName: string;
  title: string;
  textContent: string;
  uploading: boolean;
  onTitleChange: (v: string) => void;
  onTextContentChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isValid = title.trim().length > 0 && !uploading;

  const kindLabel: Record<UploadKind, string> = {
    video: 'Video',
    pdf: 'PDF',
    file: 'File',
    text: 'Text Content',
    quiz: 'Quiz',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-[340px] max-h-[80vh] overflow-y-auto"
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-gray-800">
            Add {kindLabel[kind]}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Adding to <span className="font-medium text-gray-500">{chapterName}</span>
          </p>
          {fileName && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{fileName}</p>
          )}
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter a title..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {kind === 'text' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
              <textarea
                value={textContent}
                onChange={(e) => onTextContentChange(e.target.value)}
                placeholder="Enter your text content..."
                rows={5}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {kind === 'quiz' && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-4 text-center">
              <p className="text-sm text-gray-400">Quiz builder coming soon.</p>
              <p className="text-xs text-gray-300 mt-1">A placeholder item will be created.</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onCancel}
              disabled={uploading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!isValid}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isValid
                  ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
            >
              {uploading ? 'Uploading...' : 'Add Item'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

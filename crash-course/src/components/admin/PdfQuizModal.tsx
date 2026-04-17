import { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  X, Upload, FileText, AlertTriangle, CheckSquare, Square, Plus, FileX,
} from 'lucide-react';
import { useExtractQuizFromPdf, type SkippedQuestion } from '../../hooks/useExtractQuizFromPdf';
import { useAddContentItem } from '../../hooks/useContentItems';
import { BrandButton } from '../ui';
import { QuestionEditor, makeBlankQuestion } from './QuestionEditor';
import type { QuizQuestion, QuizData } from '../../types/admin';

interface PdfQuizModalProps {
  checkpointId: string;
  checkpointName: string;
  mapId: string;
  onClose: () => void;
}

type Phase = 'upload' | 'extracting' | 'review';

export function PdfQuizModal({ checkpointId, checkpointName, mapId, onClose }: PdfQuizModalProps) {
  const extractMut = useExtractQuizFromPdf();
  const addContentItemMut = useAddContentItem();

  const [phase, setPhase] = useState<Phase>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('Quiz from PDF');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [skipped, setSkipped] = useState<SkippedQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [passingScore, setPassingScore] = useState(70);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExtracting = extractMut.isPending;

  const selectedCount = useMemo(
    () => questions.filter((q) => selectedIds.has(q.id)).length,
    [questions, selectedIds],
  );

  function handleFileChosen(next: File | null) {
    if (!next) return;
    const lower = next.name.toLowerCase();
    const isPdf = next.type === 'application/pdf' || lower.endsWith('.pdf');
    const isDocx =
      next.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lower.endsWith('.docx');
    if (!isPdf && !isDocx) {
      setError('Please upload a PDF or Word (.docx) file. Older .doc files are not supported — re-save as .docx.');
      return;
    }
    setError(null);
    setFile(next);
  }

  async function handleExtract() {
    if (!file) return;
    setError(null);
    setPhase('extracting');
    try {
      const result = await extractMut.mutateAsync({ file });
      const titleFromFilename = file.name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim();
      if (titleFromFilename.length > 0) setTitle(titleFromFilename);
      setQuestions(result.quiz.questions);
      setSkipped(result.skipped);
      // Default all extracted questions to selected.
      setSelectedIds(new Set(result.quiz.questions.map((q) => q.id)));
      setPassingScore(result.quiz.passingScore);
      setPhase('review');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      setError(message);
      setPhase('upload');
    }
  }

  function toggleQuestion(id: string, include: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (include) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(questions.map((q) => q.id)));
  }
  function selectNone() {
    setSelectedIds(new Set());
  }

  function replaceQuestion(index: number, next: QuizQuestion) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)));
    // If the id changed (shouldn't, but defensively), keep selection in sync
    setSelectedIds((prev) => {
      const was = prev.has(questions[index].id);
      if (!was || next.id === questions[index].id) return prev;
      const set = new Set(prev);
      set.delete(questions[index].id);
      set.add(next.id);
      return set;
    });
  }

  function deleteQuestion(index: number) {
    const removed = questions[index];
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(removed.id);
      return next;
    });
  }

  function addBlankQuestion() {
    const blank = makeBlankQuestion('mcq');
    setQuestions((prev) => [...prev, blank]);
    setSelectedIds((prev) => new Set(prev).add(blank.id));
  }

  async function handleSave() {
    if (selectedCount === 0 || !title.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));
      const quizData: QuizData = {
        questions: selectedQuestions,
        passingScore,
      };
      await addContentItemMut.mutateAsync({
        checkpointId,
        type: 'quiz',
        title: title.trim(),
        mapId,
        quizData,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save quiz';
      setError(message);
      setIsSaving(false);
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-3xl max-h-[92vh] flex flex-col text-white"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-1 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Quiz from document
              </p>
              <h3 className="text-lg font-bold text-white tracking-tight">Extract a quiz from a past exam</h3>
              <p className="text-xs text-[#9ca3af] mt-1">
                For checkpoint <span className="font-medium text-white/80">{checkpointName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isExtracting || isSaving}
              className="p-2 text-[#6b7280] hover:text-white hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {phase === 'upload' && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Quiz title..."
                  className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors"
                />
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) handleFileChosen(dropped);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-brand-accent bg-brand-accent/10'
                    : file
                    ? 'border-brand-accent/40 bg-brand-accent/5'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                  className="hidden"
                  onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <FileText className="w-8 h-8 text-brand-accent mb-3" />
                    <p className="text-sm text-white font-medium">{file.name}</p>
                    <p className="text-xs text-[#9ca3af] mt-1">
                      {(file.size / 1024).toFixed(0)} KB · click to choose a different file
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#9ca3af] mb-3" />
                    <p className="text-sm text-white font-medium">Drop a PDF or Word doc here, or click to choose</p>
                    <p className="text-xs text-[#6b7280] mt-1">.pdf or .docx · answers expected in the document</p>
                  </>
                )}
              </div>
            </>
          )}

          {phase === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-[#9ca3af]">Uploading and parsing your document...</p>
              <p className="text-xs text-[#6b7280] mt-2">This usually takes 10–30 seconds.</p>
            </div>
          )}

          {phase === 'review' && (
            <div className="space-y-4">
              {/* Title + pass threshold */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2">Pass threshold</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]">%</span>
                  </div>
                </div>
              </div>

              {/* Selection bar */}
              <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm text-white font-semibold">
                    {selectedCount} of {questions.length} selected
                  </p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">
                    Only selected questions will be saved into the quiz.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9ca3af] hover:text-white hover:bg-white/5 rounded-full transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select all
                  </button>
                  <button
                    onClick={selectNone}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9ca3af] hover:text-white hover:bg-white/5 rounded-full transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    None
                  </button>
                </div>
              </div>

              {skipped.length > 0 && (
                <details className="rounded-xl bg-brand-accent/5 border border-brand-accent/20 px-4 py-3">
                  <summary className="text-sm font-medium text-brand-accent-light flex items-center gap-2 cursor-pointer select-none">
                    <FileX className="w-3.5 h-3.5" />
                    {skipped.length} {skipped.length === 1 ? 'question was' : 'questions were'} skipped
                  </summary>
                  <ul className="mt-3 space-y-2 text-xs text-[#9ca3af]">
                    {skipped.map((s, i) => (
                      <li key={i} className="border-l-2 border-brand-accent/40 pl-3">
                        <div className="text-white/80 line-clamp-2">{s.stem}</div>
                        <div className="text-[#6b7280] mt-0.5 italic">{s.reason}</div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Question bank */}
              <div className="space-y-3">
                {questions.map((q, qi) => (
                  <QuestionEditor
                    key={q.id}
                    index={qi}
                    question={q}
                    onChange={(next) => replaceQuestion(qi, next)}
                    onDelete={() => deleteQuestion(qi)}
                    selected={selectedIds.has(q.id)}
                    onToggleSelected={(next) => toggleQuestion(q.id, next)}
                  />
                ))}
                {questions.length === 0 && (
                  <p className="text-xs text-[#6b7280] text-center py-6">
                    No questions parsed. Try a different document or add a blank question below.
                  </p>
                )}
                <button
                  onClick={addBlankQuestion}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-[#9ca3af] hover:text-white bg-white/[0.02] hover:bg-white/5 border border-dashed border-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add question
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 shrink-0 flex items-center gap-2">
          <BrandButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isExtracting || isSaving}
          >
            {phase === 'review' ? 'Discard' : 'Cancel'}
          </BrandButton>

          <div className="flex-1" />

          {phase === 'upload' && (
            <BrandButton
              variant="primary"
              size="sm"
              onClick={handleExtract}
              disabled={!file || !title.trim()}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
            >
              Extract questions
            </BrandButton>
          )}

          {phase === 'review' && (
            <BrandButton
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || selectedCount === 0 || !title.trim()}
              isLoading={isSaving}
            >
              {isSaving
                ? 'Saving'
                : `Save quiz (${selectedCount} ${selectedCount === 1 ? 'question' : 'questions'})`}
            </BrandButton>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export default PdfQuizModal;

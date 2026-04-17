import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Sparkles, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useGenerateQuiz, type QuestionCount } from '../../hooks/useGenerateQuiz';
import { useAddContentItem } from '../../hooks/useContentItems';
import { BrandButton } from '../ui';
import { QuestionEditor, makeBlankQuestion } from './QuestionEditor';
import type { QuizData, QuizQuestion } from '../../types/admin';

interface AIQuizModalProps {
  checkpointId: string;
  checkpointName: string;
  mapId: string;
  onClose: () => void;
}

const QUESTION_COUNT_OPTIONS: QuestionCount[] = [3, 5, 10];

export function AIQuizModal({ checkpointId, checkpointName, mapId, onClose }: AIQuizModalProps) {
  const generateQuizMut = useGenerateQuiz();
  const addContentItemMut = useAddContentItem();

  const [title, setTitle] = useState('AI-Generated Quiz');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(5);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isGenerating = generateQuizMut.isPending;

  async function handleGenerate() {
    setError(null);
    try {
      const result = await generateQuizMut.mutateAsync({ checkpointId, questionCount });
      setQuiz(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Quiz generation failed';
      setError(message);
    }
  }

  async function handleSave() {
    if (!quiz || !title.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      await addContentItemMut.mutateAsync({
        checkpointId,
        type: 'quiz',
        title: title.trim(),
        mapId,
        quizData: quiz,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save quiz';
      setError(message);
      setIsSaving(false);
    }
  }

  function replaceQuestion(index: number, next: QuizQuestion) {
    if (!quiz) return;
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q, i) => (i === index ? next : q)),
    });
  }

  function deleteQuestion(index: number) {
    if (!quiz) return;
    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((_, i) => i !== index),
    });
  }

  function addBlankQuestion() {
    if (!quiz) return;
    setQuiz({
      ...quiz,
      questions: [...quiz.questions, makeBlankQuestion('mcq')],
    });
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
        className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-2xl max-h-[90vh] flex flex-col text-white"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                AI Quiz
              </p>
              <h3 className="text-lg font-bold text-white tracking-tight">Generate AI quiz</h3>
              <p className="text-xs text-[#9ca3af] mt-1">
                For checkpoint <span className="font-medium text-white/80">{checkpointName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating || isSaving}
              className="p-2 text-[#6b7280] hover:text-white hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Config row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isGenerating || isSaving}
                placeholder="Quiz title..."
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2">Questions</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value) as QuestionCount)}
                disabled={isGenerating || isSaving || !!quiz}
                className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors disabled:opacity-50"
              >
                {QUESTION_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n} className="bg-brand-dark-card">
                    {n} questions
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-sm text-brand-accent-light">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate state */}
          {!quiz && !isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <Sparkles className="w-6 h-6 text-brand-accent mb-3" />
              <p className="text-sm text-[#9ca3af] mb-5 max-w-sm text-center leading-relaxed">
                Pulls all PDF and text content under this checkpoint and asks GPT-4o-mini to generate a quiz.
              </p>
              <BrandButton
                variant="primary"
                size="md"
                onClick={handleGenerate}
                disabled={!title.trim()}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Generate quiz
              </BrandButton>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-[#9ca3af]">Generating {questionCount} questions...</p>
            </div>
          )}

          {quiz && !isGenerating && (
            <div className="space-y-3">
              {quiz.questions.map((q, qi) => (
                <QuestionEditor
                  key={q.id || qi}
                  index={qi}
                  question={q}
                  onChange={(next) => replaceQuestion(qi, next)}
                  onDelete={() => deleteQuestion(qi)}
                />
              ))}
              {quiz.questions.length === 0 && (
                <p className="text-xs text-[#6b7280] text-center py-6">All questions deleted. Regenerate or add a blank question.</p>
              )}
              <button
                onClick={addBlankQuestion}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-[#9ca3af] hover:text-white bg-white/[0.02] hover:bg-white/5 border border-dashed border-white/10 hover:border-white/20 rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add question
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 shrink-0 flex items-center gap-2">
          <BrandButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isGenerating || isSaving}
          >
            {quiz ? 'Discard' : 'Cancel'}
          </BrandButton>
          {quiz && (
            <BrandButton
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || isSaving}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Regenerate
            </BrandButton>
          )}
          <div className="flex-1" />
          {quiz && (
            <BrandButton
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isGenerating || isSaving || !title.trim() || quiz.questions.length === 0}
              isLoading={isSaving}
            >
              {isSaving ? 'Saving' : 'Save quiz'}
            </BrandButton>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

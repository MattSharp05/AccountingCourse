import { X, Plus, CheckCircle2 } from 'lucide-react';
import type { QuizQuestion, QuizQuestionType } from '../../types/admin';

interface QuestionEditorProps {
  index: number;
  question: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
  onDelete: () => void;
  /** Optional checkbox for selection-style lists (PDF quiz modal). */
  selected?: boolean;
  onToggleSelected?: (next: boolean) => void;
}

const TYPE_OPTIONS: { value: QuizQuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'numeric', label: 'Numeric' },
];

export function makeBlankQuestion(type: QuizQuestionType): QuizQuestion {
  const id = `q-${Math.random().toString(36).slice(2, 10)}`;
  if (type === 'short_answer') {
    return { id, type, question: '', expectedAnswer: '' };
  }
  if (type === 'numeric') {
    return { id, type, question: '', expectedValue: 0 };
  }
  return {
    id,
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
  };
}

/**
 * Convert between question types, preserving what makes sense and dropping
 * type-specific fields. No confirm dialog — the professor can undo by
 * switching back and re-entering fields.
 */
function convertType(q: QuizQuestion, to: QuizQuestionType): QuizQuestion {
  if (q.type === to) return q;
  const base = {
    id: q.id,
    question: q.question,
    explanation: q.explanation,
    points: q.points,
  };
  if (to === 'mcq') {
    return { ...base, type: 'mcq', options: ['', '', '', ''], correctIndex: 0 };
  }
  if (to === 'short_answer') {
    // If coming from MCQ, seed expected answer with the current correct option
    const seed = q.type === 'mcq' ? q.options[q.correctIndex] ?? '' : '';
    return { ...base, type: 'short_answer', expectedAnswer: seed };
  }
  return { ...base, type: 'numeric', expectedValue: 0 };
}

export function QuestionEditor({
  index,
  question,
  onChange,
  onDelete,
  selected,
  onToggleSelected,
}: QuestionEditorProps) {
  const showCheckbox = onToggleSelected !== undefined;

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        showCheckbox && !selected
          ? 'border-white/5 bg-white/[0.01] opacity-60'
          : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={(e) => onToggleSelected?.(e.target.checked)}
              className="accent-brand-accent w-4 h-4 cursor-pointer"
              aria-label={`Include question ${index + 1}`}
            />
          )}
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">
            Q{index + 1}
          </span>
          <select
            value={question.type}
            onChange={(e) => onChange(convertType(question, e.target.value as QuizQuestionType))}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/90 focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-brand-dark-card">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onDelete}
          className="p-1 text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
          aria-label="Delete question"
          title="Delete question"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Question stem */}
      <textarea
        value={question.question}
        onChange={(e) => onChange({ ...question, question: e.target.value })}
        placeholder="Question..."
        rows={2}
        className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent/50 resize-y font-sans"
      />

      {/* Type-specific editor */}
      {question.type === 'mcq' && <MCQEditor question={question} onChange={onChange} />}
      {question.type === 'short_answer' && (
        <ShortAnswerEditor question={question} onChange={onChange} />
      )}
      {question.type === 'numeric' && <NumericEditor question={question} onChange={onChange} />}

      {/* Shared: explanation */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6b7280] font-semibold mb-1">
          Explanation (shown after answering)
        </label>
        <textarea
          value={question.explanation ?? ''}
          onChange={(e) => onChange({ ...question, explanation: e.target.value })}
          placeholder="Optional explanation for the student..."
          rows={2}
          className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 resize-y font-sans"
        />
      </div>
    </div>
  );
}

function MCQEditor({
  question,
  onChange,
}: {
  question: Extract<QuizQuestion, { type: 'mcq' }>;
  onChange: (q: QuizQuestion) => void;
}) {
  const updateOption = (idx: number, value: string) => {
    const options = [...question.options];
    options[idx] = value;
    onChange({ ...question, options });
  };
  const addOption = () => {
    if (question.options.length >= 6) return;
    onChange({ ...question, options: [...question.options, ''] });
  };
  const removeOption = (idx: number) => {
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, i) => i !== idx);
    let correctIndex = question.correctIndex;
    if (idx === correctIndex) correctIndex = 0;
    else if (idx < correctIndex) correctIndex -= 1;
    onChange({ ...question, options, correctIndex });
  };

  return (
    <div className="space-y-1.5">
      {question.options.map((opt, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            type="radio"
            name={`correct-${question.id}`}
            checked={question.correctIndex === oi}
            onChange={() => onChange({ ...question, correctIndex: oi })}
            className="accent-brand-accent"
            aria-label={`Mark option ${oi + 1} as correct`}
          />
          <input
            type="text"
            value={opt}
            onChange={(e) => updateOption(oi, e.target.value)}
            placeholder={`Option ${oi + 1}`}
            className={`flex-1 px-2.5 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent/50 transition-colors ${
              question.correctIndex === oi
                ? 'bg-brand-accent/10 border border-brand-accent/40 text-white'
                : 'bg-white/5 border border-white/10 text-white/90'
            }`}
          />
          {question.options.length > 2 && (
            <button
              onClick={() => removeOption(oi)}
              className="p-1 text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
              aria-label={`Remove option ${oi + 1}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {question.options.length < 6 && (
        <button
          onClick={addOption}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#9ca3af] hover:text-white hover:bg-white/5 rounded-full transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add option
        </button>
      )}
    </div>
  );
}

function ShortAnswerEditor({
  question,
  onChange,
}: {
  question: Extract<QuizQuestion, { type: 'short_answer' }>;
  onChange: (q: QuizQuestion) => void;
}) {
  const altsRaw = (question.acceptableAnswers ?? []).join(' | ');
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6b7280] font-semibold mb-1">
          Expected answer
        </label>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-accent shrink-0" />
          <input
            type="text"
            value={question.expectedAnswer}
            onChange={(e) => onChange({ ...question, expectedAnswer: e.target.value })}
            placeholder="Expected answer text..."
            className="flex-1 px-2.5 py-1.5 text-sm bg-brand-accent/10 border border-brand-accent/40 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6b7280] font-semibold mb-1">
          Also accept (separated by <span className="font-mono">|</span>)
        </label>
        <input
          type="text"
          value={altsRaw}
          onChange={(e) => {
            const parts = e.target.value
              .split('|')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            onChange({
              ...question,
              acceptableAnswers: parts.length > 0 ? parts : undefined,
            });
          }}
          placeholder="alternate 1 | alternate 2"
          className="w-full px-2.5 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/90 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-[#9ca3af]">
        <input
          type="checkbox"
          checked={!!question.caseSensitive}
          onChange={(e) => onChange({ ...question, caseSensitive: e.target.checked })}
          className="accent-brand-accent"
        />
        Case-sensitive match
      </label>
    </div>
  );
}

function NumericEditor({
  question,
  onChange,
}: {
  question: Extract<QuizQuestion, { type: 'numeric' }>;
  onChange: (q: QuizQuestion) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-2">
        <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6b7280] font-semibold mb-1">
          Expected value
        </label>
        <input
          type="number"
          step="any"
          value={Number.isFinite(question.expectedValue) ? question.expectedValue : 0}
          onChange={(e) => onChange({ ...question, expectedValue: Number(e.target.value) })}
          className="w-full px-2.5 py-1.5 text-sm bg-brand-accent/10 border border-brand-accent/40 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6b7280] font-semibold mb-1">
          Tolerance ±
        </label>
        <input
          type="number"
          step="any"
          value={question.tolerance ?? 0}
          onChange={(e) => {
            const val = Number(e.target.value);
            onChange({ ...question, tolerance: Number.isFinite(val) && val > 0 ? val : undefined });
          }}
          className="w-full px-2.5 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/90 focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
        />
      </div>
      <div className="col-span-3">
        <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6b7280] font-semibold mb-1">
          Unit (cosmetic)
        </label>
        <input
          type="text"
          value={question.unit ?? ''}
          onChange={(e) => onChange({ ...question, unit: e.target.value || undefined })}
          placeholder="e.g. $, %, kg"
          className="w-full px-2.5 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/90 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
        />
      </div>
    </div>
  );
}

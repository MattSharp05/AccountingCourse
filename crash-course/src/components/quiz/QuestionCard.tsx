import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Zap } from 'lucide-react';
import { BrandButton } from '../ui';
import type { QuizQuestion } from '../../types/admin';

export type SubmittedAnswer =
  | { kind: 'mcq'; selectedIndex: number }
  | { kind: 'short_answer'; text: string }
  | { kind: 'numeric'; value: number | null; raw: string };

interface QuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: SubmittedAnswer) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  disabled = false,
}: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [numericAnswer, setNumericAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (isSubmitting || disabled) return;

    if (question.type === 'mcq') {
      if (selectedIndex === null) return;
      setIsSubmitting(true);
      onAnswer({ kind: 'mcq', selectedIndex });
      return;
    }
    if (question.type === 'short_answer') {
      if (!textAnswer.trim()) return;
      setIsSubmitting(true);
      onAnswer({ kind: 'short_answer', text: textAnswer });
      return;
    }
    if (question.type === 'numeric') {
      if (!numericAnswer.trim()) return;
      const parsed = parseNumericInput(numericAnswer);
      setIsSubmitting(true);
      onAnswer({ kind: 'numeric', value: parsed, raw: numericAnswer });
      return;
    }
  };

  const canSubmit =
    (question.type === 'mcq' && selectedIndex !== null) ||
    (question.type === 'short_answer' && textAnswer.trim().length > 0) ||
    (question.type === 'numeric' && numericAnswer.trim().length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-lg p-6 max-w-2xl mx-auto font-sans"
    >
      {/* Question header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-[#9ca3af] uppercase tracking-wide">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < questionNumber ? 'bg-brand-accent' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question text */}
      <h3 className="text-xl font-semibold text-white mb-6 whitespace-pre-wrap">
        {question.question}
      </h3>

      {/* Type-specific input */}
      {question.type === 'mcq' && (
        <div className="space-y-3 mb-6">
          {question.options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const letter = String.fromCharCode(65 + index);

            return (
              <motion.button
                key={index}
                whileHover={!disabled ? { scale: 1.01 } : {}}
                whileTap={!disabled ? { scale: 0.99 } : {}}
                onClick={() => !disabled && !isSubmitting && setSelectedIndex(index)}
                disabled={disabled}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  flex items-center gap-3
                  ${isSelected
                    ? 'border-brand-accent bg-brand-accent/10 text-white'
                    : 'border-white/10 bg-brand-dark-lighter hover:border-white/15 text-white/90'
                  }
                  ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                  ${isSelected
                    ? 'bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark'
                    : 'bg-white/5 text-[#9ca3af]'
                  }
                `}>
                  {letter}
                </div>
                <span className="flex-1">{option}</span>
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-brand-accent"
                  >
                    <Check className="w-5 h-5" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {question.type === 'short_answer' && (
        <div className="mb-6">
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={disabled || isSubmitting}
            placeholder="Type your answer..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark-lighter border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors resize-none font-sans"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <p className="mt-2 text-xs text-[#6b7280]">
            Answers are checked case-insensitively and ignore extra whitespace.
          </p>
        </div>
      )}

      {question.type === 'numeric' && (
        <div className="mb-6">
          <div className="relative">
            {question.unit && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] text-lg pointer-events-none">
                {question.unit}
              </span>
            )}
            <input
              type="text"
              inputMode="decimal"
              value={numericAnswer}
              onChange={(e) => setNumericAnswer(e.target.value)}
              disabled={disabled || isSubmitting}
              placeholder="Enter a number..."
              className={`w-full py-3 rounded-xl bg-brand-dark-lighter border border-white/10 text-white text-lg placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors font-sans ${
                question.unit ? 'pl-10 pr-4' : 'px-4'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">
            Numbers only. Commas and {question.unit ?? 'unit symbols'} are ignored.
          </p>
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <BrandButton
          onClick={handleSubmit}
          variant="accent"
          disabled={!canSubmit || disabled || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </BrandButton>
      </div>
    </motion.div>
  );
}

/** Strip currency symbols, commas, and spaces, then parse. */
export function parseNumericInput(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s%]/g, '').trim();
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

// Result overlay shown after answering
interface AnswerResultProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  damageDealt?: number;
  onContinue: () => void;
}

export function AnswerResult({
  isCorrect,
  correctAnswer,
  explanation,
  damageDealt = 0,
  onContinue,
}: AnswerResultProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-lg p-6 max-w-2xl mx-auto font-sans"
      >
        {/* Result header */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ type: 'spring', damping: 10 }}
            className="mb-4 flex justify-center"
          >
            {isCorrect ? (
              <div className="w-16 h-16 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-400" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-400/10 border border-red-400/30 flex items-center justify-center">
                <X className="w-10 h-10 text-red-400" />
              </div>
            )}
          </motion.div>
          <h3 className={`text-2xl font-bold ${
            isCorrect ? 'text-green-400' : 'text-red-400'
          }`}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h3>
          {isCorrect && damageDealt > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-brand-accent font-medium mt-2 flex items-center justify-center gap-1"
            >
              <Zap className="w-4 h-4" />
              {damageDealt} damage dealt to the boss!
            </motion.p>
          )}
        </motion.div>

        {/* Correct answer (if wrong) */}
        {!isCorrect && correctAnswer && (
          <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-white/90">
              <span className="font-semibold text-brand-accent">Correct answer:</span>{' '}
              <span className="whitespace-pre-wrap">{correctAnswer}</span>
            </p>
          </div>
        )}

        {/* Explanation */}
        {explanation && (
          <div className="rounded-xl p-4 mb-6 bg-brand-dark-lighter border border-white/10">
            <h4 className="font-semibold mb-2 text-brand-accent">
              Explanation
            </h4>
            <p className="text-white/90 whitespace-pre-wrap">
              {explanation}
            </p>
          </div>
        )}

        {/* Continue button */}
        <div className="flex justify-center">
          <BrandButton onClick={onContinue} variant="accent" size="lg">
            Continue
          </BrandButton>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QuestionCard;

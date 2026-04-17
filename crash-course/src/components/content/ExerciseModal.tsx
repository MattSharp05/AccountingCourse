import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, PartyPopper, BookOpen } from 'lucide-react';
import { BrandButton, ProgressBar } from '../ui';

interface ExerciseQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'fill-blank';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

interface ExerciseModalProps {
  title: string;
  instructions: string;
  questions: ExerciseQuestion[];
  onComplete: (score: number) => void;
}

export function ExerciseModal({
  title: _title,
  instructions,
  questions,
  onComplete,
}: ExerciseModalProps) {
  // title available via _title if needed for analytics/logging
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    setHasSubmitted(true);
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setHasSubmitted(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleFinish = () => {
    const score = Math.round((correctCount / questions.length) * 100);
    onComplete(score);
  };

  // Results screen
  if (isComplete) {
    const score = Math.round((correctCount / questions.length) * 100);
    const isPassing = score >= 70;

    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="mb-6 flex justify-center"
        >
          {isPassing ? (
            <PartyPopper className="w-16 h-16 text-brand-accent" />
          ) : (
            <BookOpen className="w-16 h-16 text-[#9ca3af]" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-4 font-display">
          Exercise Complete!
        </h2>

        <div className="mb-6">
          <div className="text-5xl font-bold mb-2 text-brand-accent">
            {score}%
          </div>
          <p className="text-[#9ca3af]">
            {correctCount} out of {questions.length} correct
          </p>
        </div>

        <div className={`p-4 rounded-xl mb-6 border ${
          isPassing
            ? 'bg-brand-accent/10 border-brand-accent/30 text-white/90'
            : 'bg-white/5 border-white/10 text-white/90'
        }`}>
          <p>
            {isPassing
              ? 'Great job! You demonstrated a solid understanding of the material.'
              : 'Good effort! Review the content and try again to improve your score.'}
          </p>
        </div>

        <BrandButton onClick={handleFinish} variant="primary" size="lg">
          Continue
        </BrandButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#9ca3af]">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-brand-accent">
            {correctCount} correct
          </span>
        </div>
        <ProgressBar value={progress} variant="default" size="sm" />
      </div>

      {/* Instructions (first question only) */}
      {currentIndex === 0 && (
        <div className="bg-brand-accent/10 p-4 rounded-xl border border-brand-accent/30">
          <h4 className="font-semibold text-brand-accent mb-1">Instructions</h4>
          <p className="text-white/90 text-sm">{instructions}</p>
        </div>
      )}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-white">
            {currentQuestion.question}
          </h3>

          {/* Multiple choice options */}
          {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === currentQuestion.correctAnswer;

                let bgColor = 'bg-brand-dark-lighter hover:bg-white/5';
                let borderColor = 'border-white/10';
                let textColor = 'text-white/90';

                if (hasSubmitted) {
                  if (isCorrectAnswer) {
                    bgColor = 'bg-brand-accent/10';
                    borderColor = 'border-brand-accent';
                    textColor = 'text-white';
                  } else if (isSelected && !isCorrectAnswer) {
                    bgColor = 'bg-red-500/10';
                    borderColor = 'border-red-500/60';
                    textColor = 'text-white';
                  }
                } else if (isSelected) {
                  bgColor = 'bg-brand-accent/10';
                  borderColor = 'border-brand-accent';
                  textColor = 'text-white';
                }

                return (
                  <motion.button
                    key={index}
                    whileHover={!hasSubmitted ? { scale: 1.01 } : {}}
                    whileTap={!hasSubmitted ? { scale: 0.99 } : {}}
                    onClick={() => !hasSubmitted && setSelectedAnswer(index)}
                    disabled={hasSubmitted}
                    className={`
                      w-full p-4 rounded-xl border-2 text-left
                      transition-colors duration-200
                      ${bgColor} ${borderColor} ${textColor}
                      ${!hasSubmitted ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'border-brand-accent bg-brand-accent' : 'border-white/20'}
                      `}>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-brand-dark" />
                        )}
                      </div>
                      <span className="flex-1">{option}</span>
                      {hasSubmitted && isCorrectAnswer && (
                        <span className="inline-flex items-center gap-1 text-brand-accent text-sm">
                          <Check className="w-4 h-4" /> Correct
                        </span>
                      )}
                      {hasSubmitted && isSelected && !isCorrectAnswer && (
                        <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                          <X className="w-4 h-4" /> Incorrect
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Explanation after submission */}
          {hasSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                isCorrect
                  ? 'bg-brand-accent/10 border-brand-accent/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <h4 className={`font-semibold mb-1 ${
                isCorrect ? 'text-brand-accent' : 'text-white'
              }`}>
                {isCorrect ? 'Correct!' : 'Explanation:'}
              </h4>
              <p className="text-white/90">
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        {!hasSubmitted ? (
          <BrandButton
            onClick={handleSubmit}
            variant="primary"
            disabled={selectedAnswer === null}
          >
            Check Answer
          </BrandButton>
        ) : (
          <BrandButton onClick={handleNext} variant="primary">
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </BrandButton>
        )}
      </div>
    </div>
  );
}

export default ExerciseModal;

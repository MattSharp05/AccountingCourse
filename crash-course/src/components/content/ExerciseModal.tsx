import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, ProgressBar } from '../ui';

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
          className="text-6xl mb-6"
        >
          {isPassing ? '🎉' : '📚'}
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4 font-display">
          Exercise Complete!
        </h2>

        <div className="mb-6">
          <div className="text-5xl font-bold mb-2" style={{
            color: isPassing ? '#10b981' : '#f59e0b'
          }}>
            {score}%
          </div>
          <p className="text-gray-600">
            {correctCount} out of {questions.length} correct
          </p>
        </div>

        <div className={`p-4 rounded-lg mb-6 ${
          isPassing ? 'bg-accent-50 text-accent-800' : 'bg-secondary-50 text-secondary-800'
        }`}>
          <p>
            {isPassing
              ? 'Great job! You demonstrated a solid understanding of the material.'
              : 'Good effort! Review the content and try again to improve your score.'}
          </p>
        </div>

        <Button onClick={handleFinish} variant="primary" size="lg">
          Continue →
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-primary-600">
            {correctCount} correct
          </span>
        </div>
        <ProgressBar value={progress} variant="default" size="sm" />
      </div>

      {/* Instructions (first question only) */}
      {currentIndex === 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1">Instructions</h4>
          <p className="text-blue-600 text-sm">{instructions}</p>
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
          <h3 className="text-lg font-semibold text-gray-800">
            {currentQuestion.question}
          </h3>

          {/* Multiple choice options */}
          {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === currentQuestion.correctAnswer;

                let bgColor = 'bg-white hover:bg-gray-50';
                let borderColor = 'border-gray-200';
                let textColor = 'text-gray-700';

                if (hasSubmitted) {
                  if (isCorrectAnswer) {
                    bgColor = 'bg-accent-50';
                    borderColor = 'border-accent-500';
                    textColor = 'text-accent-800';
                  } else if (isSelected && !isCorrectAnswer) {
                    bgColor = 'bg-error-50';
                    borderColor = 'border-error-500';
                    textColor = 'text-error-800';
                  }
                } else if (isSelected) {
                  bgColor = 'bg-primary-50';
                  borderColor = 'border-primary-500';
                  textColor = 'text-primary-800';
                }

                return (
                  <motion.button
                    key={index}
                    whileHover={!hasSubmitted ? { scale: 1.01 } : {}}
                    whileTap={!hasSubmitted ? { scale: 0.99 } : {}}
                    onClick={() => !hasSubmitted && setSelectedAnswer(index)}
                    disabled={hasSubmitted}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left
                      transition-colors duration-200
                      ${bgColor} ${borderColor} ${textColor}
                      ${!hasSubmitted ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${isSelected ? 'border-current bg-current' : 'border-gray-300'}
                      `}>
                        {isSelected && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <span className="flex-1">{option}</span>
                      {hasSubmitted && isCorrectAnswer && (
                        <span className="text-accent-600">✓ Correct</span>
                      )}
                      {hasSubmitted && isSelected && !isCorrectAnswer && (
                        <span className="text-error-600">✗ Incorrect</span>
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
              className={`p-4 rounded-lg ${
                isCorrect ? 'bg-accent-50 border border-accent-200' : 'bg-secondary-50 border border-secondary-200'
              }`}
            >
              <h4 className={`font-semibold mb-1 ${
                isCorrect ? 'text-accent-800' : 'text-secondary-800'
              }`}>
                {isCorrect ? '✓ Correct!' : 'Explanation:'}
              </h4>
              <p className={isCorrect ? 'text-accent-700' : 'text-secondary-700'}>
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {!hasSubmitted ? (
          <Button
            onClick={handleSubmit}
            variant="primary"
            disabled={selectedAnswer === null}
          >
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNext} variant="primary">
            {currentIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ExerciseModal;

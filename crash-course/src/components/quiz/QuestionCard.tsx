import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';

interface QuestionCardProps {
  question: string;
  options: string[];
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number) => void;
  disabled?: boolean;
  timeLimit?: number;
}

export function QuestionCard({
  question,
  options,
  questionNumber,
  totalQuestions,
  onAnswer,
  disabled = false,
}: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (index: number) => {
    if (disabled || isSubmitting) return;
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null || isSubmitting) return;
    setIsSubmitting(true);
    onAnswer(selectedIndex);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto"
    >
      {/* Question header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < questionNumber ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question text */}
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        {question}
      </h3>

      {/* Answer options */}
      <div className="space-y-3 mb-6">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const letter = String.fromCharCode(65 + index); // A, B, C, D

          return (
            <motion.button
              key={index}
              whileHover={!disabled ? { scale: 1.01 } : {}}
              whileTap={!disabled ? { scale: 0.99 } : {}}
              onClick={() => handleSelect(index)}
              disabled={disabled}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                flex items-center gap-3
                ${isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-800'
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                }
                ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
              `}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${isSelected
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {letter}
              </div>
              <span className="flex-1">{option}</span>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-primary-500"
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          variant="primary"
          disabled={selectedIndex === null || disabled || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      </div>
    </motion.div>
  );
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
        className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto"
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
            className="text-6xl mb-4"
          >
            {isCorrect ? '✅' : '❌'}
          </motion.div>
          <h3 className={`text-2xl font-bold ${
            isCorrect ? 'text-green-600' : 'text-red-600'
          }`}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h3>
          {isCorrect && damageDealt > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-amber-600 font-medium mt-2"
            >
              💥 {damageDealt} damage dealt to the boss!
            </motion.p>
          )}
        </motion.div>

        {/* Correct answer (if wrong) */}
        {!isCorrect && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <span className="font-semibold">Correct answer:</span> {correctAnswer}
            </p>
          </div>
        )}

        {/* Explanation */}
        <div className={`rounded-lg p-4 mb-6 ${
          isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <h4 className={`font-semibold mb-2 ${
            isCorrect ? 'text-green-800' : 'text-amber-800'
          }`}>
            Explanation
          </h4>
          <p className={isCorrect ? 'text-green-700' : 'text-amber-700'}>
            {explanation}
          </p>
        </div>

        {/* Continue button */}
        <div className="flex justify-center">
          <Button onClick={onContinue} variant="primary" size="lg">
            Continue →
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QuestionCard;

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BossCharacter } from './BossCharacter';
import { QuestionCard, AnswerResult, parseNumericInput, type SubmittedAnswer } from './QuestionCard';
import { BrandButton, ProgressBar } from '../ui';
import type { QuizQuestion } from '../../types/admin';

export interface BattleQuestion {
  /** Underlying typed quiz question */
  question: QuizQuestion;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

interface QuizBattleProps {
  bossName: string;
  questions: BattleQuestion[];
  onComplete: (result: BattleResult) => void;
  passingScore?: number;
}

export interface BattleResult {
  victory: boolean;
  score: number;
  correctCount: number;
  totalQuestions: number;
  questionsAnswered: { questionId: string; correct: boolean; timeSpent: number }[];
}

type BattlePhase = 'intro' | 'battling' | 'result' | 'victory' | 'defeat';


/** Normalize a string for fuzzy matching: lowercase, collapse whitespace. */
function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Grade a submitted answer against a typed QuizQuestion.
 * Returns { isCorrect, correctAnswerDisplay }.
 */
export function gradeAnswer(
  question: QuizQuestion,
  submitted: SubmittedAnswer,
): { isCorrect: boolean; correctAnswerDisplay: string } {
  if (question.type === 'mcq' && submitted.kind === 'mcq') {
    const isCorrect = submitted.selectedIndex === question.correctIndex;
    return {
      isCorrect,
      correctAnswerDisplay: question.options[question.correctIndex] ?? '',
    };
  }

  if (question.type === 'short_answer' && submitted.kind === 'short_answer') {
    const expected = question.caseSensitive
      ? question.expectedAnswer.trim()
      : normalizeText(question.expectedAnswer);
    const alts = (question.acceptableAnswers ?? []).map((a) =>
      question.caseSensitive ? a.trim() : normalizeText(a),
    );
    const got = question.caseSensitive ? submitted.text.trim() : normalizeText(submitted.text);
    const isCorrect = got === expected || alts.includes(got);
    return { isCorrect, correctAnswerDisplay: question.expectedAnswer };
  }

  if (question.type === 'numeric' && submitted.kind === 'numeric') {
    if (submitted.value === null) {
      return {
        isCorrect: false,
        correctAnswerDisplay: formatNumericAnswer(question.expectedValue, question.unit),
      };
    }
    const tolerance = question.tolerance ?? 0;
    const isCorrect = Math.abs(submitted.value - question.expectedValue) <= tolerance;
    return {
      isCorrect,
      correctAnswerDisplay: formatNumericAnswer(question.expectedValue, question.unit),
    };
  }

  // Type/kind mismatch — always wrong
  return { isCorrect: false, correctAnswerDisplay: '' };
}

function formatNumericAnswer(value: number, unit?: string): string {
  const formatted = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  if (!unit) return formatted;
  // Dollar signs go before; percents go after.
  if (unit === '$') return `${unit}${formatted}`;
  if (unit === '%') return `${formatted}${unit}`;
  return `${formatted} ${unit}`;
}

// Re-export for callers that still want to do their own numeric parsing.
export { parseNumericInput };

export function QuizBattle({
  bossName,
  questions,
  onComplete,
  passingScore = 70,
}: QuizBattleProps) {
  const [phase, setPhase] = useState<BattlePhase>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [bossHealth, setBossHealth] = useState(100);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    { questionId: string; correct: boolean; timeSpent: number }[]
  >([]);

  const [isBossAttacking, setIsBossAttacking] = useState(false);
  const [isBossTakingDamage, setIsBossTakingDamage] = useState(false);
  const [isPlayerTakingDamage, setIsPlayerTakingDamage] = useState(false);

  const [showResult, setShowResult] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
    damageDealt: number;
  } | null>(null);

  const currentBattleQuestion = questions[currentQuestionIndex];
  const maxBossHealth = 100;
  const questionsNeededToPass = Math.ceil(questions.length * passingScore / 100);
  const damagePerCorrect = maxBossHealth / questionsNeededToPass;

  const startBattle = useCallback(() => {
    setPhase('battling');
  }, []);

  const handleAnswer = useCallback(
    (submitted: SubmittedAnswer) => {
      if (!currentBattleQuestion) return;
      const q = currentBattleQuestion.question;
      const { isCorrect, correctAnswerDisplay } = gradeAnswer(q, submitted);
      const damageAmount = isCorrect ? Math.round(damagePerCorrect) : 0;

      setAnsweredQuestions((prev) => [
        ...prev,
        { questionId: q.id, correct: isCorrect, timeSpent: 0 },
      ]);

      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        setIsBossTakingDamage(true);
        setBossHealth((h) => Math.max(0, h - damageAmount));
        setTimeout(() => setIsBossTakingDamage(false), 300);
      } else {
        setIsBossAttacking(true);
        setIsPlayerTakingDamage(true);
        setPlayerHealth((h) => Math.max(0, h - 10));
        setTimeout(() => {
          setIsBossAttacking(false);
          setIsPlayerTakingDamage(false);
        }, 400);
      }

      setLastAnswer({
        isCorrect,
        correctAnswer: correctAnswerDisplay,
        explanation: currentBattleQuestion.explanation,
        damageDealt: damageAmount,
      });
      setShowResult(true);
    },
    [currentBattleQuestion],
  );

  const handleContinue = useCallback(() => {
    setShowResult(false);
    setLastAnswer(null);

    const nextIndex = currentQuestionIndex + 1;
    const questionsRemaining = questions.length - nextIndex;

    if (correctCount >= questionsNeededToPass) {
      setBossHealth(0);
      setPhase('victory');
    } else if (correctCount + questionsRemaining < questionsNeededToPass) {
      setPhase('defeat');
    } else {
      setCurrentQuestionIndex(nextIndex);
    }
  }, [currentQuestionIndex, questions.length, correctCount, questionsNeededToPass]);

  const handleFinish = useCallback(() => {
    const score = Math.round((correctCount / questions.length) * 100);
    onComplete({
      victory: score >= passingScore,
      score,
      correctCount,
      totalQuestions: questions.length,
      questionsAnswered: answeredQuestions,
    });
  }, [correctCount, questions.length, passingScore, answeredQuestions, onComplete]);

  // Intro screen
  if (phase === 'intro') {
    return (
      <div className="text-center py-8 font-sans">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="mb-6 flex justify-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-accent to-brand-accent-dark border-4 border-white/20 shadow-[0_0_40px_rgba(212,168,79,0.4)] flex items-center justify-center">
            <span className="text-3xl font-display font-bold text-brand-dark">
              {bossName.charAt(0).toUpperCase()}
            </span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-4"
        >
          {bossName}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[#9ca3af] mb-8 max-w-md mx-auto"
        >
          Answer questions correctly to deal damage to the boss!
          You need {passingScore}% correct answers to win.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          <div className="bg-brand-dark-card border border-white/10 rounded-2xl p-4 max-w-xs mx-auto">
            <div className="text-sm text-[#9ca3af] mb-2 uppercase tracking-wide">Battle Details</div>
            <div className="flex justify-between text-sm text-white/90">
              <span>Questions:</span>
              <span className="font-semibold text-brand-accent">{questions.length}</span>
            </div>
            <div className="flex justify-between text-sm text-white/90">
              <span>Pass Threshold:</span>
              <span className="font-semibold text-brand-accent">{passingScore}%</span>
            </div>
          </div>

          <BrandButton onClick={startBattle} variant="accent" size="lg">
            Start Battle
          </BrandButton>
        </motion.div>
      </div>
    );
  }

  if (phase === 'victory') {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="text-center py-8 font-sans">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ type: 'spring', damping: 8 }}
          className="mb-6"
        >
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">
            Result
          </p>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold gradient-text mb-4"
        >
          Victory!
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="text-5xl font-bold text-brand-accent mb-2">{score}%</div>
          <p className="text-[#9ca3af]">
            {correctCount} out of {questions.length} correct
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-brand-accent/10 border border-brand-accent/20 p-4 rounded-2xl max-w-md mx-auto mb-6"
        >
          <p className="text-white/90">
            Congratulations! You defeated {bossName} and can continue your journey!
          </p>
        </motion.div>

        <BrandButton onClick={handleFinish} variant="accent" size="lg">
          Continue
        </BrandButton>
      </div>
    );
  }

  if (phase === 'defeat') {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="text-center py-8 font-sans">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ type: 'spring', damping: 8 }}
          className="mb-6"
        >
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400">
            Result
          </p>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-red-400 mb-4"
        >
          Defeated
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="text-5xl font-bold text-red-400 mb-2">{score}%</div>
          <p className="text-[#9ca3af]">
            {correctCount} out of {questions.length} correct
          </p>
          <p className="text-sm text-[#6b7280] mt-2">
            You needed {passingScore}% to win
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-brand-dark-card border border-white/10 p-4 rounded-2xl max-w-md mx-auto mb-6"
        >
          <p className="text-white/90">
            Don&apos;t give up! Review the material and try again.
            Each attempt helps you learn!
          </p>
        </motion.div>

        <BrandButton onClick={handleFinish} variant="secondary" size="lg">
          Try Again Later
        </BrandButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-white/90">You</span>
          </div>
          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-accent to-brand-accent-dark"
              initial={{ width: '100%' }}
              animate={{
                width: `${playerHealth}%`,
                backgroundColor: isPlayerTakingDamage ? '#ef4444' : undefined,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-[#9ca3af]">{playerHealth}/100 HP</span>
        </div>

        <div className="pt-4 flex flex-col items-center">
          <span className="text-xs font-bold text-[#6b7280] tracking-[0.25em]">VS</span>
        </div>

        <div className="flex-1">
          <BossCharacter
            name={bossName}
            maxHealth={maxBossHealth}
            currentHealth={bossHealth}
            isAttacking={isBossAttacking}
            isTakingDamage={isBossTakingDamage}
          />
        </div>
      </div>

      <div className="text-center">
        <ProgressBar
          value={(currentQuestionIndex / questions.length) * 100}
          variant="default"
          size="sm"
        />
        <p className="text-sm text-[#9ca3af] mt-1">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {showResult && lastAnswer ? (
          <AnswerResult
            key="result"
            isCorrect={lastAnswer.isCorrect}
            correctAnswer={lastAnswer.correctAnswer}
            explanation={lastAnswer.explanation}
            damageDealt={lastAnswer.damageDealt}
            onContinue={handleContinue}
          />
        ) : currentBattleQuestion ? (
          <QuestionCard
            key={currentBattleQuestion.question.id}
            question={currentBattleQuestion.question}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default QuizBattle;

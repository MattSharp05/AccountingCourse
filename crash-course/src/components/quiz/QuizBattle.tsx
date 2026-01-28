import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BossCharacter } from './BossCharacter';
import { QuestionCard, AnswerResult } from './QuestionCard';
import { Button, ProgressBar } from '../ui';

export interface BattleQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

interface QuizBattleProps {
  bossName: string;
  bossEmoji?: string;
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

// Calculate damage based on difficulty
const getDamage = (difficulty: 'easy' | 'medium' | 'hard'): number => {
  switch (difficulty) {
    case 'easy': return 15;
    case 'medium': return 20;
    case 'hard': return 30;
    default: return 20;
  }
};

export function QuizBattle({
  bossName,
  bossEmoji = '👾',
  questions,
  onComplete,
  passingScore = 70,
}: QuizBattleProps) {
  // Battle state
  const [phase, setPhase] = useState<BattlePhase>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [bossHealth, setBossHealth] = useState(100);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    { questionId: string; correct: boolean; timeSpent: number }[]
  >([]);

  // Animation states
  const [isBossAttacking, setIsBossAttacking] = useState(false);
  const [isBossTakingDamage, setIsBossTakingDamage] = useState(false);
  const [isPlayerTakingDamage, setIsPlayerTakingDamage] = useState(false);

  // Current answer result
  const [showResult, setShowResult] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
    damageDealt: number;
  } | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const maxBossHealth = 100;

  // Start the battle
  const startBattle = useCallback(() => {
    setPhase('battling');
  }, []);

  // Handle answer submission
  const handleAnswer = useCallback((selectedIndex: number) => {
    if (!currentQuestion) return;

    const isCorrect = selectedIndex === currentQuestion.correctAnswer;
    const damageAmount = isCorrect ? getDamage(currentQuestion.difficulty) : 0;

    // Record the answer
    setAnsweredQuestions(prev => [
      ...prev,
      { questionId: currentQuestion.id, correct: isCorrect, timeSpent: 0 }
    ]);

    if (isCorrect) {
      setCorrectCount(c => c + 1);
      setIsBossTakingDamage(true);
      setBossHealth(h => Math.max(0, h - damageAmount));

      setTimeout(() => setIsBossTakingDamage(false), 300);
    } else {
      // Boss attacks player on wrong answer
      setIsBossAttacking(true);
      setIsPlayerTakingDamage(true);
      setPlayerHealth(h => Math.max(0, h - 10));

      setTimeout(() => {
        setIsBossAttacking(false);
        setIsPlayerTakingDamage(false);
      }, 400);
    }

    // Show result
    setLastAnswer({
      isCorrect,
      correctAnswer: currentQuestion.options[currentQuestion.correctAnswer],
      explanation: currentQuestion.explanation,
      damageDealt: damageAmount,
    });
    setShowResult(true);
  }, [currentQuestion]);

  // Continue to next question or end battle
  const handleContinue = useCallback(() => {
    setShowResult(false);
    setLastAnswer(null);

    // Check if battle should end
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= questions.length) {
      // All questions answered
      const score = Math.round((correctCount / questions.length) * 100);
      if (score >= passingScore) {
        setPhase('victory');
      } else {
        setPhase('defeat');
      }
    } else {
      setCurrentQuestionIndex(nextIndex);
    }
  }, [currentQuestionIndex, questions.length, correctCount, passingScore]);

  // Handle battle completion
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
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10 }}
          className="text-8xl mb-6"
        >
          {bossEmoji}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-800 mb-4"
        >
          {bossName}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-600 mb-8 max-w-md mx-auto"
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
          <div className="bg-gray-100 rounded-lg p-4 max-w-xs mx-auto">
            <div className="text-sm text-gray-500 mb-2">Battle Details</div>
            <div className="flex justify-between text-sm">
              <span>Questions:</span>
              <span className="font-semibold">{questions.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pass Threshold:</span>
              <span className="font-semibold">{passingScore}%</span>
            </div>
          </div>

          <Button onClick={startBattle} variant="primary" size="lg">
            ⚔️ Start Battle
          </Button>
        </motion.div>
      </div>
    );
  }

  // Victory screen
  if (phase === 'victory') {
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ type: 'spring', damping: 8 }}
          className="text-8xl mb-6"
        >
          🎉
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-green-600 mb-4"
        >
          Victory!
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="text-5xl font-bold text-green-500 mb-2">{score}%</div>
          <p className="text-gray-600">
            {correctCount} out of {questions.length} correct
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-green-50 p-4 rounded-lg max-w-md mx-auto mb-6"
        >
          <p className="text-green-800">
            Congratulations! You defeated {bossName} and can continue your journey!
          </p>
        </motion.div>

        <Button onClick={handleFinish} variant="primary" size="lg">
          Continue →
        </Button>
      </div>
    );
  }

  // Defeat screen
  if (phase === 'defeat') {
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ type: 'spring', damping: 8 }}
          className="text-8xl mb-6"
        >
          💔
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-red-600 mb-4"
        >
          Defeated
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="text-5xl font-bold text-red-500 mb-2">{score}%</div>
          <p className="text-gray-600">
            {correctCount} out of {questions.length} correct
          </p>
          <p className="text-sm text-gray-500 mt-2">
            You needed {passingScore}% to win
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-amber-50 p-4 rounded-lg max-w-md mx-auto mb-6"
        >
          <p className="text-amber-800">
            Don&apos;t give up! Review the material and try again.
            Each attempt helps you learn!
          </p>
        </motion.div>

        <Button onClick={handleFinish} variant="secondary" size="lg">
          Try Again Later
        </Button>
      </div>
    );
  }

  // Main battle phase
  return (
    <div className="space-y-6">
      {/* Battle header with health bars */}
      <div className="flex justify-between items-start gap-4">
        {/* Player health */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🧑‍🎓</span>
            <span className="font-semibold text-gray-700">You</span>
          </div>
          <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400"
              initial={{ width: '100%' }}
              animate={{
                width: `${playerHealth}%`,
                backgroundColor: isPlayerTakingDamage ? '#ef4444' : undefined,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-gray-500">{playerHealth}/100 HP</span>
        </div>

        {/* VS indicator */}
        <div className="text-2xl font-bold text-gray-400 pt-4">VS</div>

        {/* Boss section */}
        <div className="flex-1">
          <BossCharacter
            name={bossName}
            maxHealth={maxBossHealth}
            currentHealth={bossHealth}
            emoji={bossEmoji}
            isAttacking={isBossAttacking}
            isTakingDamage={isBossTakingDamage}
          />
        </div>
      </div>

      {/* Progress */}
      <div className="text-center">
        <ProgressBar
          value={(currentQuestionIndex / questions.length) * 100}
          variant="default"
          size="sm"
        />
        <p className="text-sm text-gray-500 mt-1">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      {/* Question or Result */}
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
        ) : currentQuestion ? (
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion.question}
            options={currentQuestion.options}
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

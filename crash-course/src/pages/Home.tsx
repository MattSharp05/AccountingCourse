import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Card, XpBar } from '../components/ui';
import { AchievementGallery } from '../components/gamification';
import { useGameStore } from '../stores';
import { xpToNextLevel } from '../types/game';
import { useEffect } from 'react';

export function Home() {
  const navigate = useNavigate();
  const { playerProgress, loadProgress } = useGameStore();
  const xpInfo = xpToNextLevel(playerProgress.xp);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const handleStartGame = () => {
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {/* Logo/Title */}
          <motion.div
            className="mb-6"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-6xl">📚</span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold font-display text-gray-900 mb-4">
            Crash Course
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
            Master financial statements through interactive learning adventures
          </p>
          <p className="text-secondary-600 font-semibold">
            Overcooked meets Academia 🎓
          </p>
        </motion.div>

        {/* Player Stats Card */}
        {playerProgress.xp > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto mb-8"
          >
            <Card variant="elevated" className="border-2 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">Welcome Back!</h3>
                  <p className="text-sm text-gray-500">
                    {playerProgress.completedNodes.length} nodes completed
                  </p>
                </div>
                <div className="text-3xl">
                  {playerProgress.streak > 0 ? '🔥' : '⭐'}
                </div>
              </div>
              <XpBar
                currentXp={xpInfo.current}
                requiredXp={xpInfo.required}
                level={playerProgress.level}
              />
            </Card>
          </motion.div>
        )}

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-16"
        >
          <Button
            size="lg"
            onClick={handleStartGame}
            className="text-xl px-12 py-5"
          >
            {playerProgress.xp > 0 ? 'Continue Learning' : 'Start Adventure'} 🚀
          </Button>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <FeatureCard
            icon="🗺️"
            title="Explore & Learn"
            description="Navigate through interactive 3D maps filled with educational content"
          />
          <FeatureCard
            icon="👾"
            title="Defeat Quiz Bosses"
            description="Test your knowledge in epic boss battles to unlock new content"
          />
          <FeatureCard
            icon="🤖"
            title="AI Tutor"
            description="Get instant help from your personal AI assistant anytime"
          />
        </motion.div>

        {/* Achievements Preview */}
        {playerProgress.xp > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 max-w-2xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6 font-display">
              Achievements
            </h2>
            <Card variant="elevated" className="p-6">
              <AchievementGallery unlockedIds={playerProgress.badges || []} />
            </Card>
          </motion.div>
        )}

        {/* Modules Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8 font-display">
            Learning Modules
          </h2>
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <ModuleCard
              number={1}
              title="Financial Statements Intro"
              status="available"
              progress={calculateModuleProgress(1, playerProgress.completedNodes)}
            />
            <ModuleCard
              number={2}
              title="Balance Sheet Deep Dive"
              status="locked"
            />
            <ModuleCard
              number={3}
              title="Income Statement Mastery"
              status="locked"
            />
            <ModuleCard
              number={4}
              title="Cash Flow Analysis"
              status="locked"
            />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm">
        <p>Made with ❤️ for learners everywhere</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Card hoverable className="text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-gray-800 mb-2 font-display">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Card>
  );
}

function ModuleCard({
  number,
  title,
  status,
  progress = 0,
}: {
  number: number;
  title: string;
  status: 'available' | 'locked' | 'completed';
  progress?: number;
}) {
  const isLocked = status === 'locked';

  return (
    <motion.div
      whileHover={isLocked ? {} : { scale: 1.05 }}
      className={`
        relative p-4 rounded-game-lg border-2
        ${isLocked
          ? 'bg-gray-100 border-gray-200 opacity-60'
          : 'bg-white border-primary-200 shadow-game'
        }
      `}
    >
      {isLocked && (
        <div className="absolute top-2 right-2 text-xl">🔒</div>
      )}
      <div className={`
        text-2xl font-bold font-display mb-2
        ${isLocked ? 'text-gray-400' : 'text-primary-600'}
      `}>
        {number}
      </div>
      <h4 className={`text-sm font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
        {title}
      </h4>
      {!isLocked && progress > 0 && (
        <div className="mt-2">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function calculateModuleProgress(moduleId: number, completedNodes: string[]): number {
  // For now, just count nodes that start with module prefix
  const moduleNodes = completedNodes.filter((n) => n.startsWith(`m${moduleId}-`));
  const totalNodes = 8; // Module 1 has 8 nodes
  return Math.round((moduleNodes.length / totalNodes) * 100);
}

export default Home;

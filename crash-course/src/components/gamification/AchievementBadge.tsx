import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

// Achievement definitions
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '👣',
    rarity: 'common',
  },
  {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Complete 3 reading lessons',
    icon: '📚',
    rarity: 'common',
  },
  {
    id: 'video-star',
    name: 'Video Star',
    description: 'Watch 3 video lessons',
    icon: '🎬',
    rarity: 'common',
  },
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Score 100% on a quiz',
    icon: '🏆',
    rarity: 'rare',
  },
  {
    id: 'boss-slayer',
    name: 'Boss Slayer',
    description: 'Defeat your first quiz boss',
    icon: '⚔️',
    rarity: 'rare',
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete a module without failing any quiz',
    icon: '💎',
    rarity: 'epic',
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a lesson in under 2 minutes',
    icon: '⚡',
    rarity: 'rare',
  },
  {
    id: 'financial-wizard',
    name: 'Financial Wizard',
    description: 'Complete Module 1',
    icon: '🧙‍♂️',
    rarity: 'legendary',
  },
];

const rarityColors = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-orange-500',
};

const rarityGlow = {
  common: 'shadow-gray-400/50',
  rare: 'shadow-blue-400/50',
  epic: 'shadow-purple-400/50',
  legendary: 'shadow-amber-400/50',
};

// Display a single achievement badge
interface BadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ achievement, unlocked = true, size = 'md' }: BadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className="flex flex-col items-center gap-2"
    >
      <div
        className={`
          ${sizeClasses[size]} rounded-full flex items-center justify-center
          ${unlocked
            ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} shadow-lg ${rarityGlow[achievement.rarity]}`
            : 'bg-gray-300 grayscale'
          }
        `}
      >
        <span className={unlocked ? '' : 'opacity-50'}>
          {unlocked ? achievement.icon : '🔒'}
        </span>
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold ${unlocked ? 'text-gray-800' : 'text-gray-400'}`}>
          {achievement.name}
        </p>
      </div>
    </motion.div>
  );
}

// Achievement unlock notification
interface UnlockNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementUnlockNotification({ achievement, onClose }: UnlockNotificationProps) {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ type: 'spring', damping: 15 }}
          className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`
            bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4
            border-2 border-${achievement.rarity === 'legendary' ? 'amber' : achievement.rarity === 'epic' ? 'purple' : achievement.rarity === 'rare' ? 'blue' : 'gray'}-300
          `}>
            {/* Glow effect */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${rarityColors[achievement.rarity]} opacity-20 blur-lg`}
            />

            {/* Badge */}
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className={`
                relative z-10 w-16 h-16 rounded-full flex items-center justify-center
                bg-gradient-to-br ${rarityColors[achievement.rarity]} shadow-lg
              `}
            >
              <span className="text-3xl">{achievement.icon}</span>
            </motion.div>

            {/* Text */}
            <div className="relative z-10">
              <p className="text-sm font-medium text-amber-600 uppercase tracking-wide">
                Achievement Unlocked!
              </p>
              <h3 className="text-xl font-bold text-gray-800">{achievement.name}</h3>
              <p className="text-sm text-gray-500">{achievement.description}</p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="relative z-10 text-gray-400 hover:text-gray-600 ml-2"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Achievement gallery
interface GalleryProps {
  unlockedIds: string[];
}

export function AchievementGallery({ unlockedIds }: GalleryProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {ACHIEVEMENTS.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          unlocked={unlockedIds.includes(achievement.id)}
        />
      ))}
    </div>
  );
}

export default AchievementBadge;

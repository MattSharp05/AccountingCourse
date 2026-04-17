import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

// Achievement definitions
export interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first lesson',
    rarity: 'common',
  },
  {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Complete 3 reading lessons',
    rarity: 'common',
  },
  {
    id: 'video-star',
    name: 'Video Star',
    description: 'Watch 3 video lessons',
    rarity: 'common',
  },
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Score 100% on a quiz',
    rarity: 'rare',
  },
  {
    id: 'boss-slayer',
    name: 'Boss Slayer',
    description: 'Defeat your first quiz boss',
    rarity: 'rare',
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete a module without failing any quiz',
    rarity: 'epic',
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a lesson in under 2 minutes',
    rarity: 'rare',
  },
  {
    id: 'financial-wizard',
    name: 'Financial Wizard',
    description: 'Complete Module 1',
    rarity: 'legendary',
  },
];

const rarityColors = {
  common: 'from-white/20 to-white/30',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-brand-accent-light to-brand-accent',
};

const rarityGlow = {
  common: 'shadow-white/20',
  rare: 'shadow-blue-400/50',
  epic: 'shadow-purple-400/50',
  legendary: 'shadow-brand-accent/50',
};

function badgeInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Display a single achievement badge
interface BadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ achievement, unlocked = true, size = 'md' }: BadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-20 h-20 text-base',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className="flex flex-col items-center gap-2"
    >
      <div
        className={`
          ${sizeClasses[size]} rounded-full flex items-center justify-center
          font-display font-bold tracking-wide
          ${unlocked
            ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} shadow-lg ${rarityGlow[achievement.rarity]} text-white`
            : 'bg-gray-300 grayscale text-gray-500'
          }
        `}
      >
        {unlocked ? badgeInitials(achievement.name) : '—'}
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold ${unlocked ? 'text-white' : 'text-[#6b7280]'}`}>
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
          <div className="bg-brand-dark-card rounded-2xl shadow-2xl shadow-black/60 border border-white/10 p-6 flex items-center gap-4 text-white relative overflow-hidden">
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
                font-display font-bold text-sm tracking-wide text-white
                bg-gradient-to-br ${rarityColors[achievement.rarity]} shadow-lg
              `}
            >
              {badgeInitials(achievement.name)}
            </motion.div>

            {/* Text */}
            <div className="relative z-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
                Achievement unlocked
              </p>
              <h3 className="text-lg font-bold text-white tracking-tight">{achievement.name}</h3>
              <p className="text-sm text-[#9ca3af]">{achievement.description}</p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="relative z-10 w-7 h-7 rounded-full text-[#6b7280] hover:text-white hover:bg-white/5 transition-colors ml-2 text-base leading-none flex items-center justify-center"
              aria-label="Close"
            >
              ×
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

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

const CONFETTI_COLORS = [
  '#4F46E5', // Primary indigo
  '#f59e0b', // Secondary amber
  '#10b981', // Accent green
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
];

interface ConfettiProps {
  show: boolean;
  duration?: number;
  count?: number;
}

export function Confetti({ show, duration = 3000, count = 50 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show) {
      const newPieces = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
        size: Math.random() * 8 + 4,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: `${piece.x}vw`,
              y: -20,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              y: '110vh',
              rotate: piece.rotation + 720,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: piece.delay,
              ease: 'easeIn',
            }}
            style={{
              position: 'absolute',
              width: piece.size,
              height: piece.size * 1.5,
              backgroundColor: piece.color,
              borderRadius: 2,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Simpler celebration burst effect
export function CelebrationBurst({ show }: { show: boolean }) {
  const [emojis, setEmojis] = useState<{ id: number; emoji: string; x: number; delay: number }[]>([]);

  const celebrationEmojis = ['🎉', '🎊', '⭐', '✨', '🏆', '💫', '🌟', '🎯'];

  useEffect(() => {
    if (show) {
      const newEmojis = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        emoji: celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)],
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
      }));
      setEmojis(newEmojis);

      const timer = setTimeout(() => setEmojis([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {emojis.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: `${item.x}vw`,
              y: '50vh',
              scale: 0,
              opacity: 1,
            }}
            animate={{
              y: '10vh',
              scale: [0, 1.5, 1],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: item.delay,
              ease: 'easeOut',
            }}
            className="absolute text-4xl"
          >
            {item.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Confetti;

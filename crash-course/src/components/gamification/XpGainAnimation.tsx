import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface XpGainAnimationProps {
  amount: number;
  show: boolean;
  onComplete?: () => void;
}

export function XpGainAnimation({ amount, show, onComplete }: XpGainAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -50, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed top-1/3 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-80">
              XP
            </span>
            <span className="text-xl font-bold">+{amount}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Floating XP particles for extra flair
interface XpParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
}

export function XpParticles({ count = 5, show }: { count?: number; show: boolean }) {
  const [particles, setParticles] = useState<XpParticle[]>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 50,
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [show, count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              opacity: 1,
              x: '50vw',
              y: '50vh',
              scale: 0,
            }}
            animate={{
              opacity: [1, 1, 0],
              x: `calc(50vw + ${particle.x}px)`,
              y: `calc(50vh - 150px - ${particle.y}px)`,
              scale: [0, 1.5, 0.5],
            }}
            transition={{
              duration: 1.5,
              delay: particle.delay,
              ease: 'easeOut',
            }}
            className="absolute w-2 h-2 rounded-full bg-brand-accent"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default XpGainAnimation;

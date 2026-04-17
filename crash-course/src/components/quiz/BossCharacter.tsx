import { motion, AnimatePresence } from 'framer-motion';
import { BossHealthBar } from '../ui';

interface BossCharacterProps {
  name: string;
  maxHealth: number;
  currentHealth: number;
  isAttacking?: boolean;
  isTakingDamage?: boolean;
}

export function BossCharacter({
  name,
  maxHealth,
  currentHealth,
  isAttacking = false,
  isTakingDamage = false,
}: BossCharacterProps) {
  const healthPercent = (currentHealth / maxHealth) * 100;
  const isLowHealth = healthPercent < 30;
  const isDefeated = currentHealth <= 0;

  return (
    <div className="flex flex-col items-center font-sans">
      {/* Boss name */}
      <div className="mb-2">
        <span className="text-lg font-bold text-white">{name}</span>
      </div>

      {/* Health bar */}
      <div className="w-64 mb-4">
        <BossHealthBar
          current={currentHealth}
          max={maxHealth}
          name={name}
        />
      </div>

      {/* Boss character */}
      <motion.div
        className="relative"
        animate={{
          scale: isDefeated ? 0 : isTakingDamage ? [1, 0.9, 1] : isAttacking ? [1, 1.1, 1] : 1,
          rotate: isTakingDamage ? [0, -5, 5, -5, 0] : 0,
          y: isAttacking ? [0, -20, 0] : isLowHealth ? [0, -3, 0] : 0,
        }}
        transition={{
          duration: isTakingDamage ? 0.3 : isAttacking ? 0.4 : isLowHealth ? 0.5 : 0.2,
          repeat: isLowHealth && !isTakingDamage && !isAttacking ? Infinity : 0,
        }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background: isLowHealth
              ? 'radial-gradient(circle, rgba(239,68,68,0.5) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(212,168,79,0.35) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Main boss body */}
        <div className="relative z-10 flex items-center justify-center">
          <motion.div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-accent to-brand-accent-dark border-4 border-white/20 shadow-[0_0_40px_rgba(212,168,79,0.4)] flex items-center justify-center select-none"
            animate={{
              filter: isTakingDamage ? 'brightness(2)' : 'brightness(1)',
            }}
            transition={{ duration: 0.1 }}
          >
            <span className="text-3xl font-display font-bold text-brand-dark tracking-wider">
              {name.charAt(0).toUpperCase()}
            </span>
          </motion.div>
        </div>

        {/* Damage flash overlay */}
        <AnimatePresence>
          {isTakingDamage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 rounded-full bg-white"
            />
          )}
        </AnimatePresence>

        {/* Attack indicator */}
        <AnimatePresence>
          {isAttacking && (
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 20 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-bold uppercase tracking-[0.25em] text-red-400"
            >
              Attack
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status text */}
      <motion.div
        className="mt-4 text-sm font-medium"
        animate={{ opacity: isDefeated ? 0 : 1 }}
      >
        {isDefeated ? (
          <span className="text-brand-accent uppercase tracking-[0.25em] text-xs font-bold">
            Defeated
          </span>
        ) : isLowHealth ? (
          <span className="text-red-400">Almost there!</span>
        ) : (
          <span className="text-[#9ca3af]">HP: {currentHealth}/{maxHealth}</span>
        )}
      </motion.div>
    </div>
  );
}

export default BossCharacter;

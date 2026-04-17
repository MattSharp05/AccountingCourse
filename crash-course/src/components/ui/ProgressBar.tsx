import { motion } from 'framer-motion';

type ProgressVariant = 'default' | 'xp' | 'health' | 'boss';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const variantStyles: Record<
  ProgressVariant,
  { bar: string; fill: string }
> = {
  default: {
    bar: 'bg-gray-200',
    fill: 'bg-gradient-to-r from-primary-500 to-primary-600',
  },
  xp: {
    bar: 'bg-gray-200',
    fill: 'bg-gradient-to-r from-secondary-400 to-secondary-500',
  },
  health: {
    bar: 'bg-gray-200',
    fill: 'bg-gradient-to-r from-accent-400 to-accent-500',
  },
  boss: {
    bar: 'bg-gray-300 border-2 border-gray-400',
    fill: 'bg-gradient-to-r from-error-500 to-error-600',
  },
};

const sizeStyles = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  showLabel = false,
  label,
  size = 'md',
  animated = true,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const styles = variantStyles[variant];

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      )}

      {/* Bar container */}
      <div
        className={`
          ${sizeStyles[size]}
          ${styles.bar}
          rounded-full overflow-hidden
        `}
      >
        {/* Fill */}
        <motion.div
          className={`h-full ${styles.fill} rounded-full`}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={
            animated
              ? { type: 'spring', damping: 20, stiffness: 100 }
              : { duration: 0.3 }
          }
        />
      </div>
    </div>
  );
}

// Specialized health bar with hearts display
interface HealthBarProps {
  current: number;
  max: number;
  showHearts?: boolean;
  className?: string;
}

export function HealthBar({
  current,
  max,
  showHearts = true,
  className = '',
}: HealthBarProps) {
  const hearts = Array.from({ length: max }, (_, i) => i < current);

  if (showHearts) {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        {hearts.map((filled, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`w-5 h-5 rounded-sm ${
              filled
                ? 'bg-error-500'
                : 'bg-transparent border border-error-500/40'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <ProgressBar
      value={current}
      max={max}
      variant="health"
      size="lg"
      className={className}
    />
  );
}

// XP bar with level display
interface XpBarProps {
  currentXp: number;
  requiredXp: number;
  level: number;
  className?: string;
}

export function XpBar({ currentXp, requiredXp, level, className = '' }: XpBarProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Level badge */}
      <div className="flex-shrink-0">
        <motion.div
          className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center shadow-md"
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <span className="text-white font-bold text-sm">{level}</span>
        </motion.div>
      </div>

      {/* XP bar */}
      <div className="flex-1">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Level {level}</span>
          <span>
            {currentXp} / {requiredXp} XP
          </span>
        </div>
        <ProgressBar
          value={currentXp}
          max={requiredXp}
          variant="xp"
          size="sm"
        />
      </div>
    </div>
  );
}

// Boss health bar with name
interface BossHealthBarProps {
  name: string;
  current: number;
  max: number;
  className?: string;
}

export function BossHealthBar({
  name,
  current,
  max,
  className = '',
}: BossHealthBarProps) {
  const percentage = Math.round((current / max) * 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-gray-800 font-display">{name}</span>
        <span className="text-sm text-gray-600">
          {current} / {max} HP
        </span>
      </div>
      <div className="h-6 bg-gray-300 rounded-full overflow-hidden border-2 border-gray-400 shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-error-500 to-error-600 rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;

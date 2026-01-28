import { motion } from 'framer-motion';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const sizeStyles = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
};

export function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className={`${sizeStyles[size]} relative`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-primary-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600" />
      </motion.div>
      {text && (
        <motion.p
          className="text-gray-600 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

// Game-themed loading screen
export function GameLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="w-full h-full min-h-[400px] bg-game-bg flex flex-col items-center justify-center gap-6">
      {/* Bouncing books animation */}
      <div className="flex gap-2">
        {['📕', '📗', '📘', '📙'].map((book, i) => (
          <motion.span
            key={i}
            className="text-4xl"
            animate={{
              y: [0, -20, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          >
            {book}
          </motion.span>
        ))}
      </div>

      {/* Loading bar */}
      <div className="w-64">
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 rounded-full"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>

      {/* Message */}
      <motion.p
        className="text-white font-display text-lg"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
    </div>
  );
}

// Skeleton loader for content
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <motion.div
      className={`bg-gray-200 ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export default Loading;

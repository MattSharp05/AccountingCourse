import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'game' | 'elevated';
  hoverable?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-white border border-gray-100',
  game: 'bg-game-surface border border-gray-700 text-white',
  elevated: 'bg-white border-2 border-primary-100',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export function Card({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  onClick,
  padding = 'md',
}: CardProps) {
  const Component = hoverable || onClick ? motion.div : 'div';

  const motionProps = hoverable || onClick
    ? {
        whileHover: { scale: 1.02, y: -4 },
        whileTap: onClick ? { scale: 0.98 } : {},
        transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
      }
    : {};

  return (
    <Component
      className={`
        rounded-game-lg shadow-game
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverable ? 'cursor-pointer hover:shadow-game-hover transition-shadow' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </Component>
  );
}

// Card sub-components for structured content
export function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-bold font-display text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-sm text-gray-500 mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export default Card;

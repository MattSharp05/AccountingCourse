import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-game',
  secondary:
    'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700 shadow-game',
  accent:
    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-game',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
  danger:
    'bg-error-500 text-white hover:bg-error-600 active:bg-error-600 shadow-game',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-game',
  lg: 'px-8 py-4 text-lg rounded-game-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={isDisabled ? {} : { scale: 0.98, y: 0 }}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold font-display
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner size={size} />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
}

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <svg
      className={`animate-spin ${sizeClass}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default Button;

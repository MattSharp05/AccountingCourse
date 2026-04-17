import { type ReactNode, forwardRef } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

export type BrandButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
export type BrandButtonSize = 'sm' | 'md' | 'lg';

interface BrandButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: BrandButtonVariant;
  size?: BrandButtonSize;
  glow?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<BrandButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark font-semibold hover:shadow-[0_0_20px_rgba(212,168,79,0.4)] focus:ring-brand-accent',
  accent:
    'bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark font-semibold hover:shadow-[0_0_20px_rgba(212,168,79,0.4)] focus:ring-brand-accent',
  secondary:
    'bg-white/10 text-white hover:bg-white/15 focus:ring-white/30',
  outline:
    'border border-white/15 text-[#9ca3af] hover:border-white/30 hover:text-white focus:ring-white/20',
  ghost:
    'text-[#9ca3af] hover:bg-white/5 hover:text-white focus:ring-white/20',
};

const sizeStyles: Record<BrandButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-10 py-4 text-sm tracking-wider uppercase',
};

export const BrandButton = forwardRef<HTMLButtonElement, BrandButtonProps>(function BrandButton(
  {
    variant = 'primary',
    size = 'md',
    glow = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    children,
    ...props
  },
  ref,
) {
  const reduced = useReducedMotion();
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      ref={ref}
      whileHover={isDisabled || reduced ? {} : { scale: 1.02, y: -1 }}
      whileTap={isDisabled || reduced ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-full font-sans
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${glow && (variant === 'primary' || variant === 'accent') ? 'btn-glow' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size} />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
});

function Spinner({ size }: { size: BrandButtonSize }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <svg className={`animate-spin ${sizeClass}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default BrandButton;

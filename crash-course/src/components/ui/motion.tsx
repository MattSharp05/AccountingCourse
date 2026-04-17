import { motion, useReducedMotion, type Variants, type HTMLMotionProps } from 'framer-motion';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DEFAULT_DURATION = 0.6;
const DEFAULT_OFFSET = 24;

type FadeInProps = Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> & {
  y?: number;
  x?: number;
  duration?: number;
  delay?: number;
  viewport?: boolean;
};

export function FadeIn({
  y = 0,
  x = 0,
  duration = DEFAULT_DURATION,
  delay = 0,
  viewport = false,
  children,
  className,
  ...rest
}: FadeInProps) {
  const reduced = useReducedMotion();
  const motionProps = viewport
    ? {
        whileInView: { opacity: 1, y: 0, x: 0 },
        viewport: { once: true, margin: '-20px' },
      }
    : { animate: { opacity: 1, y: 0, x: 0 } };

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y, x }}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={className}
      {...motionProps}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeInUp(props: FadeInProps) {
  return <FadeIn y={DEFAULT_OFFSET} {...props} />;
}

type RevealOnScrollProps = Omit<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'viewport' | 'transition'> & {
  y?: number;
  duration?: number;
  delay?: number;
};

export function RevealOnScroll({
  y = DEFAULT_OFFSET,
  duration = DEFAULT_DURATION,
  delay = 0,
  children,
  className,
  ...rest
}: RevealOnScrollProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: DEFAULT_OFFSET },
  visible: { opacity: 1, y: 0, transition: { duration: DEFAULT_DURATION, ease: EASE_OUT } },
};

type StaggerProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView' | 'viewport'>;

export function StaggerList({ children, className, ...rest }: StaggerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: Omit<HTMLMotionProps<'div'>, 'variants'>) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? { hidden: { opacity: 1 }, visible: { opacity: 1 } } : staggerItem}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type MotionButtonProps = Omit<HTMLMotionProps<'button'>, 'whileHover' | 'whileTap' | 'transition'>;

export function MotionButton({ children, className, ...rest }: MotionButtonProps) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      whileHover={reduced ? {} : { scale: 1.02, y: -1 }}
      whileTap={reduced ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface CardStickyProps extends HTMLMotionProps<'div'> {
  index: number;
  incrementY?: number;
  incrementZ?: number;
  baseOffset?: number;
}

export const ContainerScroll = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement>
>(({ children, className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative w-full ${className ?? ''}`}
    style={{ perspective: '1000px', ...style }}
    {...props}
  >
    {children}
  </div>
));

ContainerScroll.displayName = 'ContainerScroll';

export const CardSticky = React.forwardRef<HTMLDivElement, CardStickyProps>(
  (
    {
      index,
      incrementY = 10,
      incrementZ = 10,
      baseOffset = 0,
      children,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const y = baseOffset + index * incrementY;
    const z = index * incrementZ;
    return (
      <motion.div
        ref={ref}
        layout="position"
        style={{ top: y, zIndex: z, backfaceVisibility: 'hidden', ...style }}
        className={`static md:sticky ${className ?? ''}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

CardSticky.displayName = 'CardSticky';

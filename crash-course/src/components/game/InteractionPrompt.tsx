import { motion, AnimatePresence } from 'framer-motion';

interface InteractionPromptProps {
  nodeTitle: string | null;
  onInteract: () => void;
}

export function InteractionPrompt({ nodeTitle, onInteract }: InteractionPromptProps) {
  return (
    <AnimatePresence>
      {nodeTitle && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-brand-dark-card/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/50 border border-brand-accent/30 px-6 py-4 text-center">
            <p className="text-lg font-bold text-white mb-2 tracking-tight">{nodeTitle}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-[#9ca3af]">Press</span>
              <kbd className="px-3 py-1.5 bg-brand-accent/10 text-brand-accent rounded-lg font-bold text-sm border border-brand-accent/30">
                E
              </kbd>
              <span className="text-sm text-[#9ca3af]">or</span>
              <button
                onClick={onInteract}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark font-semibold text-sm hover:shadow-[0_0_20px_rgba(212,168,79,0.4)] transition-all"
              >
                Click to open
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InteractionPrompt;

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
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-primary-200 px-6 py-4 text-center">
            <p className="text-lg font-bold text-gray-800 mb-2">{nodeTitle}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-500">Press</span>
              <kbd className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg font-bold text-sm border border-primary-200">
                E
              </kbd>
              <span className="text-sm text-gray-500">or</span>
              <button
                onClick={onInteract}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors"
              >
                Click to Open
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InteractionPrompt;

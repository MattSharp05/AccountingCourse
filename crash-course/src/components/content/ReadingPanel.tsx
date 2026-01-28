import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Button, ProgressBar } from '../ui';

interface ReadingPanelProps {
  content: string;
  title: string;
  estimatedReadTime?: number;
  onComplete: () => void;
}

export function ReadingPanel({
  content,
  title: _title,
  estimatedReadTime = 5,
  onComplete,
}: ReadingPanelProps) {
  // title available via _title for analytics/logging
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasRead, setHasRead] = useState(false);
  const [readingTime, setReadingTime] = useState(0);

  // Track scroll progress
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Mark as read if they've scrolled 90%
      if (progress > 90 && !hasRead) {
        setHasRead(true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasRead]);

  // Track reading time
  useEffect(() => {
    const timer = setInterval(() => {
      setReadingTime((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header with progress */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>📖 {estimatedReadTime} min read</span>
          <span>Reading time: {formatTime(readingTime)}</span>
        </div>
        <ProgressBar value={scrollProgress} variant="default" size="sm" />
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto pr-4 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        <article className="prose prose-lg max-w-none">
          {/* Custom styled markdown */}
          <div className="reading-content">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-gray-900 mb-4 font-display">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3 font-display">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 mb-4 text-gray-600">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-600">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="ml-2">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary-400 pl-4 py-2 my-4 bg-primary-50 rounded-r-lg italic text-gray-700">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono text-primary-700">
                    {children}
                  </code>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-gray-900">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-700">{children}</em>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>

        {/* End marker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: hasRead ? 1 : 0.3, y: 0 }}
          className="text-center py-8"
        >
          <div className="text-4xl mb-2">
            {hasRead ? '✅' : '📄'}
          </div>
          <p className="text-gray-500">
            {hasRead ? 'Reading complete!' : 'Keep scrolling...'}
          </p>
        </motion.div>
      </div>

      {/* Footer with complete button */}
      <div className="flex-shrink-0 pt-4 border-t mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {hasRead ? (
              <span className="text-accent-600 font-medium">
                ✓ Content read
              </span>
            ) : (
              <span>Scroll to continue reading</span>
            )}
          </div>
          <Button onClick={onComplete} variant="primary">
            {hasRead ? 'Complete & Continue →' : 'Mark as Read'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReadingPanel;

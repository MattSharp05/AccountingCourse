import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';
import { useChatWithContent } from '../../hooks/useChatWithContent';

export function ChatWidget() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const isOpen = useChatStore((s) => s.isOpen);
  const toggleChat = useChatStore((s) => s.toggleChat);
  const { sendMessageWithContent } = useChatWithContent();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await sendMessageWithContent(message);
  };

  const stopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayMessages = messages.length > 0
    ? messages
    : [{
        id: 'welcome',
        role: 'assistant' as const,
        content: "Hi there! I'm Professor Marrs, your accounting tutor. Ask me anything about accounting — from journal entries and T-accounts to financial statements and ratios!",
        timestamp: new Date().toISOString(),
      }];

  return (
    <>
      {/* Floating chat bubble — inline-styled position so no ancestor
          transform / class conflict can shift it off the bottom-right. */}
      <button
        type="button"
        onClick={toggleChat}
        aria-label={isOpen ? 'Close tutor chat' : 'Open tutor chat'}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
        }}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200 hover:-translate-y-0.5 active:scale-95
          ${isOpen
            ? 'bg-white/10 border border-white/15 text-white backdrop-blur-sm text-2xl leading-none'
            : 'bg-gradient-to-br from-brand-accent to-brand-accent-dark text-brand-dark btn-glow'
          }
        `}
      >
        {isOpen ? (
          '×'
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22 }}
            onKeyDown={stopPropagation}
            onKeyUp={stopPropagation}
            style={{
              position: 'fixed',
              bottom: '6rem',
              right: '1.5rem',
              zIndex: 9999,
            }}
            className="w-[384px] max-w-[calc(100vw-3rem)] max-h-[560px] bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-white/5 bg-gradient-to-b from-brand-dark-lighter to-brand-dark-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-accent to-brand-accent-dark flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-dark tracking-wide">PM</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-brand-accent font-semibold">
                    AI Tutor
                  </p>
                  <h3 className="font-bold text-white tracking-tight">Professor Marrs</h3>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-[320px] max-h-[380px]">
              {displayMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                      ${message.role === 'user'
                        ? 'bg-gradient-to-br from-brand-accent to-brand-accent-dark text-brand-dark rounded-br-sm font-medium'
                        : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-sm'
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (displayMessages.length === 0 || displayMessages[displayMessages.length - 1]?.content === '') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-brand-accent/60 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-brand-accent/60 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-brand-accent/60 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-white/5 bg-brand-dark-lighter/50">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about accounting..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 disabled:opacity-50 text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-accent to-brand-accent-dark text-brand-dark flex items-center justify-center text-lg leading-none font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  →
                </motion.button>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b7280] mt-3 text-center">
                Tutor knows your current map&apos;s content
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWidget;

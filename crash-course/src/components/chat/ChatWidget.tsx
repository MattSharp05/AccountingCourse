import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';

// Use relative path for Vercel serverless functions, or localhost for dev server
const API_URL = import.meta.env.VITE_API_URL || '';

// Fallback responses when API is unavailable
const FALLBACK_RESPONSES = [
  "I'm having trouble connecting right now, but let me share a tip: The balance sheet shows what a company owns (assets), owes (liabilities), and the owner's stake (equity). Assets = Liabilities + Equity! 📊",
  "Connection issue! Here's a quick lesson: Revenue is the 'top line' of an income statement - it's money earned from selling products or services. Net income is the 'bottom line' - what's left after all expenses! 💰",
  "I can't connect to my brain right now! But remember: Cash flow is king! A company can show profit but still run out of cash if customers don't pay on time. 🏦",
  "Having technical difficulties! Fun fact: The three financial statements are interconnected. Net income flows to retained earnings, which connects them all! 🔗",
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi there! 👋 I'm Professor Penny, your financial statements tutor. Ask me anything about balance sheets, income statements, or cash flow!",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history for context
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          history,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);

      // Use fallback response
      const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];

      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fallback,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Bubble Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50
          w-16 h-16 rounded-full shadow-lg
          flex items-center justify-center
          ${isOpen ? 'bg-gray-500' : 'bg-primary-600 hover:bg-primary-700'}
          text-white text-2xl
          transition-colors
        `}
      >
        {isOpen ? '✕' : '💬'}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎓</div>
                <div>
                  <h3 className="font-bold">Professor Penny</h3>
                  <p className="text-sm text-primary-100">Your Financial Tutor</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[350px]">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-2xl px-4 py-2
                      ${message.role === 'user'
                        ? 'bg-primary-500 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }
                    `}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about financial statements..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-100"
                />
                <Button
                  onClick={sendMessage}
                  variant="primary"
                  disabled={!input.trim() || isLoading}
                  className="!rounded-full !px-4"
                >
                  ➤
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Ask me about balance sheets, income statements, or cash flow!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWidget;

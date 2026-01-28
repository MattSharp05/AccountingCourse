import { create } from 'zustand';
import type { ChatState, ChatMessage } from '../types/content';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useChatStore = create<ChatState>()((set, get) => ({
  // Initial state
  messages: [],
  isLoading: false,
  isOpen: false,
  error: null,
  currentModule: 1,
  currentTopic: null,
  strugglingTopics: [],

  // Actions
  sendMessage: async (content) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const { currentModule, currentTopic, strugglingTopics, messages } = get();

      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          context: {
            module: currentModule,
            topic: currentTopic,
            strugglingTopics,
          },
          history: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });

      // Add a fallback message for demo/offline mode
      const fallbackMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: getFallbackResponse(content),
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, fallbackMessage],
        error: null,
      }));
    }
  },

  toggleChat: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  clearChat: () => {
    set({ messages: [], error: null });
  },

  setContext: (module, topic) => {
    set({ currentModule: module, currentTopic: topic });
  },

  addStrugglingTopic: (topic) => {
    set((state) => {
      if (state.strugglingTopics.includes(topic)) {
        return state;
      }
      return {
        strugglingTopics: [...state.strugglingTopics, topic],
      };
    });
  },
}));

// Fallback responses for demo/offline mode
function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('balance sheet')) {
    return "A balance sheet shows a company's financial position at a specific point in time. It follows the accounting equation: Assets = Liabilities + Equity. Think of it as a snapshot of what a company owns (assets), what it owes (liabilities), and what belongs to shareholders (equity). Want me to explain any of these components in more detail?";
  }

  if (lowerMessage.includes('income statement') || lowerMessage.includes('profit')) {
    return "The income statement (also called P&L or profit and loss statement) shows a company's revenues and expenses over a period of time. The basic formula is: Revenue - Expenses = Net Income. It tells you whether the company made a profit or loss during that period. What specific aspect would you like to explore?";
  }

  if (lowerMessage.includes('cash flow')) {
    return "The cash flow statement tracks how cash moves in and out of a business. It has three sections: Operating Activities (day-to-day business), Investing Activities (buying/selling assets), and Financing Activities (loans, dividends, stock). Unlike the income statement, it shows actual cash movement, not accrual accounting. Need help with a specific section?";
  }

  if (lowerMessage.includes('asset') || lowerMessage.includes('liability')) {
    return "Assets are resources a company owns that have economic value (cash, inventory, equipment). Liabilities are obligations the company owes to others (loans, accounts payable). The difference between total assets and total liabilities equals shareholders' equity. Would you like examples of current vs. non-current items?";
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
    return "I'm here to help! I can explain concepts about:\n\n• Balance sheets (assets, liabilities, equity)\n• Income statements (revenue, expenses, profit)\n• Cash flow statements (operating, investing, financing)\n• Financial ratios and analysis\n\nWhat topic would you like to explore?";
  }

  return "That's a great question about financial statements! To give you the best answer, could you tell me a bit more about what specifically you'd like to understand? I'm here to help with balance sheets, income statements, cash flow statements, and financial analysis concepts.";
}

// Selector hooks
export const useChatMessages = () => useChatStore((s) => s.messages);
export const useIsChatOpen = () => useChatStore((s) => s.isOpen);
export const useIsChatLoading = () => useChatStore((s) => s.isLoading);

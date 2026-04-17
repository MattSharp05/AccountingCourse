import { create } from 'zustand';
import type { ChatState, ChatMessage, ChatContext } from '../types/content';

const generateId = () => Math.random().toString(36).substring(2, 9);

const API_URL = import.meta.env.VITE_API_URL || '';

export const useChatStore = create<ChatState>()((set, get) => ({
  // Initial state
  messages: [],
  isLoading: false,
  isOpen: false,
  error: null,
  currentModule: 1,
  currentTopic: null,
  currentMapId: null,
  currentMapTitle: null,
  currentCheckpointId: null,
  currentCheckpointTitle: null,
  strugglingTopics: [],

  // Actions
  sendMessage: async (content, courseContent) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // Add user message and create empty assistant message for streaming
    const assistantId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const {
        currentModule, currentTopic, currentMapTitle,
        currentCheckpointTitle, strugglingTopics, messages,
      } = get();

      const history = messages
        .filter((m) => m.role !== 'system' && m.content.length > 0)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_URL}/api/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context: {
            module: currentModule,
            topic: currentTopic,
            mapTitle: currentMapTitle,
            checkpointTitle: currentCheckpointTitle,
            strugglingTopics,
            courseContent,
          },
          history,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // Streaming response — parse SSE
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + token } : m
                  ),
                }));
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      } else {
        // Non-streaming fallback (no API key case)
        const data = await response.json();
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === assistantId ? { ...m, content: data.response || 'Sorry, I could not generate a response.' } : m
          ),
        }));
      }

      set({ isLoading: false });
    } catch (error) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId ? { ...m, content: getFallbackResponse(content) } : m
        ),
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  },

  toggleChat: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  clearChat: () => {
    set({ messages: [], error: null });
  },

  setContext: (context: ChatContext) => {
    set({
      currentModule: context.module ?? get().currentModule,
      currentTopic: context.topic ?? get().currentTopic,
      currentMapId: context.mapId ?? get().currentMapId,
      currentMapTitle: context.mapTitle ?? get().currentMapTitle,
      currentCheckpointId: context.checkpointId ?? get().currentCheckpointId,
      currentCheckpointTitle: context.checkpointTitle ?? get().currentCheckpointTitle,
    });
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

  if (lowerMessage.includes('journal entr') || lowerMessage.includes('debit') || lowerMessage.includes('credit')) {
    return "Journal entries record transactions using double-entry bookkeeping. Every entry has at least one debit and one credit, and they must be equal. Remember: Debits increase assets and expenses, Credits increase liabilities, equity, and revenue. Would you like me to walk through an example?";
  }

  if (lowerMessage.includes('depreciation')) {
    return "Depreciation allocates the cost of a long-lived asset over its useful life. The three main methods are: Straight-line (equal amounts each year), Declining balance (more in early years), and Units-of-production (based on usage). Which method would you like to explore?";
  }

  if (lowerMessage.includes('cash flow')) {
    return "The cash flow statement tracks how cash moves in and out of a business. It has three sections: Operating Activities (day-to-day business), Investing Activities (buying/selling assets), and Financing Activities (loans, dividends, stock). Unlike the income statement, it shows actual cash movement, not accrual accounting. Need help with a specific section?";
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
    return "I'm here to help! I can explain concepts about:\n\n• The accounting equation & double-entry bookkeeping\n• Journal entries, T-accounts, trial balance\n• Financial statements (income statement, balance sheet, cash flow)\n• Inventory methods, depreciation, receivables\n• Financial ratios and analysis\n\nWhat topic would you like to explore?";
  }

  return "That's a great question! To give you the best answer, could you tell me a bit more about what specifically you'd like to understand? I'm here to help with all intro accounting topics — from journal entries and T-accounts to financial statements and ratios.";
}

// Selector hooks
export const useChatMessages = () => useChatStore((s) => s.messages);
export const useIsChatOpen = () => useChatStore((s) => s.isOpen);
export const useIsChatLoading = () => useChatStore((s) => s.isLoading);

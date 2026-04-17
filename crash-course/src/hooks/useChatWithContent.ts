import { useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useContentItemsForMap } from './useContentItems';
import type { ContentItem } from '../types/admin';

const MAX_CONTENT_LENGTH = 6000;

function buildContentSummary(items: ContentItem[]): string {
  if (!items?.length) return '';

  let totalLength = 0;
  const sections: string[] = [];

  for (const item of items) {
    if (totalLength >= MAX_CONTENT_LENGTH) break;

    let section: string | null = null;
    const remaining = MAX_CONTENT_LENGTH - totalLength;

    if (item.type === 'text' && item.textContent) {
      const text = item.textContent.slice(0, remaining);
      section = `## ${item.title}\n${text}`;
    } else if (item.type === 'pdf' && item.metadata?.extractedText) {
      const text = (item.metadata.extractedText as string).slice(0, remaining);
      section = `## ${item.title} (PDF)\n${text}`;
    } else if (item.type === 'video' && item.metadata?.transcript) {
      const text = (item.metadata.transcript as string).slice(0, remaining);
      section = `## ${item.title} (Video transcript)\n${text}`;
    } else if (item.type === 'quiz' && item.quizData?.questions?.length) {
      const questions = item.quizData.questions
        .map((q) => `- ${q.question}`)
        .join('\n');
      section = `## Quiz: ${item.title}\n${questions}`;
    } else if (item.description) {
      section = `## ${item.title}\n${item.description}`;
    }

    if (section) {
      sections.push(section);
      totalLength += section.length;
    }
  }

  return sections.join('\n\n');
}

export function useChatWithContent() {
  const mapId = useChatStore((s) => s.currentMapId);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const { data: items } = useContentItemsForMap(mapId || '');

  const sendMessageWithContent = useCallback(
    async (message: string) => {
      const summary = buildContentSummary(items || []);
      await sendMessage(message, summary || undefined);
    },
    [items, sendMessage],
  );

  return { sendMessageWithContent };
}

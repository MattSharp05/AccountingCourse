import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ContentItem, ContentItemType, QuizData } from '../types/admin';
import { chapterKeys } from './useChapters';

export const contentItemKeys = {
  forMap: (mapId: string) => ['contentItems', { mapId }] as const,
};

function rowToContentItem(row: Record<string, unknown>): ContentItem {
  return {
    id: row.id as string,
    chapterId: row.chapter_id as string,
    type: row.type as ContentItemType,
    title: row.title as string,
    description: row.description as string,
    fileUrl: (row.file_url as string) ?? undefined,
    textContent: (row.text_content as string) ?? undefined,
    quizData: (row.quiz_data as QuizData) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    order: row.order as number,
    createdAt: row.created_at as string,
  };
}

export function useContentItemsForMap(mapId: string) {
  return useQuery({
    queryKey: contentItemKeys.forMap(mapId),
    queryFn: async () => {
      // Get chapter IDs for this map
      const { data: chapters, error: chErr } = await supabase
        .from('chapters')
        .select('id')
        .eq('map_id', mapId);
      if (chErr) throw chErr;

      const chapterIds = (chapters as any[]).map((c) => c.id);
      if (chapterIds.length === 0) return [];

      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('order', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(rowToContentItem);
    },
    enabled: !!mapId,
  });
}

export function useAddContentItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chapterId, type, title }: { chapterId: string; type: ContentItemType; title: string; mapId: string }) => {
      const { count } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapterId);

      console.log('[addContentItem] Inserting:', { chapterId, type, title, order: (count ?? 0) + 1 });
      const { data, error } = await supabase
        .from('content_items')
        .insert({ chapter_id: chapterId, type, title, order: (count ?? 0) + 1 } as any)
        .select()
        .single();
      if (error) {
        console.error('[addContentItem] DB error:', error);
        throw error;
      }
      console.log('[addContentItem] Created:', (data as any).id);
      return rowToContentItem(data as any);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contentItemKeys.forMap(variables.mapId) });
      queryClient.invalidateQueries({ queryKey: chapterKeys.forMap(variables.mapId) });
    },
  });
}

export function useUpdateContentItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mapId, ...updates }: {
      id: string;
      mapId: string;
      title?: string;
      description?: string;
      fileUrl?: string | null;
      textContent?: string | null;
      quizData?: QuizData | null;
      metadata?: Record<string, unknown> | null;
      order?: number;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;
      if (updates.textContent !== undefined) dbUpdates.text_content = updates.textContent;
      if (updates.quizData !== undefined) dbUpdates.quiz_data = updates.quizData;
      if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;
      if (updates.order !== undefined) dbUpdates.order = updates.order;

      console.log('[updateContentItem] Updating:', { id, fields: Object.keys(dbUpdates) });
      const { error } = await supabase
        .from('content_items')
        .update(dbUpdates as any)
        .eq('id', id);
      if (error) {
        console.error('[updateContentItem] DB error:', error);
        throw error;
      }
      console.log('[updateContentItem] Updated successfully');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contentItemKeys.forMap(variables.mapId) });
    },
  });
}

export function useDeleteContentItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; mapId: string }) => {
      const { error } = await supabase.from('content_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contentItemKeys.forMap(variables.mapId) });
    },
  });
}

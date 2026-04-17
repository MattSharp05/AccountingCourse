import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ContentItem, ContentItemType, QuizData } from '../types/admin';
import { checkpointKeys } from './useCheckpoints';

export const contentItemKeys = {
  forMap: (mapId: string) => ['contentItems', { mapId }] as const,
  forCheckpoint: (checkpointId: string) => ['contentItems', { checkpointId }] as const,
};

function rowToContentItem(row: Record<string, unknown>): ContentItem {
  return {
    id: row.id as string,
    checkpointId: row.checkpoint_id as string,
    type: row.type as ContentItemType,
    title: row.title as string,
    description: (row.description as string) ?? '',
    fileUrl: (row.file_url as string) ?? undefined,
    textContent: (row.text_content as string) ?? undefined,
    quizData: (row.quiz_data as QuizData) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    order: row.order as number,
    createdAt: row.created_at as string,
  };
}

/** Fetch all content items for a map (through checkpoints → chapters) */
export function useContentItemsForMap(mapId: string) {
  return useQuery({
    queryKey: contentItemKeys.forMap(mapId),
    queryFn: async () => {
      // chapters → checkpoints → content_items
      const { data: chapters, error: chErr } = await supabase
        .from('chapters')
        .select('id')
        .eq('map_id', mapId);
      if (chErr) throw chErr;

      const chapterIds = (chapters as any[]).map((c) => c.id);
      if (chapterIds.length === 0) return [];

      const { data: checkpoints, error: cpErr } = await supabase
        .from('checkpoints')
        .select('id')
        .in('chapter_id', chapterIds);
      if (cpErr) throw cpErr;

      const checkpointIds = (checkpoints as any[]).map((cp) => cp.id);
      if (checkpointIds.length === 0) return [];

      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .in('checkpoint_id', checkpointIds)
        .order('order', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(rowToContentItem);
    },
    enabled: !!mapId,
  });
}

/** Fetch content items for a single checkpoint */
export function useContentItemsForCheckpoint(checkpointId: string) {
  return useQuery({
    queryKey: contentItemKeys.forCheckpoint(checkpointId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('checkpoint_id', checkpointId)
        .order('order', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(rowToContentItem);
    },
    enabled: !!checkpointId,
  });
}

export function useAddContentItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ checkpointId, type, title, quizData }: {
      checkpointId: string;
      type: ContentItemType;
      title: string;
      mapId: string;
      quizData?: QuizData;
    }) => {
      const { count } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('checkpoint_id', checkpointId);

      const insertData: Record<string, unknown> = {
        checkpoint_id: checkpointId,
        type,
        title,
        order: (count ?? 0) + 1,
      };
      if (quizData) insertData.quiz_data = quizData;

      console.log('[addContentItem] Inserting:', { checkpointId, type, title, hasQuizData: !!quizData });
      const { data, error } = await (supabase
        .from('content_items') as any)
        .insert(insertData)
        .select()
        .single();
      if (error) {
        console.error('[addContentItem] DB error:', error);
        throw error;
      }
      console.log('[addContentItem] Created:', data.id);
      return rowToContentItem(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contentItemKeys.forMap(variables.mapId) });
      queryClient.invalidateQueries({ queryKey: contentItemKeys.forCheckpoint(variables.checkpointId) });
      queryClient.invalidateQueries({ queryKey: checkpointKeys.forMap(variables.mapId) });
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

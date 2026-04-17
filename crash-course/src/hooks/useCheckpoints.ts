import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Checkpoint } from '../types/admin';
import { chapterKeys } from './useChapters';

export const checkpointKeys = {
  forChapter: (chapterId: string) => ['checkpoints', { chapterId }] as const,
  forMap: (mapId: string) => ['checkpoints', { mapId }] as const,
};

function rowToCheckpoint(row: Record<string, unknown>): Checkpoint {
  return {
    id: row.id as string,
    chapterId: row.chapter_id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    order: row.order as number,
    createdAt: row.created_at as string,
  };
}

export function useCheckpointsForMap(mapId: string) {
  return useQuery({
    queryKey: checkpointKeys.forMap(mapId),
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
        .from('checkpoints')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('order', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(rowToCheckpoint);
    },
    enabled: !!mapId,
  });
}

export function useCheckpointsForChapter(chapterId: string) {
  return useQuery({
    queryKey: checkpointKeys.forChapter(chapterId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('order', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(rowToCheckpoint);
    },
    enabled: !!chapterId,
  });
}

export function useAddCheckpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chapterId, title }: { chapterId: string; title: string; mapId: string }) => {
      const { count } = await supabase
        .from('checkpoints')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapterId);

      console.log('[addCheckpoint] Creating:', { chapterId, title, order: (count ?? 0) + 1 });
      const { data, error } = await (supabase
        .from('checkpoints') as any)
        .insert({ chapter_id: chapterId, title, order: (count ?? 0) + 1 })
        .select()
        .single();
      if (error) {
        console.error('[addCheckpoint] DB error:', error);
        throw error;
      }
      console.log('[addCheckpoint] Created:', data.id);
      return rowToCheckpoint(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: checkpointKeys.forMap(variables.mapId) });
      queryClient.invalidateQueries({ queryKey: checkpointKeys.forChapter(variables.chapterId) });
    },
  });
}

export function useUpdateCheckpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mapId, ...updates }: {
      id: string;
      mapId: string;
      title?: string;
      description?: string;
      order?: number;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.order !== undefined) dbUpdates.order = updates.order;

      const { error } = await (supabase
        .from('checkpoints') as any)
        .update(dbUpdates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: checkpointKeys.forMap(variables.mapId) });
    },
  });
}

export function useDeleteCheckpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; mapId: string }) => {
      const { error } = await supabase.from('checkpoints').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: checkpointKeys.forMap(variables.mapId) });
      queryClient.invalidateQueries({ queryKey: chapterKeys.forMap(variables.mapId) });
    },
  });
}

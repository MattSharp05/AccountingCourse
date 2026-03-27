import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Chapter } from '../types/admin';

export const chapterKeys = {
  forMap: (mapId: string) => ['chapters', { mapId }] as const,
};

function rowToChapter(row: Record<string, unknown>): Chapter {
  return {
    id: row.id as string,
    mapId: row.map_id as string,
    title: row.title as string,
    order: row.order as number,
  };
}

export function useChaptersForMap(mapId: string) {
  return useQuery({
    queryKey: chapterKeys.forMap(mapId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('map_id', mapId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data.map(rowToChapter);
    },
    enabled: !!mapId,
  });
}

export function useAddChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mapId, title }: { mapId: string; title: string }) => {
      const { count } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('map_id', mapId);

      const { data, error } = await supabase
        .from('chapters')
        .insert({ map_id: mapId, title, order: (count ?? 0) + 1 })
        .select()
        .single();
      if (error) throw error;
      return rowToChapter(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: chapterKeys.forMap(variables.mapId) });
    },
  });
}

export function useDeleteChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; mapId: string }) => {
      const { error } = await supabase.from('chapters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: chapterKeys.forMap(variables.mapId) });
    },
  });
}

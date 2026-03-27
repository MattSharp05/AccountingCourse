import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { MapData, MapStatus, CanvasData, MapConfig } from '../types/admin';

export const mapKeys = {
  forModule: (moduleId: string) => ['maps', { moduleId }] as const,
  detail: (mapId: string) => ['maps', mapId] as const,
};

function rowToMap(row: Record<string, unknown>): MapData {
  return {
    id: row.id as string,
    moduleId: row.module_id as string,
    title: row.title as string,
    status: row.status as MapStatus,
    canvasData: (row.canvas_data as CanvasData) ?? null,
    mapConfig: (row.map_config as MapConfig) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useMapsForModule(moduleId: string) {
  return useQuery({
    queryKey: mapKeys.forModule(moduleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(rowToMap);
    },
    enabled: !!moduleId,
  });
}

export function useMap(mapId: string) {
  return useQuery({
    queryKey: mapKeys.detail(mapId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .single();
      if (error) throw error;
      return rowToMap(data);
    },
    enabled: !!mapId,
  });
}

export function useAddMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, title }: { moduleId: string; title: string }) => {
      const { data, error } = await supabase
        .from('maps')
        .insert({ module_id: moduleId, title })
        .select()
        .single();
      if (error) throw error;
      return rowToMap(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mapKeys.forModule(variables.moduleId) });
    },
  });
}

export function useUpdateMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      moduleId?: string;
      title?: string;
      status?: string;
      canvasData?: CanvasData;
      mapConfig?: MapConfig;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.canvasData !== undefined) dbUpdates.canvas_data = updates.canvasData;
      if (updates.mapConfig !== undefined) dbUpdates.map_config = updates.mapConfig;

      console.log('[useUpdateMap] Saving to DB:', { id, fields: Object.keys(dbUpdates) });
      const { error } = await supabase
        .from('maps')
        .update(dbUpdates)
        .eq('id', id);
      if (error) {
        console.error('[useUpdateMap] DB error:', error);
        throw error;
      }
      console.log('[useUpdateMap] Saved successfully');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mapKeys.detail(variables.id) });
      // Also invalidate the list query so ModuleDetail page reflects changes immediately
      if (variables.moduleId) {
        queryClient.invalidateQueries({ queryKey: mapKeys.forModule(variables.moduleId) });
      }
      // Broad invalidation for status changes when moduleId isn't provided
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });
}

export function useDeleteMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; moduleId: string }) => {
      const { error } = await supabase.from('maps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mapKeys.forModule(variables.moduleId) });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { MapData, MapStatus, CanvasData, MapConfig, ContentItem, ContentItemType, QuizData } from '../types/admin';

// ── Query keys ──────────────────────────────────────────

export const publicMapKeys = {
  published: ['publicMaps', 'published'] as const,
  detail: (mapId: string) => ['publicMaps', mapId] as const,
  checkpointItems: (checkpointId: string) => ['publicCheckpointItems', checkpointId] as const,
};

// ── Types ───────────────────────────────────────────────

export interface PublishedMapSummary {
  id: string;
  title: string;
  courseTitle: string;
  moduleTitle: string;
  nodeCount: number;
  createdAt: string;
}

// ── Hooks ───────────────────────────────────────────────

export function usePublishedMaps() {
  return useQuery({
    queryKey: publicMapKeys.published,
    queryFn: async (): Promise<PublishedMapSummary[]> => {
      const { data, error } = await supabase
        .from('maps')
        .select('id, title, map_config, created_at, modules!inner(title, courses!inner(title))')
        .eq('status', 'published')
        .not('map_config', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data || []) as any[]).map((row: Record<string, unknown>) => {
        const modules = row.modules as Record<string, unknown> | undefined;
        const courses = modules?.courses as Record<string, unknown> | undefined;
        const mapConfig = row.map_config as MapConfig | null;

        return {
          id: row.id as string,
          title: row.title as string,
          courseTitle: (courses?.title as string) || 'Untitled Course',
          moduleTitle: (modules?.title as string) || 'Untitled Module',
          nodeCount: mapConfig?.nodes?.length || 0,
          createdAt: row.created_at as string,
        };
      });
    },
  });
}

export function usePublicMap(mapId: string) {
  return useQuery({
    queryKey: publicMapKeys.detail(mapId),
    queryFn: async (): Promise<MapData> => {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .single();

      if (error) throw error;

      const row = data as any;
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
    },
    enabled: !!mapId,
  });
}

/**
 * Fetches all content items for a checkpoint.
 * Used by the tabbed checkpoint viewer in GameMap.
 */
export function usePublicCheckpointItems(checkpointId: string | null) {
  return useQuery({
    queryKey: publicMapKeys.checkpointItems(checkpointId || ''),
    queryFn: async (): Promise<ContentItem[]> => {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('checkpoint_id', checkpointId!)
        .order('order', { ascending: true });

      if (error) throw error;

      return ((data || []) as any[]).map((row: Record<string, unknown>): ContentItem => ({
        id: row.id as string,
        checkpointId: row.checkpoint_id as string,
        type: row.type as ContentItemType,
        title: row.title as string,
        description: (row.description as string) || '',
        fileUrl: (row.file_url as string) ?? undefined,
        textContent: (row.text_content as string) ?? undefined,
        quizData: (row.quiz_data as QuizData) ?? undefined,
        metadata: (row.metadata as Record<string, unknown>) ?? undefined,
        order: row.order as number,
        createdAt: row.created_at as string,
      }));
    },
    enabled: !!checkpointId,
  });
}

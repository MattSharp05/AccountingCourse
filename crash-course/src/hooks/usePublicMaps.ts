import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { MapData, MapStatus, CanvasData, MapConfig, ContentItem, ContentItemType, QuizData } from '../types/admin';

// ── Query keys ──────────────────────────────────────────

export const publicMapKeys = {
  published: ['publicMaps', 'published'] as const,
  detail: (mapId: string) => ['publicMaps', mapId] as const,
  contentItem: (id: string) => ['publicContentItem', id] as const,
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

/**
 * Fetches all published maps that have a built map_config.
 * Used on the Home page to list playable maps.
 */
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

/**
 * Fetches a single published map by ID, including its map_config.
 * Used by GameMap to load the 3D scene.
 */
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
 * Fetches a single content item by ID on demand.
 * Used by ContentViewer when a student interacts with a node.
 */
export function usePublicContentItem(contentItemId: string | null) {
  return useQuery({
    queryKey: publicMapKeys.contentItem(contentItemId || ''),
    queryFn: async (): Promise<ContentItem> => {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('id', contentItemId!)
        .single();

      if (error) throw error;

      const row = data as any;
      return {
        id: row.id as string,
        chapterId: row.chapter_id as string,
        type: row.type as ContentItemType,
        title: row.title as string,
        description: (row.description as string) || '',
        fileUrl: (row.file_url as string) ?? undefined,
        textContent: (row.text_content as string) ?? undefined,
        quizData: (row.quiz_data as QuizData) ?? undefined,
        metadata: (row.metadata as Record<string, unknown>) ?? undefined,
        order: row.order as number,
        createdAt: row.created_at as string,
      };
    },
    enabled: !!contentItemId,
  });
}

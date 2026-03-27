import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Module, PublishStatus } from '../types/admin';

export const moduleKeys = {
  forCourse: (courseId: string) => ['modules', { courseId }] as const,
};

function rowToModule(row: Record<string, unknown>): Module {
  return {
    id: row.id as string,
    courseId: row.course_id as string,
    title: row.title as string,
    description: row.description as string,
    order: row.order as number,
    status: row.status as PublishStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useModulesForCourse(courseId: string) {
  return useQuery({
    queryKey: moduleKeys.forCourse(courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*, maps(count)')
        .eq('course_id', courseId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data.map((row) => ({
        ...rowToModule(row),
        mapCount: (row.maps as { count: number }[])?.[0]?.count ?? 0,
      }));
    },
    enabled: !!courseId,
  });
}

export function useAddModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, title, description }: { courseId: string; title: string; description: string }) => {
      // Get next order value
      const { count } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      const { data, error } = await supabase
        .from('modules')
        .insert({ course_id: courseId, title, description, order: (count ?? 0) + 1 })
        .select()
        .single();
      if (error) throw error;
      return rowToModule(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.forCourse(variables.courseId) });
    },
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId, ...updates }: { id: string; courseId: string; title?: string; description?: string; status?: string; order?: number }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.order !== undefined) dbUpdates.order = updates.order;

      const { error } = await supabase
        .from('modules')
        .update(dbUpdates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.forCourse(variables.courseId) });
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; courseId: string }) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: moduleKeys.forCourse(variables.courseId) });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Course, PublishStatus } from '../types/admin';

export const courseKeys = {
  all: ['courses'] as const,
  detail: (id: string) => ['courses', id] as const,
};

function rowToCourse(row: Record<string, unknown>): Course {
  return {
    id: row.id as string,
    professorId: row.professor_id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as PublishStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useCourses() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: courseKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, modules(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((row) => ({
        ...rowToCourse(row),
        moduleCount: (row.modules as { count: number }[])?.[0]?.count ?? 0,
      }));
    },
    enabled: !!userId,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return rowToCourse(data);
    },
    enabled: !!id,
  });
}

export function useAddCourse() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({ title, description, professor_id: userId! })
        .select()
        .single();
      if (error) throw error;
      return rowToCourse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; status?: string }) => {
      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

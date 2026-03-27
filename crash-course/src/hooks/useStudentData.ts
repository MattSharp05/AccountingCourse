import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type {
  Course,
  Module,
  MapConfig,
  MapStatus,
  PublishStatus,
  ProgressStatus,
  StudentProgress,
} from '../types/admin';

// ── Query keys ──────────────────────────────────────────

export const studentKeys = {
  courses: ['student', 'courses'] as const,
  course: (id: string) => ['student', 'courses', id] as const,
  courseModules: (courseId: string) => ['student', 'modules', { courseId }] as const,
  enrollments: ['student', 'enrollments'] as const,
  progress: (mapId: string) => ['student', 'progress', { mapId }] as const,
  allProgress: ['student', 'progress'] as const,
};

// ── Types ───────────────────────────────────────────────

export interface PublicCourse extends Course {
  moduleCount: number;
  professorName: string;
  professorEmail: string;
  professorAvatarUrl?: string;
}

export interface PublicModuleMap {
  id: string;
  title: string;
  nodeCount: number;
  status: MapStatus;
}

export interface PublicModule extends Module {
  mapCount: number;
  maps: PublicModuleMap[];
}

// ── Hooks ───────────────────────────────────────────────

/**
 * Fetches all published courses visible to students.
 * Uses the existing RLS policy: "Anyone can read courses with published maps"
 */
export function usePublicCourses() {
  return useQuery({
    queryKey: studentKeys.courses,
    queryFn: async (): Promise<PublicCourse[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          modules(count),
          profiles!courses_professor_id_fkey(display_name, email, avatar_url)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data || []) as any[]).map((row: Record<string, unknown>) => {
        const modules = row.modules as { count: number }[];
        const profile = row.profiles as Record<string, unknown> | null;

        return {
          id: row.id as string,
          professorId: row.professor_id as string,
          title: row.title as string,
          description: (row.description as string) || '',
          status: row.status as PublishStatus,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          moduleCount: modules?.[0]?.count ?? 0,
          professorName: (profile?.display_name as string) || 'Instructor',
          professorEmail: (profile?.email as string) || '',
          professorAvatarUrl: (profile?.avatar_url as string) || undefined,
        };
      });
    },
  });
}

/**
 * Fetches a single published course with professor info.
 */
export function usePublicCourse(courseId: string) {
  return useQuery({
    queryKey: studentKeys.course(courseId),
    queryFn: async (): Promise<PublicCourse> => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          modules(count),
          profiles!courses_professor_id_fkey(display_name, email, avatar_url)
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;

      const row = data as any;
      const modules = row.modules as { count: number }[];
      const profile = row.profiles as Record<string, unknown> | null;

      return {
        id: row.id as string,
        professorId: row.professor_id as string,
        title: row.title as string,
        description: (row.description as string) || '',
        status: row.status as PublishStatus,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        moduleCount: modules?.[0]?.count ?? 0,
        professorName: (profile?.display_name as string) || 'Instructor',
        professorEmail: (profile?.email as string) || '',
        professorAvatarUrl: (profile?.avatar_url as string) || undefined,
      };
    },
    enabled: !!courseId,
  });
}

/**
 * Fetches published modules for a course, each with their published maps.
 */
export function usePublicModulesForCourse(courseId: string) {
  return useQuery({
    queryKey: studentKeys.courseModules(courseId),
    queryFn: async (): Promise<PublicModule[]> => {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          maps(id, title, status, map_config)
        `)
        .eq('course_id', courseId)
        .order('order', { ascending: true });

      if (error) throw error;

      return ((data || []) as any[]).map((row: Record<string, unknown>) => {
        const maps = (row.maps as Record<string, unknown>[]) || [];
        const publishedMaps = maps
          .filter((m) => m.status === 'published' && m.map_config !== null)
          .map((m) => ({
            id: m.id as string,
            title: m.title as string,
            nodeCount: ((m.map_config as MapConfig)?.nodes?.length) || 0,
            status: m.status as MapStatus,
          }));

        return {
          id: row.id as string,
          courseId: row.course_id as string,
          title: row.title as string,
          description: (row.description as string) || '',
          order: row.order as number,
          status: row.status as PublishStatus,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          mapCount: publishedMaps.length,
          maps: publishedMaps,
        };
      });
    },
    enabled: !!courseId,
  });
}

/**
 * Fetches ALL completed progress for the current student.
 */
export function useStudentAllProgress() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: studentKeys.allProgress,
    queryFn: async (): Promise<StudentProgress[]> => {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', userId!)
        .eq('status', 'completed');

      if (error) throw error;

      return ((data || []) as any[]).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        contentItemId: row.content_item_id as string,
        mapId: row.map_id as string,
        status: row.status as ProgressStatus,
        score: (row.score as number) ?? undefined,
        completedAt: (row.completed_at as string) ?? undefined,
      }));
    },
    enabled: !!userId,
  });
}

/**
 * Fetches student progress for a specific map.
 */
export function useStudentMapProgress(mapId: string) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: studentKeys.progress(mapId),
    queryFn: async (): Promise<StudentProgress[]> => {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', userId!)
        .eq('map_id', mapId);

      if (error) throw error;

      return ((data || []) as any[]).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        contentItemId: row.content_item_id as string,
        mapId: row.map_id as string,
        status: row.status as ProgressStatus,
        score: (row.score as number) ?? undefined,
        completedAt: (row.completed_at as string) ?? undefined,
      }));
    },
    enabled: !!userId && !!mapId,
  });
}

// ── Enrollment Hooks ────────────────────────────────────

/**
 * Fetches the current student's enrolled course IDs.
 */
export function useEnrollments() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: studentKeys.enrollments,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', userId!);

      if (error) throw error;
      return ((data || []) as any[]).map((row) => row.course_id as string);
    },
    enabled: !!userId,
  });
}

/**
 * Enroll the current student in a course.
 */
export function useEnroll() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('student_enrollments')
        .insert({ student_id: userId!, course_id: courseId } as any);
      if (error) throw error;
    },
    onMutate: async (courseId: string) => {
      await queryClient.cancelQueries({ queryKey: studentKeys.enrollments });
      const previous = queryClient.getQueryData<string[]>(studentKeys.enrollments);
      queryClient.setQueryData<string[]>(studentKeys.enrollments, (old) => [...(old || []), courseId]);
      return { previous };
    },
    onError: (_err, _courseId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(studentKeys.enrollments, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.enrollments });
    },
  });
}

/**
 * Unenroll the current student from a course.
 */
export function useUnenroll() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('student_enrollments')
        .delete()
        .eq('student_id', userId!)
        .eq('course_id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.enrollments });
    },
  });
}

/**
 * Upserts student progress (mark a content item as completed).
 */
export function useUpsertProgress() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({
      contentItemId,
      mapId,
      status,
      score,
    }: {
      contentItemId: string;
      mapId: string;
      status: ProgressStatus;
      score?: number;
    }) => {
      const { error } = await supabase
        .from('student_progress')
        .upsert(
          {
            student_id: userId!,
            content_item_id: contentItemId,
            map_id: mapId,
            status,
            score: score ?? null,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
          } as any,
          { onConflict: 'student_id,content_item_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.progress(variables.mapId) });
      queryClient.invalidateQueries({ queryKey: studentKeys.allProgress });
    },
  });
}

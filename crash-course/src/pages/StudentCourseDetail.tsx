import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Map as MapIcon } from 'lucide-react';
import { StudentLayout } from '../components/StudentLayout';
import { BrandButton, FadeIn, RevealOnScroll, StaggerList, StaggerItem } from '../components/ui';
import { usePublicCourse, usePublicModulesForCourse, useStudentAllProgress } from '../hooks';
import type { PublicModule } from '../hooks/useStudentData';

export function StudentCourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading: courseLoading } = usePublicCourse(courseId!);
  const { data: modules, isLoading: modulesLoading } = usePublicModulesForCourse(courseId!);
  const { data: allProgress } = useStudentAllProgress();

  const isLoading = courseLoading || modulesLoading;

  const getModuleProgress = (mod: PublicModule) => {
    const mapIds = mod.maps.map((m) => m.id);
    const totalNodes = mod.maps.reduce((sum, m) => sum + m.nodeCount, 0);
    const completedNodes = (allProgress || []).filter(
      (p) => mapIds.includes(p.mapId) && p.status === 'completed'
    ).length;
    return { total: totalNodes, completed: completedNodes };
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#9ca3af]">Loading course...</span>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!course) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center py-32">
          <h2 className="text-xl font-bold text-white mb-2">Course not found</h2>
          <p className="text-[#9ca3af] mb-6">
            This course may not exist or is not yet published.
          </p>
          <BrandButton variant="outline" onClick={() => navigate('/home')}>
            Back to courses
          </BrandButton>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-14 pb-12">
        {/* ─── Breadcrumb + instructor ─── */}
        <div className="flex items-start justify-between gap-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/home"
              className="text-[#9ca3af] hover:text-white transition-colors font-medium"
            >
              Courses
            </Link>
            <ChevronRight className="w-4 h-4 text-[#6b7280]" />
            <span className="text-white font-semibold truncate max-w-xs">
              {course.title}
            </span>
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {course.professorAvatarUrl ? (
                <img
                  src={course.professorAvatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-brand-accent">
                  {course.professorName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white leading-tight">
                {course.professorName}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
                Instructor
              </p>
            </div>
          </div>
        </div>

        {/* ─── Course title + description ─── */}
        <FadeIn y={12}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
              Course
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
              {course.title}
            </h1>
            {course.description && (
              <p className="mt-5 text-lg text-[#9ca3af] leading-relaxed max-w-2xl">
                {course.description}
              </p>
            )}
          </div>
        </FadeIn>

        {/* ─── Modules ─── */}
        <RevealOnScroll>
          <section>
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-2">
                Curriculum
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Modules
              </h2>
            </div>

            {!modules?.length ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-brand-dark-card/50 py-16 text-center">
                <p className="text-[#9ca3af]">No modules available yet.</p>
              </div>
            ) : (
              <StaggerList className="flex flex-col gap-5 max-w-4xl">
                {modules.map((mod) => (
                  <StaggerItem key={mod.id}>
                    <ModuleCard
                      module={mod}
                      progress={getModuleProgress(mod)}
                      onOpenMap={(mapId) => navigate(`/game/map/${mapId}`)}
                    />
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </section>
        </RevealOnScroll>
      </div>
    </StudentLayout>
  );
}

function ModuleCard({
  module: mod,
  progress,
  onOpenMap,
}: {
  module: PublicModule;
  progress: { total: number; completed: number };
  onOpenMap: (mapId: string) => void;
}) {
  const percentage = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="card-glow bg-brand-dark-card rounded-2xl p-6 md:p-7">
      <div className="flex items-start gap-5">
        {/* Order badge */}
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-display font-bold flex items-center justify-center text-lg">
          {mod.order}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {mod.title}
            </h3>
            {progress.total > 0 && (
              <div className="flex-shrink-0 w-32">
                <div className="flex justify-end mb-1">
                  <span className="text-xs text-[#9ca3af]">{percentage}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-accent to-brand-accent-dark transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {mod.description && (
            <p className="text-sm text-[#9ca3af] mb-5 line-clamp-2 leading-relaxed">
              {mod.description}
            </p>
          )}

          {mod.maps.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mod.maps.map((map) => (
                <BrandButton
                  key={map.id}
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenMap(map.id)}
                  leftIcon={<MapIcon className="w-3.5 h-3.5" />}
                >
                  {mod.maps.length > 1 ? `Open: ${map.title}` : 'Open Map'}
                </BrandButton>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6b7280]">No maps published yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentCourseDetail;

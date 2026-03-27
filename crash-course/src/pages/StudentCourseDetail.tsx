import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StudentLayout } from '../components/StudentLayout';
import { ProgressBar } from '../components/ui';
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
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500 font-medium">Loading course...</span>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!course) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <h2 className="text-xl font-bold font-display text-gray-700 mb-2">
            Course not found
          </h2>
          <p className="text-gray-500 mb-6">
            This course may not exist or is not yet published.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-game transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Breadcrumb + Professor info */}
      <div className="flex items-start justify-between mb-6">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            to="/"
            className="text-gray-500 hover:text-primary-600 transition-colors font-medium"
          >
            Courses
          </Link>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-800 font-semibold truncate max-w-xs">
            {course.title}
          </span>
        </nav>

        {/* Professor info — subtle, top-right */}
        <div className="flex items-center gap-2 text-sm flex-shrink-0 ml-4">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {course.professorAvatarUrl ? (
              <img
                src={course.professorAvatarUrl}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-gray-500">
                {course.professorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-700 leading-tight text-sm">
              {course.professorName}
            </p>
            <p className="text-xs text-gray-400">Instructor</p>
          </div>
        </div>
      </div>

      {/* Course title + description */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold font-display text-gray-900 mb-3">
          {course.title}
        </h1>
        {course.description && (
          <p className="text-gray-600 leading-relaxed max-w-2xl">
            {course.description}
          </p>
        )}
      </div>

      {/* Modules */}
      <div className="max-w-4xl">
        <h2 className="text-lg font-bold font-display text-gray-800 mb-4">
          Modules
        </h2>

        {!modules?.length ? (
          <div className="rounded-game-lg border border-gray-200 bg-white py-12 text-center">
            <p className="text-gray-500">No modules available yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {modules.map((mod, i) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                index={i}
                progress={getModuleProgress(mod)}
                onOpenMap={(mapId) => navigate(`/game/map/${mapId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

function ModuleCard({
  module: mod,
  index,
  progress,
  onOpenMap,
}: {
  module: PublicModule;
  index: number;
  progress: { total: number; completed: number };
  onOpenMap: (mapId: string) => void;
}) {
  const percentage = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white rounded-game-lg shadow-game border border-gray-100 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Order badge */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold font-display flex items-center justify-center text-lg">
            {mod.order}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + progress */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="text-base font-semibold font-display text-gray-900">
                {mod.title}
              </h3>
              {progress.total > 0 && (
                <div className="flex-shrink-0 w-28">
                  <div className="flex justify-end mb-0.5">
                    <span className="text-xs text-gray-400">{percentage}%</span>
                  </div>
                  <ProgressBar
                    value={progress.completed}
                    max={progress.total}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            {mod.description && (
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {mod.description}
              </p>
            )}

            {/* Map buttons */}
            {mod.maps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mod.maps.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => onOpenMap(map.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-game shadow-game hover:bg-primary-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    {mod.maps.length > 1 ? `Open Map: ${map.title}` : 'Open Map'}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No maps published yet</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default StudentCourseDetail;

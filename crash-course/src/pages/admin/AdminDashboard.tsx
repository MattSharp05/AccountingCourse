import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useCourses, useAddCourse, useUpdateCourse, useDeleteCourse } from '../../hooks';
import type { Course, PublishStatus } from '../../types/admin';

// ── Status badge config ────────────────────────────────

const statusConfig: Record<
  PublishStatus,
  { label: string; bg: string; text: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  },
  published: {
    label: 'Published',
    bg: 'bg-accent-100',
    text: 'text-accent-700',
  },
  archived: {
    label: 'Archived',
    bg: 'bg-secondary-100',
    text: 'text-secondary-700',
  },
};

// ── Kebab Menu ─────────────────────────────────────────

interface KebabMenuProps {
  course: Course;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}

function KebabMenu({ course, onEdit, onTogglePublish, onDelete }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Course actions"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-game shadow-game-hover border border-gray-100 z-20 overflow-hidden"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
                close();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePublish();
                close();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-accent-50 hover:text-accent-700 transition-colors flex items-center gap-2"
            >
              {course.status === 'published' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Unpublish
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Publish
                </>
              )}
            </button>

            <div className="border-t border-gray-100" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                close();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-error-500 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Course Card ────────────────────────────────────────

interface CourseCardProps {
  course: Course;
  moduleCount: number;
  onNavigate: () => void;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}

function CourseCard({
  course,
  moduleCount,
  onNavigate,
  onEdit,
  onTogglePublish,
  onDelete,
}: CourseCardProps) {
  const status = statusConfig[course.status];
  const formattedDate = new Date(course.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onNavigate}
      className="bg-white rounded-game-lg shadow-game hover:shadow-game-hover border border-gray-100 cursor-pointer transition-shadow overflow-hidden group"
    >
      {/* Color accent bar */}
      <div
        className={`h-1.5 w-full ${
          course.status === 'published'
            ? 'bg-accent-500'
            : course.status === 'archived'
              ? 'bg-secondary-500'
              : 'bg-gray-300'
        }`}
      />

      <div className="p-5">
        {/* Header row: title + kebab */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold font-display text-gray-900 leading-tight line-clamp-2 flex-1">
            {course.title}
          </h3>
          <KebabMenu
            course={course}
            onEdit={onEdit}
            onTogglePublish={onTogglePublish}
            onDelete={onDelete}
          />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
          {course.description || 'No description provided.'}
        </p>

        {/* Footer row: status badge, module count, date */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
            </span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty State ────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex flex-col items-center justify-center py-24 px-4"
    >
      <div className="w-32 h-32 mb-6 rounded-full bg-primary-50 flex items-center justify-center">
        <svg
          className="w-16 h-16 text-primary-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>

      <h3 className="text-2xl font-bold font-display text-gray-800 mb-2">
        No courses yet
      </h3>
      <p className="text-gray-500 text-center max-w-sm mb-8">
        Create your first course to start building interactive learning
        experiences for your students.
      </p>

      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold font-display rounded-game shadow-game hover:bg-primary-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Your First Course
      </motion.button>
    </motion.div>
  );
}

// ── Create Course Modal ────────────────────────────────

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string) => void;
}

function CreateCourseModal({ isOpen, onClose, onCreate }: CreateCourseModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      const timer = setTimeout(() => titleRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onCreate(trimmedTitle, description.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-game-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 font-display">
                Create New Course
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label htmlFor="course-title" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Course Title
                </label>
                <input
                  ref={titleRef}
                  id="course-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Financial Accounting"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-game text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-shadow"
                  required
                />
              </div>
              <div>
                <label htmlFor="course-description" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="course-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief overview of what students will learn..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-game text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-shadow resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-game transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!title.trim()}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-game shadow-game transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Course
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Delete Confirmation Modal ──────────────────────────

function DeleteConfirmModal({
  isOpen,
  courseName,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  courseName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-game-lg shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold font-display text-gray-900 mb-2">
                Delete Course
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-700">&quot;{courseName}&quot;</span>?
                This will also remove all modules, maps, and content. This action
                cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-game transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-error-500 hover:bg-error-600 rounded-game shadow-game transition-colors"
                >
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Main Component ─────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data: coursesData = [], isLoading } = useCourses();
  const addCourseMut = useAddCourse();
  const updateCourseMut = useUpdateCourse();
  const deleteCourseMut = useDeleteCourse();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  const handleCreateCourse = async (title: string, description: string) => {
    const course = await addCourseMut.mutateAsync({ title, description });
    setShowCreateModal(false);
    navigate(`/admin/course/${course.id}`);
  };

  const handleTogglePublish = (course: Course) => {
    updateCourseMut.mutate({
      id: course.id,
      status: course.status === 'published' ? 'draft' : 'published',
    });
  };

  const handleDeleteCourse = () => {
    if (deleteTarget) {
      deleteCourseMut.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const getModuleCount = (courseId: string) =>
    coursesData.find((c) => c.id === courseId)?.moduleCount ?? 0;

  const displayName = user?.displayName || 'Professor';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-xl font-bold font-display text-gray-900">
                Course Builder
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-600">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {displayName}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Log out
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold font-display text-gray-900">
              Your Courses
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {coursesData.length}{' '}
              {coursesData.length === 1 ? 'course' : 'courses'} total
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold font-display rounded-game shadow-game hover:bg-primary-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Course
          </motion.button>
        </div>

        {coursesData.length === 0 ? (
          <EmptyState onCreate={() => setShowCreateModal(true)} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {coursesData.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  moduleCount={getModuleCount(course.id)}
                  onNavigate={() => navigate(`/admin/course/${course.id}`)}
                  onEdit={() => navigate(`/admin/course/${course.id}`)}
                  onTogglePublish={() => handleTogglePublish(course)}
                  onDelete={() => setDeleteTarget(course)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCourse}
      />

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        courseName={deleteTarget?.title || ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCourse}
      />
    </div>
  );
}

export default AdminDashboard;

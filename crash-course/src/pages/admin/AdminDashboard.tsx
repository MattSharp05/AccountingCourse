import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  LogOut,
  X,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCourses, useAddCourse, useUpdateCourse, useDeleteCourse } from '../../hooks';
import { BrandButton, FadeIn } from '../../components/ui';
import type { Course, PublishStatus } from '../../types/admin';

// ── Status badge config ────────────────────────────────

const statusConfig: Record<
  PublishStatus,
  { label: string; bg: string; text: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-white/5',
    text: 'text-[#9ca3af]',
  },
  published: {
    label: 'Published',
    bg: 'bg-brand-accent/10 border border-brand-accent/20',
    text: 'text-brand-accent',
  },
  archived: {
    label: 'Archived',
    bg: 'bg-white/5 border border-white/10',
    text: 'text-[#6b7280]',
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
        className="p-1.5 rounded-lg text-[#6b7280] hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Course actions"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-44 bg-brand-dark-card rounded-xl shadow-2xl shadow-black/40 border border-white/10 z-20 overflow-hidden"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
                close();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 hover:text-brand-accent transition-colors flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePublish();
                close();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 hover:text-brand-accent transition-colors flex items-center gap-2"
            >
              {course.status === 'published' ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Publish
                </>
              )}
            </button>

            <div className="border-t border-white/10" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                close();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
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
      className="bg-brand-dark-card rounded-2xl shadow-2xl shadow-black/40 border border-white/10 hover:border-white/15 cursor-pointer transition-colors overflow-hidden group"
    >
      {/* Color accent bar */}
      <div
        className={`h-1.5 w-full ${
          course.status === 'published'
            ? 'bg-brand-accent'
            : course.status === 'archived'
              ? 'bg-white/15'
              : 'bg-white/10'
        }`}
      />

      <div className="p-5">
        {/* Header row: title + kebab */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 flex-1">
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
        <p className="text-sm text-[#9ca3af] mb-4 line-clamp-2 leading-relaxed">
          {course.description || 'No description provided.'}
        </p>

        {/* Footer row: status badge, module count, date */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>

          <div className="flex items-center gap-3 text-xs text-[#6b7280]">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
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
      <div className="w-32 h-32 mb-6 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
        <BookOpen className="w-16 h-16 text-brand-accent" strokeWidth={1.5} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
        Get Started
      </p>
      <h3 className="text-2xl font-bold text-white mb-2">
        No courses yet
      </h3>
      <p className="text-[#9ca3af] text-center max-w-sm mb-8">
        Create your first course to start building interactive learning
        experiences for your students.
      </p>

      <BrandButton variant="primary" size="md" onClick={onCreate}>
        <Plus className="w-5 h-5 mr-2" />
        Create Your First Course
      </BrandButton>
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-brand-dark-card rounded-2xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-1">
                  New Course
                </p>
                <h2 className="text-xl font-bold text-white">
                  Create New Course
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#6b7280] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label htmlFor="course-title" className="block text-sm font-semibold text-white/90 mb-1.5">
                  Course Title
                </label>
                <input
                  ref={titleRef}
                  id="course-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Financial Accounting"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-shadow"
                  required
                />
              </div>
              <div>
                <label htmlFor="course-description" className="block text-sm font-semibold text-white/90 mb-1.5">
                  Description
                </label>
                <textarea
                  id="course-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief overview of what students will learn..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-shadow resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <BrandButton
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                >
                  Cancel
                </BrandButton>
                <BrandButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!title.trim()}
                >
                  Create Course
                </BrandButton>
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-brand-dark-card rounded-2xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Delete Course
              </h3>
              <p className="text-sm text-[#9ca3af] mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-white/90">&quot;{courseName}&quot;</span>?
                This will also remove all modules, maps, and content. This action
                cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full">
                <BrandButton
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </BrandButton>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 rounded-full transition-colors"
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
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-brand-accent rounded-full animate-spin" />
          <p className="text-sm text-[#9ca3af] font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="min-h-screen bg-brand-dark">
        {/* Header Bar */}
        <header className="bg-brand-dark/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand-accent" />
                </div>
                <h1 className="text-xl font-bold text-white">
                  Course Builder
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-brand-accent">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white/90">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#9ca3af] hover:text-white hover:bg-white/5 rounded-full transition-colors"
                >
                  <LogOut className="w-4 h-4" />
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
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
                Welcome back, {displayName}
              </p>
              <h2 className="text-2xl font-bold text-white">
                Your Courses
              </h2>
              <p className="text-sm text-[#9ca3af] mt-1">
                {coursesData.length}{' '}
                {coursesData.length === 1 ? 'course' : 'courses'} total
              </p>
            </div>
            <BrandButton
              variant="primary"
              size="md"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </BrandButton>
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
    </FadeIn>
  );
}

export default AdminDashboard;

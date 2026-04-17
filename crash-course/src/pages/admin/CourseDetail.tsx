import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Pencil, Trash2, Map as MapIcon, Plus } from 'lucide-react';
import { useCourse, useUpdateCourse, useModulesForCourse, useAddModule, useUpdateModule, useDeleteModule } from '../../hooks';
import { BrandButton, Modal, FadeIn } from '../../components/ui';
import type { PublishStatus } from '../../types/admin';

const statusColors: Record<PublishStatus, string> = {
  draft: 'bg-white/5 text-[#9ca3af] border border-white/10',
  published: 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20',
  archived: 'bg-white/5 text-[#6b7280] border border-white/10',
};

function StatusPill({ status }: { status: PublishStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[status]}`}>
      {status}
    </span>
  );
}

function InlineEdit({
  value,
  onSave,
  className = '',
  inputClassName = '',
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={`bg-white/5 border border-brand-accent/50 rounded-lg px-3 py-1 text-white outline-none focus:ring-2 focus:ring-brand-accent/50 ${inputClassName}`}
      />
    );
  }

  return (
    <span className={`cursor-pointer group inline-flex items-center gap-2 ${className}`} onClick={() => setEditing(true)} title="Click to edit">
      <span>{value}</span>
      <Pencil className="w-3.5 h-3.5 text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity" />
    </span>
  );
}

const nextStatus: Record<PublishStatus, PublishStatus> = {
  draft: 'published',
  published: 'archived',
  archived: 'draft',
};

const listVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const { data: course } = useCourse(courseId!);
  const { data: modulesData = [] } = useModulesForCourse(courseId!);
  const updateCourseMut = useUpdateCourse();
  const addModuleMut = useAddModule();
  const updateModuleMut = useUpdateModule();
  const deleteModuleMut = useDeleteModule();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!courseId || !course) {
    return (
      <div className="min-h-screen bg-brand-dark text-white flex items-center justify-center">
        <FadeIn y={12} className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">Not found</p>
          <h2 className="text-xl font-bold text-white mb-2">Course not found</h2>
          <p className="text-[#9ca3af] mb-6">The course you are looking for does not exist or has been removed.</p>
          <BrandButton variant="outline" onClick={() => navigate('/admin')}>Back to courses</BrandButton>
        </FadeIn>
      </div>
    );
  }

  const handleAddModule = async () => {
    const trimmedTitle = newModuleTitle.trim();
    if (!trimmedTitle || !courseId) return;
    await addModuleMut.mutateAsync({ courseId, title: trimmedTitle, description: newModuleDescription.trim() });
    setNewModuleTitle('');
    setNewModuleDescription('');
    setShowAddModal(false);
  };

  const handleDeleteModule = (id: string) => {
    deleteModuleMut.mutate({ id, courseId: courseId! });
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm mb-8">
          <Link to="/admin" className="text-[#9ca3af] hover:text-white transition-colors font-medium">Courses</Link>
          <ChevronRight className="w-4 h-4 text-[#6b7280]" />
          <span className="text-white font-semibold truncate max-w-xs">{course.title}</span>
        </motion.nav>

        {/* Header */}
        <FadeIn y={12}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-12">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">Course</p>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  <InlineEdit value={course.title} onSave={(title) => updateCourseMut.mutate({ id: course.id, title })} inputClassName="text-3xl md:text-4xl font-bold" />
                </h1>
                <StatusPill status={course.status} />
              </div>
              {course.description && <p className="text-[#9ca3af] mt-3 leading-relaxed max-w-2xl">{course.description}</p>}
            </div>
            <BrandButton
              size="md"
              variant="primary"
              onClick={() => setShowAddModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add module
            </BrandButton>
          </div>
        </FadeIn>

        {/* Section label */}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-4">Modules</p>

        {/* Module list */}
        {modulesData.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-dashed border-white/10 bg-brand-dark-card/50 py-20 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold text-white mb-1">No modules yet</h3>
            <p className="text-[#9ca3af] text-sm mb-6 max-w-sm">Modules organize your course content into logical sections. Add your first module to get started.</p>
            <BrandButton size="sm" variant="primary" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add module</BrandButton>
          </motion.div>
        ) : (
          <motion.ul variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {modulesData.map((mod) => {
                const mapCount = mod.mapCount;
                return (
                  <motion.li key={mod.id} variants={itemVariants} layout exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}>
                    <div
                      className="group relative bg-brand-dark-card rounded-2xl border border-white/10 hover:border-brand-accent/30 transition-all duration-200 cursor-pointer shadow-2xl shadow-black/40"
                      onClick={() => navigate(`/admin/course/${courseId}/module/${mod.id}`)}
                    >
                      <div className="flex items-start gap-4 p-6">
                        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-bold flex items-center justify-center text-lg">
                          {mod.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-base font-semibold text-white truncate">
                              <InlineEdit value={mod.title} onSave={(title) => updateModuleMut.mutate({ id: mod.id, courseId: courseId!, title })} className="truncate" inputClassName="text-base font-semibold" />
                            </span>
                            <StatusPill status={mod.status} />
                          </div>
                          {mod.description && <p className="text-sm text-[#9ca3af] line-clamp-2 mb-2 leading-relaxed">{mod.description}</p>}
                          <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                            <MapIcon className="w-3.5 h-3.5" />
                            <span>{mapCount} {mapCount === 1 ? 'map' : 'maps'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <BrandButton variant="ghost" size="sm" onClick={() => updateModuleMut.mutate({ id: mod.id, courseId: courseId!, status: nextStatus[mod.status] })}>
                            {mod.status === 'draft' && 'Publish'}
                            {mod.status === 'published' && 'Archive'}
                            {mod.status === 'archived' && 'Draft'}
                          </BrandButton>
                          <button
                            onClick={() => setDeletingId(mod.id)}
                            className="p-2 rounded-full text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label="Delete module"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setNewModuleTitle(''); setNewModuleDescription(''); }} title="Add module" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleAddModule(); }} className="flex flex-col gap-5">
          <div>
            <label htmlFor="module-title" className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2">Title</label>
            <input id="module-title" type="text" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="e.g. Introduction to Financial Statements" autoFocus className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors" />
          </div>
          <div>
            <label htmlFor="module-description" className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2">Description</label>
            <textarea id="module-description" value={newModuleDescription} onChange={(e) => setNewModuleDescription(e.target.value)} placeholder="A brief summary of this module..." rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <BrandButton type="button" variant="ghost" size="sm" onClick={() => { setShowAddModal(false); setNewModuleTitle(''); setNewModuleDescription(''); }}>Cancel</BrandButton>
            <BrandButton type="submit" size="sm" variant="primary" disabled={!newModuleTitle.trim()}>Create module</BrandButton>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deletingId !== null} onClose={() => setDeletingId(null)} title="Delete module" size="sm">
        <p className="text-[#9ca3af] mb-6 leading-relaxed">Are you sure you want to delete this module? All maps and content within it will be permanently removed.</p>
        <div className="flex items-center justify-end gap-3">
          <BrandButton variant="ghost" size="sm" onClick={() => setDeletingId(null)}>Cancel</BrandButton>
          <button
            onClick={() => { if (deletingId) handleDeleteModule(deletingId); }}
            className="px-5 py-2 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

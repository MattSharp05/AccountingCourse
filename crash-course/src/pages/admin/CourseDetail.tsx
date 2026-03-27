import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourse, useUpdateCourse, useModulesForCourse, useAddModule, useUpdateModule, useDeleteModule } from '../../hooks';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { PublishStatus } from '../../types/admin';

const statusColors: Record<PublishStatus, string> = {
  draft: 'bg-gray-200 text-gray-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
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
        className={`bg-white border-2 border-primary-400 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-primary-300 ${inputClassName}`}
      />
    );
  }

  return (
    <span className={`cursor-pointer group inline-flex items-center gap-2 ${className}`} onClick={() => setEditing(true)} title="Click to edit">
      <span>{value}</span>
      <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </span>
  );
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function MapIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <h2 className="text-xl font-bold font-display text-gray-700 mb-2">Course not found</h2>
          <p className="text-gray-500 mb-6">The course you are looking for does not exist or has been removed.</p>
          <Button variant="ghost" onClick={() => navigate('/admin')}>Back to Courses</Button>
        </motion.div>
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link to="/admin" className="hover:text-primary-600 transition-colors font-medium">Courses</Link>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-800 font-semibold truncate max-w-xs">{course.title}</span>
        </motion.nav>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold font-display text-gray-900">
                <InlineEdit value={course.title} onSave={(title) => updateCourseMut.mutate({ id: course.id, title })} inputClassName="text-3xl font-bold font-display" />
              </h1>
              <StatusPill status={course.status} />
            </div>
            {course.description && <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-2xl">{course.description}</p>}
          </div>
          <Button size="md" onClick={() => setShowAddModal(true)} leftIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
            Add Module
          </Button>
        </motion.div>

        {/* Module list */}
        {modulesData.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-game-lg border-2 border-dashed border-gray-200 bg-white/60 py-20 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold font-display text-gray-700 mb-1">No modules yet</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">Modules organize your course content into logical sections. Add your first module to get started.</p>
            <Button size="sm" onClick={() => setShowAddModal(true)}>Add Module</Button>
          </motion.div>
        ) : (
          <motion.ul variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {modulesData.map((mod) => {
                const mapCount = mod.mapCount;
                return (
                  <motion.li key={mod.id} variants={itemVariants} layout exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}>
                    <div
                      className="group relative bg-white rounded-game-lg shadow-game border border-gray-100 hover:shadow-game-hover hover:border-primary-200 transition-all duration-200 cursor-pointer"
                      onClick={() => navigate(`/admin/course/${courseId}/module/${mod.id}`)}
                    >
                      <div className="flex items-start gap-4 p-5">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold font-display flex items-center justify-center text-lg">{mod.order}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-base font-semibold font-display text-gray-900 truncate">
                              <InlineEdit value={mod.title} onSave={(title) => updateModuleMut.mutate({ id: mod.id, courseId: courseId!, title })} className="truncate" inputClassName="text-base font-semibold font-display" />
                            </span>
                            <StatusPill status={mod.status} />
                          </div>
                          {mod.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{mod.description}</p>}
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MapIcon className="w-3.5 h-3.5" />
                            <span>{mapCount} {mapCount === 1 ? 'map' : 'maps'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => updateModuleMut.mutate({ id: mod.id, courseId: courseId!, status: nextStatus[mod.status] })}>
                            {mod.status === 'draft' && 'Publish'}
                            {mod.status === 'published' && 'Archive'}
                            {mod.status === 'archived' && 'Draft'}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error-500 hover:bg-error-50" onClick={() => setDeletingId(mod.id)}>
                            <TrashIcon className="w-4 h-4" />
                          </Button>
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

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setNewModuleTitle(''); setNewModuleDescription(''); }} title="Add Module" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleAddModule(); }} className="flex flex-col gap-5">
          <div>
            <label htmlFor="module-title" className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input id="module-title" type="text" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="e.g. Introduction to Financial Statements" autoFocus className="w-full px-4 py-2.5 rounded-game border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors" />
          </div>
          <div>
            <label htmlFor="module-description" className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea id="module-description" value={newModuleDescription} onChange={(e) => setNewModuleDescription(e.target.value)} placeholder="A brief summary of this module..." rows={3} className="w-full px-4 py-2.5 rounded-game border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddModal(false); setNewModuleTitle(''); setNewModuleDescription(''); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!newModuleTitle.trim()}>Create Module</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deletingId !== null} onClose={() => setDeletingId(null)} title="Delete Module" size="sm">
        <p className="text-gray-600 mb-6">Are you sure you want to delete this module? All maps and content within it will be permanently removed.</p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => { if (deletingId) handleDeleteModule(deletingId); }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

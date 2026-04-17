import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreVertical, ChevronRight as ChevronRightIcon, Map as MapIcon } from 'lucide-react';
import { useCourse, useModulesForCourse, useMapsForModule, useAddMap, useUpdateMap, useDeleteMap } from '../../hooks';
import { BrandButton, FadeIn } from '../../components/ui';
import type { MapData, MapStatus, CanvasData } from '../../types/admin';

// ── Status filter types ────────────────────────────────────

type StatusFilter = 'all' | MapStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Hidden', value: 'hidden' },
];

const STATUS_BADGE: Record<MapStatus, { className: string; label: string }> = {
  draft: { className: 'bg-white/5 text-[#9ca3af]', label: 'Draft' },
  published: {
    className: 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20',
    label: 'Published',
  },
  hidden: {
    className: 'bg-white/5 text-[#6b7280] border border-white/10',
    label: 'Hidden',
  },
};

// ── Miniature canvas preview ───────────────────────────────

function CanvasPreview({ canvasData }: { canvasData: CanvasData | null }) {
  if (!canvasData || canvasData.nodes.length === 0) {
    return (
      <div className="h-36 rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center">
        <span className="text-sm text-[#6b7280]">Empty canvas</span>
      </div>
    );
  }

  const { nodes, edges } = canvasData;

  // Compute bounding box of all nodes
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // SVG dimensions with padding
  const svgW = 240;
  const svgH = 144;
  const pad = 20;
  const innerW = svgW - pad * 2;
  const innerH = svgH - pad * 2;

  // Map node positions to SVG coordinates
  const nodePositions = new Map<string, { cx: number; cy: number }>();
  nodes.forEach((node) => {
    const cx = pad + ((node.position.x - minX) / rangeX) * innerW;
    const cy = pad + ((node.position.y - minY) / rangeY) * innerH;
    nodePositions.set(node.id, { cx, cy });
  });

  // Color map for node types — accent-tinted for dark theme
  const typeColors: Record<string, string> = {
    video: '#D4A84F',
    pdf: '#D4A84F',
    file: '#D4A84F',
    text: '#D4A84F',
    quiz: '#D4A84F',
  };

  return (
    <div className="h-36 bg-white/5 rounded-xl overflow-hidden border border-white/10">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edges */}
        {edges.map((edge) => {
          const source = nodePositions.get(edge.source);
          const target = nodePositions.get(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={edge.id}
              x1={source.cx}
              y1={source.cy}
              x2={target.cx}
              y2={target.cy}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          const nodeType = (node.data as { type?: string })?.type ?? 'text';
          const fill = typeColors[nodeType] ?? '#D4A84F';
          return (
            <circle
              key={node.id}
              cx={pos.cx}
              cy={pos.cy}
              r={4}
              fill={fill}
              stroke="#123D33"
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ── Three-dot menu ─────────────────────────────────────────

function MapCardMenu({
  map,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  map: MapData;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggleLabel = map.status === 'published' ? 'Hide' : 'Publish';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-full text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Map actions"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-40 bg-brand-dark-card rounded-xl shadow-2xl shadow-black/40 border border-white/10 py-1 z-20"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-white/5 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onToggleStatus();
              }}
              className="w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-white/5 transition-colors"
            >
              {toggleLabel}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Map card ───────────────────────────────────────────────

function MapCard({
  map,
  onNavigate,
  onToggleStatus,
  onDelete,
}: {
  map: MapData;
  onNavigate: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const badge = STATUS_BADGE[map.status];
  const updatedDate = new Date(map.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const createdDate = new Date(map.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileHover={{ y: -4 }}
      onClick={onNavigate}
      className="bg-brand-dark-card rounded-2xl shadow-2xl shadow-black/40 border border-white/10 cursor-pointer transition-colors hover:border-white/15"
    >
      {/* Canvas preview */}
      <div className="p-3 pb-0">
        <CanvasPreview canvasData={map.canvasData} />
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Title row with menu */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white leading-tight line-clamp-2">
            {map.title}
          </h3>
          <MapCardMenu
            map={map}
            onEdit={onNavigate}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>

        {/* Dates */}
        <div className="mt-3 text-xs text-[#6b7280] space-y-0.5">
          <p>Created: {createdDate}</p>
          <p>Updated: {updatedDate}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Create map modal ───────────────────────────────────────

function CreateMapModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-brand-dark-card rounded-2xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-1">
                New Map
              </p>
              <h2 className="text-xl font-bold text-white">
                Create New Map
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="map-title"
                  className="block text-sm font-medium text-white/90 mb-1"
                >
                  Map Title
                </label>
                <input
                  id="map-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Balance Sheet Basics"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-shadow"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <BrandButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  Cancel
                </BrandButton>
                <BrandButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!title.trim()}
                >
                  Create Map
                </BrandButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Empty state ────────────────────────────────────────────

function EmptyState({ onCreateMap }: { onCreateMap: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
        <MapIcon className="w-10 h-10 text-[#6b7280]" strokeWidth={1.5} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
        Get Started
      </p>
      <h3 className="text-lg font-semibold text-white mb-2">
        No maps yet
      </h3>
      <p className="text-[#9ca3af] mb-6 max-w-sm">
        Maps contain the interactive canvas where you place content nodes for students to explore.
      </p>
      <BrandButton
        variant="primary"
        size="md"
        onClick={onCreateMap}
        leftIcon={<Plus className="w-4 h-4" />}
      >
        Create Your First Map
      </BrandButton>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────

export function ModuleDetail() {
  const navigate = useNavigate();
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();

  const { data: course } = useCourse(courseId!);
  const { data: modulesData } = useModulesForCourse(courseId!);
  const module_ = modulesData?.find((m) => m.id === moduleId);
  const { data: allMaps = [] } = useMapsForModule(moduleId!);

  const addMapMut = useAddMap();
  const updateMapMut = useUpdateMap();
  const deleteMapMut = useDeleteMap();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredMaps = useMemo(() => {
    if (statusFilter === 'all') return allMaps;
    return allMaps.filter((m) => m.status === statusFilter);
  }, [allMaps, statusFilter]);

  const handleCreateMap = async (title: string) => {
    if (!moduleId) return;
    const newMap = await addMapMut.mutateAsync({ moduleId: moduleId!, title });
    navigate(`/admin/map/${newMap.id}`);
  };

  const handleToggleStatus = (map: MapData) => {
    const newStatus: MapStatus = map.status === 'published' ? 'hidden' : 'published';
    updateMapMut.mutate({ id: map.id, status: newStatus });
  };

  const handleDeleteMap = (mapId: string) => {
    deleteMapMut.mutate({ id: mapId, moduleId: moduleId! });
  };

  // Not-found guard
  if (!course || !module_) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
            Error
          </p>
          <h2 className="text-2xl font-bold text-white mb-2">
            Module Not Found
          </h2>
          <p className="text-[#9ca3af] mb-6">
            The module you are looking for does not exist.
          </p>
          <Link
            to="/admin"
            className="text-brand-accent hover:text-brand-accent-light font-medium underline"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <FadeIn>
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[#9ca3af] mb-6">
            <Link
              to="/admin"
              className="hover:text-brand-accent transition-colors"
            >
              Courses
            </Link>
            <ChevronRightIcon className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
            <Link
              to={`/admin/course/${courseId}`}
              className="hover:text-brand-accent transition-colors"
            >
              {course.title}
            </Link>
            <ChevronRightIcon className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
            <span className="text-white font-medium">{module_.title}</span>
          </nav>

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
                Module
              </p>
              <h1 className="text-3xl font-bold text-white">
                {module_.title}
              </h1>
            </div>

            <BrandButton
              variant="primary"
              size="md"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="self-start sm:self-auto"
            >
              Create Map
            </BrandButton>
          </motion.div>

          {/* Maps section eyebrow */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
              Maps
            </p>
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                    ${
                      isActive
                        ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                        : 'bg-white/5 text-[#9ca3af] border border-white/10 hover:text-white hover:border-white/15'
                    }
                  `}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Map grid or empty state */}
          {filteredMaps.length === 0 && statusFilter === 'all' ? (
            <EmptyState onCreateMap={() => setShowCreateModal(true)} />
          ) : filteredMaps.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-[#9ca3af]"
            >
              No maps matching the "{STATUS_BADGE[statusFilter as MapStatus]?.label}" filter.
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredMaps.map((map) => (
                  <MapCard
                    key={map.id}
                    map={map}
                    onNavigate={() => navigate(`/admin/map/${map.id}`)}
                    onToggleStatus={() => handleToggleStatus(map)}
                    onDelete={() => handleDeleteMap(map.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </FadeIn>

      {/* Create map modal */}
      <CreateMapModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateMap}
      />
    </div>
  );
}

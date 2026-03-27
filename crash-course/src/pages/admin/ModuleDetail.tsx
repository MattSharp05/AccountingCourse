import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourse, useModulesForCourse, useMapsForModule, useAddMap, useUpdateMap, useDeleteMap } from '../../hooks';
import type { MapData, MapStatus, CanvasData } from '../../types/admin';

// ── Status filter types ────────────────────────────────────

type StatusFilter = 'all' | MapStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Hidden', value: 'hidden' },
];

const STATUS_BADGE: Record<MapStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
  hidden: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Hidden' },
};

// ── Miniature canvas preview ───────────────────────────────

function CanvasPreview({ canvasData }: { canvasData: CanvasData | null }) {
  if (!canvasData || canvasData.nodes.length === 0) {
    return (
      <div className="h-36 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
        <span className="text-sm text-gray-400">Empty canvas</span>
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

  // Color map for node types
  const typeColors: Record<string, string> = {
    video: '#4F46E5',
    pdf: '#0891b2',
    file: '#059669',
    text: '#6366f1',
    quiz: '#dc2626',
  };

  return (
    <div className="h-36 bg-gray-50 rounded-lg overflow-hidden">
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
              stroke="#d1d5db"
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
          const fill = typeColors[nodeType] ?? '#6366f1';
          return (
            <circle
              key={node.id}
              cx={pos.cx}
              cy={pos.cy}
              r={4}
              fill={fill}
              stroke="white"
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
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Map actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onToggleStatus();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {toggleLabel}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
      className="bg-white rounded-game-lg shadow-game border border-gray-100 cursor-pointer transition-shadow hover:shadow-lg"
    >
      {/* Canvas preview */}
      <div className="p-3 pb-0">
        <CanvasPreview canvasData={map.canvasData} />
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Title row with menu */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold font-display text-gray-900 leading-tight line-clamp-2">
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
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </span>

        {/* Dates */}
        <div className="mt-3 text-xs text-gray-400 space-y-0.5">
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-game-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 font-display">
                Create New Map
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="map-title"
                  className="block text-sm font-medium text-gray-700 mb-1"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-shadow"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={!title.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold font-display rounded-game shadow-game hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Map
                </motion.button>
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
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-700 font-display mb-2">
        No maps yet
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        Maps contain the interactive canvas where you place content nodes for students to explore.
      </p>
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCreateMap}
        className="px-6 py-3 bg-primary-600 text-white font-semibold font-display rounded-game shadow-game hover:bg-primary-700 transition-colors"
      >
        Create Your First Map
      </motion.button>
    </motion.div>
  );
}

// ── Breadcrumb chevron icon ────────────────────────────────

function ChevronRight() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 font-display mb-2">
            Module Not Found
          </h2>
          <p className="text-gray-500 mb-6">
            The module you are looking for does not exist.
          </p>
          <Link
            to="/admin"
            className="text-primary-600 hover:text-primary-700 font-medium underline"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link
            to="/admin"
            className="hover:text-primary-600 transition-colors"
          >
            Courses
          </Link>
          <ChevronRight />
          <Link
            to={`/admin/course/${courseId}`}
            className="hover:text-primary-600 transition-colors"
          >
            {course.title}
          </Link>
          <ChevronRight />
          <span className="text-gray-900 font-medium">{module_.title}</span>
        </nav>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <h1 className="text-3xl font-bold font-display text-gray-900">
            {module_.title}
          </h1>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold font-display rounded-game shadow-game hover:bg-primary-700 transition-colors self-start sm:self-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Map
          </motion.button>
        </motion.div>

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
                      ? 'bg-primary-600 text-white shadow-game'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
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
            className="text-center py-16 text-gray-500"
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

      {/* Create map modal */}
      <CreateMapModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateMap}
      />
    </div>
  );
}

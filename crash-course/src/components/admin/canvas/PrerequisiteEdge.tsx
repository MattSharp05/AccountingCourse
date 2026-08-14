import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

// ── Prerequisite Edge (locks target until source is completed) ──

const PREREQ_COLOR = '#f59e0b'; // amber-500

export function PrerequisiteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Arrow character pointing from source toward target
  const dy = targetY - sourceY;
  const dx = targetX - sourceX;
  const arrow = Math.abs(dy) > Math.abs(dx)
    ? (dy > 0 ? '↓' : '↑')
    : (dx > 0 ? '→' : '←');

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: PREREQ_COLOR,
          strokeWidth: 2.5,
        }}
      />

      <EdgeLabelRenderer>
        <div
          className="group/edge pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {/* Prerequisite badge */}
          <div
            className="
              px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
              bg-amber-100 text-amber-700 border border-amber-300
              group-hover/edge:opacity-0 transition-opacity duration-150
              select-none whitespace-nowrap
            "
          >
            Pre-req {arrow}
          </div>

          {/* Delete button (shows on hover) */}
          <button
            type="button"
            className="
              absolute inset-0 w-full h-full
              flex items-center justify-center
              bg-white border border-gray-300 rounded
              text-gray-400 text-xs leading-none
              opacity-0 group-hover/edge:opacity-100
              hover:bg-red-50 hover:border-red-400 hover:text-red-500
              transition-all duration-150
              cursor-pointer shadow-sm
            "
            title="Remove connection"
            onClick={(e) => {
              e.stopPropagation();
              const event = new CustomEvent('prerequisite-edge-delete', {
                detail: { edgeId: id },
                bubbles: true,
              });
              (e.target as HTMLElement).dispatchEvent(event);
            }}
          >
            &times;
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// ── Path Edge (visual connection only, no locking) ──────────

const PATH_COLOR = '#9ca3af'; // gray-400

export function PathEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: PATH_COLOR,
          strokeWidth: 1.5,
          strokeDasharray: '6 4',
        }}
      />

      <EdgeLabelRenderer>
        <div
          className="group/edge pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {/* Path badge */}
          <div
            className="
              px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider
              bg-gray-100 text-gray-500 border border-gray-300
              group-hover/edge:opacity-0 transition-opacity duration-150
              select-none whitespace-nowrap
            "
          >
            Path
          </div>

          {/* Delete button (shows on hover) */}
          <button
            type="button"
            className="
              absolute inset-0 w-full h-full
              flex items-center justify-center
              bg-white border border-gray-300 rounded
              text-gray-400 text-xs leading-none
              opacity-0 group-hover/edge:opacity-100
              hover:bg-red-50 hover:border-red-400 hover:text-red-500
              transition-all duration-150
              cursor-pointer shadow-sm
            "
            title="Remove connection"
            onClick={(e) => {
              e.stopPropagation();
              const event = new CustomEvent('prerequisite-edge-delete', {
                detail: { edgeId: id },
                bubbles: true,
              });
              (e.target as HTMLElement).dispatchEvent(event);
            }}
          >
            &times;
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// ── Edge type mapping for React Flow ────────────────────────

export const edgeTypes = {
  prerequisite: PrerequisiteEdge,
  path: PathEdge,
};

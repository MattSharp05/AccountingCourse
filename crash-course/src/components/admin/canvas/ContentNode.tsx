import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ContentNodeData } from '../../../types/admin';

type ContentNodeType = Node<ContentNodeData, 'content'>;

// ── ContentNode (Checkpoint on canvas) ──────────────────────

export function ContentNode({ data, selected }: NodeProps<ContentNodeType>) {
  const accentColor = data.sectionColor || '#6366f1';

  return (
    <div
      className={`
        w-40 bg-white rounded-lg shadow-sm hover:shadow-md
        transition-shadow duration-150
        border-2
        ${data.isStart ? 'border-amber-400 ring-2 ring-amber-200' : selected ? 'border-indigo-400' : 'border-gray-200'}
      `}
    >
      {/* Colored top accent bar */}
      <div
        className="h-1.5 rounded-t-md"
        style={{ backgroundColor: data.isStart ? '#f59e0b' : accentColor }}
      />

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-1">
        {/* Start badge */}
        {data.isStart && (
          <span className="self-start text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-400 text-amber-900 leading-none">
            Start
          </span>
        )}

        {/* Title */}
        <div className="flex items-start">
          <span className="text-sm font-medium text-gray-900 truncate leading-tight">
            {data.title}
          </span>
        </div>

        {/* Checkpoint badge — flags cards saved by the old editor that have
            no linked checkpoint (they are skipped when the map is built) */}
        {data.checkpointId ? (
          <span
            className="self-start text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm text-white leading-none"
            style={{ backgroundColor: accentColor }}
          >
            Checkpoint
          </span>
        ) : (
          <span
            className="self-start text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-red-500 text-white leading-none"
            title="This card is from an older version and isn't linked to a checkpoint. Remove it and drag the checkpoint in again from the sidebar."
          >
            Not linked
          </span>
        )}

        {/* Chapter subtitle */}
        {data.chapterTitle && (
          <span className="text-[11px] text-gray-400 truncate leading-tight">
            {data.chapterTitle}
          </span>
        )}
      </div>

      {/* Handles — both are type="source" so either can start a connection.
           connectionMode="loose" on ReactFlow allows connecting to any handle. */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !border-2 !border-white !-top-1.5"
        style={{ backgroundColor: accentColor }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !border-2 !border-white !-bottom-1.5"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
}

// ── Node type mapping for React Flow ────────────────────────

export const nodeTypes = { content: ContentNode };

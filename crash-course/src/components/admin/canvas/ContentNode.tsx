import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ContentNodeData, ContentItemType } from '../../../types/admin';

type ContentNodeType = Node<ContentNodeData, 'content'>;

// ── Color + icon mappings per content type ──────────────────

const typeAccentColors: Record<ContentItemType, string> = {
  video: '#4F46E5',
  pdf: '#0891b2',
  text: '#059669',
  file: '#d97706',
  quiz: '#dc2626',
};

const typeIcons: Record<ContentItemType, string> = {
  video: '\u25B6',        // ▶
  pdf: '\uD83D\uDCC4',   // 📄
  text: '\uD83D\uDCDD',  // 📝
  file: '\uD83D\uDCCE',  // 📎
  quiz: '\u2694\uFE0F',  // ⚔️
};

const typeLabels: Record<ContentItemType, string> = {
  video: 'Video',
  pdf: 'PDF',
  text: 'Text',
  file: 'File',
  quiz: 'Quiz',
};

// ── ContentNode ─────────────────────────────────────────────

export function ContentNode({ data, selected }: NodeProps<ContentNodeType>) {
  const typeColor = typeAccentColors[data.type] ?? '#6b7280';
  const accentColor = data.sectionColor || typeColor;
  const icon = typeIcons[data.type] ?? '?';
  const label = typeLabels[data.type] ?? data.type;

  return (
    <div
      className={`
        w-40 bg-white rounded-lg shadow-sm hover:shadow-md
        transition-shadow duration-150
        border-2
        ${data.isStart ? 'border-amber-400 ring-2 ring-amber-200' : selected ? 'border-indigo-400' : 'border-gray-200'}
      `}
    >
      {/* Colored top accent bar — uses section color when available */}
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

        {/* Icon + title row */}
        <div className="flex items-start gap-1.5">
          <span className="text-base leading-none mt-0.5 shrink-0">{icon}</span>
          <span className="text-sm font-medium text-gray-900 truncate leading-tight">
            {data.title}
          </span>
        </div>

        {/* Type badge */}
        <span
          className="self-start text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm text-white leading-none"
          style={{ backgroundColor: accentColor }}
        >
          {label}
        </span>

        {/* Chapter subtitle */}
        {data.chapterTitle && (
          <span className="text-[11px] text-gray-400 truncate leading-tight">
            {data.chapterTitle}
          </span>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !border-2 !border-white !-top-1.5"
        style={{ backgroundColor: accentColor }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !border-2 !border-white !-bottom-1.5"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
}

// ── Node type mapping for React Flow ────────────────────────

export const nodeTypes = { content: ContentNode };

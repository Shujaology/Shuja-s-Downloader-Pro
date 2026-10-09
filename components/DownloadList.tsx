import React from 'react';
import { ArrowDown, ArrowUp, Download, MoreHorizontal, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import type { DownloadItem, SortKey, SortState } from '../types';
import { formatBytes, formatDate, formatDuration, formatSpeed, hostOf } from '../lib/format';
import { SAMPLE_LINKS } from '../lib/samples';
import { FileIcon, IconButton, Kbd, ProgressBar, StatusPill, cn, isActive, progressOf } from './ui';

interface DownloadListProps {
  items: DownloadItem[];
  selected: Set<string>;
  sort: SortState;
  onSort: (key: SortKey) => void;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (id: string) => void;
  onPrimaryAction: (item: DownloadItem) => void;
  onContextMenu: (e: React.MouseEvent, item: DownloadItem) => void;
  onNew: () => void;
  onAddSample: (url: string) => void;
  isEmptyLibrary: boolean;
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_110px_180px_96px_84px] items-center gap-4';

function HeaderCell({ label, sortKey, sort, onSort, align = 'left' }: { label: string; sortKey?: SortKey; sort: SortState; onSort: (k: SortKey) => void; align?: 'left' | 'right' }) {
  if (!sortKey) return <div className={cn(align === 'right' && 'text-right')}>{label}</div>;
  const active = sort.key === sortKey;
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn('flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100', align === 'right' && 'justify-end', active && 'text-zinc-900 dark:text-zinc-100')}
    >
      {label}
      {active && <Arrow className="size-3" />}
    </button>
  );
}

function secondaryLine(item: DownloadItem) {
  switch (item.status) {
    case 'downloading':
      return `${formatBytes(item.receivedBytes)} of ${formatBytes(item.totalBytes)} · ${item.segments.filter(s => s.active).length} connections`;
    case 'connecting':
      return 'Connecting to server…';
    case 'error':
      return item.error ?? 'Download failed';
    case 'completed':
      return item.fileAvailable === false ? 'File removed from browser storage' : `${hostOf(item.url)} · finished ${formatDate(item.completedAt)}`;
    case 'paused':
      return item.receivedBytes > 0 ? `Paused at ${formatBytes(item.receivedBytes)}${item.resumable ? '' : ' · will restart (server can’t resume)'}` : `${hostOf(item.url)} · ready to start`;
    default:
      return `${hostOf(item.url)} · waiting for a free slot`;
  }
}

function EmptyState({ isEmptyLibrary, onNew, onAddSample }: { isEmptyLibrary: boolean; onNew: () => void; onAddSample: (url: string) => void }) {
  if (!isEmptyLibrary) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-sm text-zinc-500">
        Nothing matches this view.
      </div>
    );
  }
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
          <Download className="size-7" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">Start your first download</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Paste a link anywhere, drop it on this window, or press <Kbd>N</Kbd>. Large files are split across parallel connections and can be paused and resumed — even after a reload.
        </p>
        <button
          type="button"
          onClick={onNew}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm shadow-blue-600/25 hover:bg-blue-500"
        >
          <Download className="size-4" /> New download
        </button>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-2 text-left dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 px-2 pt-1 pb-2 text-xs font-medium text-zinc-500">
            <Sparkles className="size-3.5" /> Try a sample file
          </div>
          {SAMPLE_LINKS.map(s => (
            <button
              key={s.url}
              type="button"
              onClick={() => onAddSample(s.url)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="truncate">{s.label}</span>
              <span className="tabular ml-3 shrink-0 text-xs text-zinc-400">{s.size}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const DownloadList: React.FC<DownloadListProps> = ({
  items,
  selected,
  sort,
  onSort,
  onSelect,
  onOpen,
  onPrimaryAction,
  onContextMenu,
  onNew,
  onAddSample,
  isEmptyLibrary,
}) => {
  if (items.length === 0) return <EmptyState isEmptyLibrary={isEmptyLibrary} onNew={onNew} onAddSample={onAddSample} />;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={cn(GRID, 'h-9 shrink-0 border-b border-zinc-200 px-5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:border-zinc-800/80')}>
        <HeaderCell label="Name" sortKey="filename" sort={sort} onSort={onSort} />
        <HeaderCell label="Size" sortKey="totalBytes" sort={sort} onSort={onSort} align="right" />
        <HeaderCell label="Progress" sortKey="progress" sort={sort} onSort={onSort} />
        <HeaderCell label="Speed" sortKey="speed" sort={sort} onSort={onSort} align="right" />
        <HeaderCell label="Added" sortKey="addedAt" sort={sort} onSort={onSort} align="right" />
      </div>
      <div className="flex-1 overflow-y-auto" role="listbox" aria-multiselectable>
        {items.map(item => {
          const isSelected = selected.has(item.id);
          const progress = progressOf(item);
          const canPause = isActive(item) || item.status === 'queued';
          const ActionIcon = canPause ? Pause : item.status === 'completed' ? Download : item.status === 'error' ? RotateCcw : Play;
          const actionLabel = canPause ? 'Pause' : item.status === 'completed' ? 'Save file' : item.status === 'error' ? 'Retry' : 'Resume';
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={isSelected}
              onMouseDown={e => e.button === 0 && onSelect(item.id, e)}
              onDoubleClick={() => onOpen(item.id)}
              onContextMenu={e => onContextMenu(e, item)}
              className={cn(
                GRID,
                'group relative cursor-default border-b border-zinc-100 px-5 py-2.5 transition-colors dark:border-zinc-900',
                isSelected ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70',
              )}
            >
              {isSelected && <span className="absolute inset-y-0 left-0 w-0.5 bg-blue-600" />}
              <div className="relative flex min-w-0 items-center gap-3">
                <FileIcon category={item.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium" title={item.filename}>
                      {item.filename}
                    </span>
                    {item.status !== 'downloading' && item.status !== 'completed' && <StatusPill status={item.status} />}
                  </div>
                  <div className={cn('mt-0.5 truncate text-xs', item.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400')}>
                    {secondaryLine(item)}
                  </div>
                </div>
                <div className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-0.5 rounded-lg bg-white/95 p-0.5 opacity-0 shadow-xs ring-1 ring-zinc-200 transition-opacity group-hover:opacity-100 dark:bg-zinc-900/95 dark:ring-zinc-700">
                  <IconButton
                    icon={ActionIcon}
                    label={actionLabel}
                    size="sm"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => onPrimaryAction(item)}
                    disabled={item.status === 'completed' && item.fileAvailable === false}
                  />
                  <IconButton
                    icon={MoreHorizontal}
                    label="More actions"
                    size="sm"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => onContextMenu(e, item)}
                  />
                </div>
              </div>
              <div className="tabular text-right text-xs text-zinc-600 dark:text-zinc-300">{formatBytes(item.totalBytes)}</div>
              <div className="flex items-center gap-2.5">
                <ProgressBar item={item} />
                <span className="tabular w-10 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {progress == null ? '—' : `${Math.floor(progress)}%`}
                </span>
              </div>
              <div className="tabular text-right text-xs">
                {isActive(item) ? (
                  <>
                    <div className="font-medium text-zinc-800 dark:text-zinc-100">{formatSpeed(item.speed)}</div>
                    <div className="text-zinc-500">{formatDuration(item.eta)} left</div>
                  </>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </div>
              <div className="tabular text-right text-xs text-zinc-500">{formatDate(item.addedAt)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

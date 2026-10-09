import React from 'react';
import { ArrowDown, ArrowUp, Download, FolderOpen, MoreHorizontal, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import type { DownloadItem, SortKey, SortState } from '../types';
import { formatBytes, formatDuration, formatSpeed, hostOf } from '../lib/format';
import { SAMPLE_LINKS } from '../lib/samples';
import { CATEGORY_META, IconButton, Kbd, ProgressBar, StatusPill, cn, isActive, progressOf } from './ui';

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

const GRID = 'grid grid-cols-[minmax(0,2fr)_80px_minmax(130px,1fr)_88px_72px_76px] items-center gap-4';

function HeaderCell({ label, sortKey, sort, onSort, align = 'left' }: { label: string; sortKey?: SortKey; sort: SortState; onSort: (k: SortKey) => void; align?: 'left' | 'right' | 'center' }) {
  const alignCls = align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : '';
  if (!sortKey) return <div className={cn('flex', alignCls)}>{label}</div>;
  const active = sort.key === sortKey;
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn('flex items-center gap-1 tracking-wider uppercase transition-colors hover:text-zinc-900 dark:hover:text-zinc-100', alignCls, active && 'text-zinc-900 dark:text-zinc-100')}
    >
      {label}
      {active && <Arrow className="size-3" />}
    </button>
  );
}

function secondaryLine(item: DownloadItem) {
  if (item.status === 'error') return item.error ?? 'Download failed';
  if (item.status === 'completed' && item.fileAvailable === false) return 'File removed from browser storage';
  const threads = item.status === 'downloading' ? item.segments.filter(s => s.active).length || item.connections : item.connections;
  const parts = [CATEGORY_META[item.category].label, `${threads} Thread${threads === 1 ? '' : 's'}`];
  if (item.status === 'paused' && item.receivedBytes > 0 && !item.resumable) parts.push('will restart (no resume support)');
  return parts.join(' • ');
}

function etaText(item: DownloadItem) {
  if (item.status === 'completed') return 'Finished';
  if (isActive(item) && item.eta != null) return formatDuration(item.eta);
  return '--';
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
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-white shadow-lg shadow-indigo-600/25">
          <Download className="size-7" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">Start your first download</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Paste a link anywhere, drop it on this window, or press <Kbd>N</Kbd>. Large files are split across parallel connections and can be paused and resumed — even after a reload.
        </p>
        <button
          type="button"
          onClick={onNew}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-400 hover:to-violet-500"
        >
          <Download className="size-4" /> Add New URL
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
      <div className={cn(GRID, 'h-10 shrink-0 px-8 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase')}>
        <HeaderCell label="File Name" sortKey="filename" sort={sort} onSort={onSort} />
        <HeaderCell label="Size" sortKey="totalBytes" sort={sort} onSort={onSort} />
        <HeaderCell label="Progress / Status" sortKey="progress" sort={sort} onSort={onSort} />
        <HeaderCell label="Speed" sortKey="speed" sort={sort} onSort={onSort} />
        <HeaderCell label="ETA" sort={sort} onSort={onSort} />
        <HeaderCell label="Actions" sort={sort} onSort={onSort} align="center" />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4" role="listbox" aria-multiselectable>
        {items.map(item => {
          const isSelected = selected.has(item.id);
          const progress = progressOf(item);
          const canPause = isActive(item) || item.status === 'queued';
          const ActionIcon = canPause ? Pause : item.status === 'completed' ? FolderOpen : item.status === 'error' ? RotateCcw : Play;
          const actionLabel = canPause ? 'Pause' : item.status === 'completed' ? 'Save file' : item.status === 'error' ? 'Retry' : 'Resume';
          const { icon: CatIcon } = CATEGORY_META[item.category];
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
                'group cursor-default rounded-xl border px-4 py-3 transition-colors',
                isSelected
                  ? 'border-indigo-500/60 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-500/10'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
                  <CatIcon className="size-[18px]" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className={cn('mt-0.5 truncate text-xs', item.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400')} title={item.status === 'error' ? item.error : hostOf(item.url)}>
                    {secondaryLine(item)}
                  </div>
                </div>
              </div>
              <div className="tabular text-xs font-medium text-zinc-700 dark:text-zinc-200">{formatBytes(item.totalBytes)}</div>
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <StatusPill status={item.status} />
                  <span className="tabular text-xs font-semibold text-zinc-700 dark:text-zinc-200">{progress == null ? '—' : `${Math.floor(progress)}%`}</span>
                </div>
                <ProgressBar item={item} />
              </div>
              <div className={cn('tabular text-xs font-semibold', isActive(item) ? 'text-cyan-600 dark:text-cyan-400' : 'font-normal text-zinc-500')}>
                {isActive(item) ? formatSpeed(item.speed) : '0 KB/s'}
              </div>
              <div className="tabular text-xs text-zinc-600 dark:text-zinc-300">{etaText(item)}</div>
              <div className="flex items-center justify-center gap-1">
                <IconButton
                  icon={ActionIcon}
                  label={actionLabel}
                  size="sm"
                  className="border border-zinc-200 dark:border-zinc-700"
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
          );
        })}
      </div>
    </div>
  );
};

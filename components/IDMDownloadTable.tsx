import React from 'react';
import type { DownloadItem } from '../types';

interface TableProps {
  downloads: DownloadItem[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  searchTerm: string;
  selectedCategory: string;
  selectedFilter: string;
  selectedQueue: string;
  onStartItem: (item: DownloadItem) => void;
  onPauseItem: (item: DownloadItem) => void;
  onDeleteItem: (id: string) => void;
  onOpenItem?: (item: DownloadItem) => void;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

export const IDMDownloadTable: React.FC<TableProps> = ({
  downloads,
  selectedId,
  onSelectId,
  searchTerm,
  selectedCategory,
  selectedFilter,
  selectedQueue,
  onStartItem,
  onPauseItem,
  onDeleteItem,
  onOpenItem,
}) => {
  const filtered = downloads.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || d.category === selectedCategory;
    const matchesQueue = selectedQueue === 'all' || (d.queue || 'main') === selectedQueue;

    let matchesFilter = true;
    if (selectedFilter === 'downloading') matchesFilter = d.status === 'downloading';
    else if (selectedFilter === 'finished') matchesFilter = d.status === 'completed';
    else if (selectedFilter === 'unfinished') matchesFilter = d.status !== 'completed';
    else if (selectedFilter === 'paused') matchesFilter = d.status === 'paused';

    return matchesSearch && matchesCat && matchesQueue && matchesFilter;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs gap-1 select-none">
        <span className="text-xl">📥</span>
        <span>No downloads match the current category or filter</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto select-none">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-950/50 text-slate-400 border-b border-white/5 font-semibold">
            <th className="p-3">File Name</th>
            <th className="p-3">Size</th>
            <th className="p-3">Status</th>
            <th className="p-3">Progress</th>
            <th className="p-3">Speed</th>
            <th className="p-3">Time Left</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(d => {
            const isSelected = selectedId === d.id;
            return (
              <tr
                key={d.id}
                onClick={() => onSelectId(d.id)}
                onDoubleClick={() => onOpenItem?.(d)}
                className={`border-b border-white/[0.02] cursor-pointer transition-all ${
                  isSelected ? 'bg-sky-500/10 text-white' : 'hover:bg-white/[0.02] text-slate-400'
                }`}
              >
                <td className="p-3 font-medium max-w-xs truncate" title={d.title}>
                  {d.title}
                </td>
                <td className="p-3 font-mono">{formatBytes(d.totalBytes)}</td>
                <td className="p-3 uppercase text-[10px] font-bold">
                  <span
                    className={
                      d.status === 'downloading'
                        ? 'text-sky-400'
                        : d.status === 'completed'
                        ? 'text-emerald-400'
                        : d.status === 'paused'
                        ? 'text-amber-400'
                        : d.status === 'error'
                        ? 'text-rose-400'
                        : 'text-slate-500'
                    }
                  >
                    {d.status}
                  </span>
                </td>
                <td className="p-3 w-40">
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        d.status === 'completed'
                          ? 'bg-emerald-400'
                          : d.status === 'error'
                          ? 'bg-rose-400'
                          : 'bg-gradient-to-r from-sky-500 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, d.progress))}%` }}
                    />
                  </div>
                </td>
                <td className="p-3 font-mono">{d.speed || '0 KB/s'}</td>
                <td className="p-3 font-mono">{d.timeLeft || '--:--'}</td>
                <td className="p-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                  {d.status === 'downloading' ? (
                    <button
                      onClick={() => onPauseItem(d)}
                      className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[10px]"
                    >
                      Pause
                    </button>
                  ) : d.status !== 'completed' ? (
                    <button
                      onClick={() => onStartItem(d)}
                      className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-[10px]"
                    >
                      Resume
                    </button>
                  ) : null}
                  <button
                    onClick={() => onDeleteItem(d.id)}
                    className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[10px]"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


import React from 'react';
import type { DownloadItem } from '../types';
import { cn } from './ui';

/** Visualises each connection's byte range and how much of it has arrived. */
export const SegmentMap: React.FC<{ item: DownloadItem }> = ({ item }) => {
  const total = item.totalBytes;
  if (!total || item.segments.length === 0 || item.segments[0].end < 0) {
    return <div className="h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
  }
  const done = item.status === 'completed';
  return (
    <div className="relative flex h-7 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 ring-inset dark:bg-zinc-800/80 dark:ring-zinc-700/60">
      {item.segments.map(seg => {
        const size = seg.end - seg.start + 1;
        const fill = done ? 100 : Math.min(100, (seg.received / size) * 100);
        return (
          <div
            key={seg.id}
            className="relative h-full border-r border-white last:border-r-0 dark:border-zinc-950"
            style={{ width: `${(size / total) * 100}%` }}
            title={`Connection ${seg.id + 1}: ${fill.toFixed(0)}%`}
          >
            <div
              className={cn(
                'h-full transition-[width] duration-500 ease-out',
                done || fill >= 100 ? 'bg-emerald-500/80' : seg.active ? 'progress-active bg-blue-600' : 'bg-amber-500/70',
              )}
              style={{ width: `${fill}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

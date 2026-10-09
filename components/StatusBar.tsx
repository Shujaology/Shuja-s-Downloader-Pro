import React, { useEffect, useState } from 'react';
import { ArrowDown, CalendarClock, Database, Gauge } from 'lucide-react';
import type { DownloadItem, Settings } from '../types';
import { formatBytes, formatSpeed } from '../lib/format';
import { isActive } from './ui';

export const StatusBar: React.FC<{ items: DownloadItem[]; settings: Settings }> = ({ items, settings }) => {
  const [usage, setUsage] = useState<number | null>(null);
  const active = items.filter(isActive);
  const speed = active.reduce((n, i) => n + i.speed, 0);
  const queued = items.filter(i => i.status === 'queued').length;
  const completed = items.filter(i => i.status === 'completed').length;

  useEffect(() => {
    const read = () => navigator.storage?.estimate?.().then(e => setUsage(e.usage ?? null)).catch(() => {});
    read();
    const t = window.setInterval(read, 5000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <footer className="tabular flex h-8 shrink-0 items-center gap-5 border-t border-zinc-200 bg-white px-4 text-[11px] text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-400">
      <span className="flex items-center gap-1.5">
        <ArrowDown className="size-3.5 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-zinc-700 dark:text-zinc-200">{speed > 0 ? formatSpeed(speed) : '0 B/s'}</span>
      </span>
      <span>
        {active.length} active · {queued} queued · {completed} completed
      </span>
      {settings.scheduleEnabled && (
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5" /> Scheduled {settings.scheduleStart}
          {settings.scheduleStop && `–${settings.scheduleStop}`}
        </span>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        <Gauge className="size-3.5" />
        {settings.speedLimitEnabled ? `Limited to ${formatSpeed(settings.speedLimitKBps * 1024)}` : 'No bandwidth limit'}
      </span>
      {usage != null && (
        <span className="flex items-center gap-1.5">
          <Database className="size-3.5" /> {formatBytes(usage)} stored
        </span>
      )}
      <span className="text-zinc-400 dark:text-zinc-600">v2.0</span>
    </footer>
  );
};

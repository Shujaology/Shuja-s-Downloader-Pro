import React, { useEffect, useState } from 'react';
import type { DownloadItem, Settings } from '../types';
import { formatBytes } from '../lib/format';
import { cn, isActive } from './ui';

export const StatusBar: React.FC<{ items: DownloadItem[]; settings: Settings }> = ({ items, settings }) => {
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const active = items.filter(isActive).length;
  const queued = items.filter(i => i.status === 'queued').length;

  useEffect(() => {
    const read = () =>
      navigator.storage
        ?.estimate?.()
        .then(e => setStorage({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
        .catch(() => {});
    read();
    const t = window.setInterval(read, 5000);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const sep = <span className="text-zinc-300 dark:text-zinc-700">|</span>;
  const scheduler = settings.scheduleEnabled ? `Active (${settings.scheduleStart}${settings.scheduleStop ? `–${settings.scheduleStop}` : ''})` : 'Idle';

  return (
    <footer className="tabular flex h-8 shrink-0 items-center gap-3 border-t border-zinc-200 bg-white px-4 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <span className="flex items-center gap-1.5">
        <span className={cn('size-2 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
        Network: {online ? 'Connected' : 'Offline'}
      </span>
      {storage && storage.quota > 0 && (
        <>
          {sep}
          <span>Disk Space Available: {formatBytes(Math.max(0, storage.quota - storage.usage))}</span>
        </>
      )}
      {sep}
      <span>
        {active} active · {queued} queued
      </span>
      <span className="ml-auto">Smart Scheduler: {scheduler}</span>
      {sep}
      <span className="font-medium text-indigo-600 dark:text-indigo-400">Shuja Turbo Core v2.0</span>
    </footer>
  );
};

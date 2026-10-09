import React from 'react';
import { Activity, ArrowDownRight, HardDrive, type LucideIcon } from 'lucide-react';
import { formatBytes } from '../lib/format';
import { cn } from './ui';

function splitUnit(text: string): [string, string] {
  const i = text.indexOf(' ');
  return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)];
}

function StatCard({ label, value, unit, icon: Icon, tone, children }: { label: string; value: string; unit: string; icon: LucideIcon; tone: string; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className={cn('tabular text-2xl font-bold tracking-tight', tone.split(' ').filter(c => c.includes('text-')).join(' '))}>{value}</span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{unit}</span>
          </div>
        </div>
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border', tone)}>
          <Icon className="size-5" strokeWidth={2} />
        </div>
      </div>
      {children}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const w = 200;
  const h = 24;
  const step = w / (values.length - 1);
  const line = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 w-full opacity-60" aria-hidden>
      <defs>
        <linearGradient id="stat-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(34 211 238)" stopOpacity="0.35" />
          <stop offset="1" stopColor="rgb(34 211 238)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="url(#stat-spark)" />
      <polyline points={line} fill="none" stroke="rgb(34 211 238)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const StatCards: React.FC<{ speed: number; threads: number; transferredToday: number; speedHistory: number[] }> = ({ speed, threads, transferredToday, speedHistory }) => {
  const [speedValue, speedUnit] = splitUnit(formatBytes(speed));
  const [dataValue, dataUnit] = splitUnit(formatBytes(transferredToday));
  return (
    <div className="grid shrink-0 grid-cols-3 gap-3 p-4 pb-3">
      <StatCard label="Download Speed" value={speedValue} unit={`${speedUnit}/s`} icon={ArrowDownRight} tone="border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
        <Sparkline values={speedHistory} />
      </StatCard>
      <StatCard label="Active Threads" value={String(threads)} unit={threads === 1 ? 'Stream' : 'Streams'} icon={Activity} tone="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
      <StatCard label="Data Transferred Today" value={dataValue} unit={dataUnit} icon={HardDrive} tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
    </div>
  );
};

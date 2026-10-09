import React from 'react';
import { AlertTriangle, ArrowDownToLine, CheckCircle2, Inbox, Layers, Plus, Settings2, type LucideIcon } from 'lucide-react';
import type { Category, DownloadItem, LibraryView } from '../types';
import { formatSpeed } from '../lib/format';
import { CATEGORY_META, Kbd, cn, isActive } from './ui';

interface SidebarProps {
  items: DownloadItem[];
  view: LibraryView;
  category: Category | null;
  onView: (view: LibraryView) => void;
  onCategory: (category: Category | null) => void;
  onNew: () => void;
  onOpenSettings: () => void;
  speedHistory: number[];
}

export const VIEW_FILTERS: Record<LibraryView, (i: DownloadItem) => boolean> = {
  all: () => true,
  downloading: isActive,
  unfinished: i => i.status === 'paused' || i.status === 'queued',
  completed: i => i.status === 'completed',
  failed: i => i.status === 'error',
};

const VIEWS: { id: LibraryView; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All downloads', icon: Inbox },
  { id: 'downloading', label: 'Downloading', icon: ArrowDownToLine },
  { id: 'unfinished', label: 'Paused & queued', icon: Layers },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'failed', label: 'Failed', icon: AlertTriangle },
];

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  iconClass,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  iconClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700'
          : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100',
      )}
    >
      <Icon className={cn('size-4 shrink-0', iconClass ?? (active ? 'text-blue-600 dark:text-blue-400' : ''))} strokeWidth={2} />
      <span className="flex-1 truncate text-left">{label}</span>
      {count > 0 && <span className="tabular text-xs text-zinc-400 dark:text-zinc-500">{count}</span>}
    </button>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 200;
  const h = 36;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`);
  const line = points.join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(37 99 235)" stopOpacity="0.35" />
          <stop offset="1" stopColor="rgb(37 99 235)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {values.length > 1 && (
        <>
          <polygon points={`0,${h} ${line} ${w},${h}`} fill="url(#spark)" />
          <polyline points={line} fill="none" stroke="rgb(37 99 235)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ items, view, category, onView, onCategory, onNew, onOpenSettings, speedHistory }) => {
  const categories = (Object.keys(CATEGORY_META) as Category[]).map(c => ({ id: c, count: items.filter(i => i.category === c).length }));
  const currentSpeed = speedHistory[speedHistory.length - 1] ?? 0;
  const peak = Math.max(0, ...speedHistory);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100/70 dark:border-zinc-800/80 dark:bg-zinc-900/40">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <img src="/icon.svg" alt="" className="size-8 rounded-lg shadow-sm" />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Downloader Pro</div>
          <div className="text-[11px] text-zinc-500">by Shuja</div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNew}
          className="flex h-9 w-full items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500 active:bg-blue-700"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          <span className="flex-1 text-left">New download</span>
          <kbd className="rounded bg-white/20 px-1.5 text-[10px] font-medium">N</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        <div className="space-y-0.5">
          {VIEWS.map(v => (
            <NavItem
              key={v.id}
              icon={v.icon}
              label={v.label}
              count={items.filter(VIEW_FILTERS[v.id]).length}
              active={view === v.id && !category}
              onClick={() => {
                onView(v.id);
                onCategory(null);
              }}
            />
          ))}
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            Categories
          </div>
          <div className="space-y-0.5">
            {categories.map(({ id, count }) => {
              const meta = CATEGORY_META[id];
              return (
                <NavItem
                  key={id}
                  icon={meta.icon}
                  label={meta.label}
                  count={count}
                  active={category === id}
                  iconClass={meta.tint.split(' ').filter(c => c.startsWith('text-') || c.startsWith('dark:text-')).join(' ')}
                  onClick={() => {
                    onCategory(category === id ? null : id);
                    onView('all');
                  }}
                />
              );
            })}
          </div>
        </div>
      </nav>

      <div className="space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800/80">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Throughput</span>
            <span className="tabular text-[11px] text-zinc-400">peak {formatSpeed(peak)}</span>
          </div>
          <div className="tabular mt-0.5 text-lg font-semibold tracking-tight">{currentSpeed > 0 ? formatSpeed(currentSpeed) : 'Idle'}</div>
          <Sparkline values={speedHistory} />
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
        >
          <Settings2 className="size-4" />
          <span className="flex-1 text-left">Settings</span>
          <Kbd>,</Kbd>
        </button>
      </div>
    </aside>
  );
};

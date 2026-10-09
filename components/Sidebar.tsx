import React from 'react';
import { AlertTriangle, ArrowDownCircle, CheckCircle2, Cpu, Layers, PauseCircle, type LucideIcon } from 'lucide-react';
import type { Category, DownloadItem, LibraryView, Settings } from '../types';
import { CATEGORY_META, cn, isActive } from './ui';

interface SidebarProps {
  items: DownloadItem[];
  view: LibraryView;
  category: Category | null;
  settings: Settings;
  onView: (view: LibraryView) => void;
  onCategory: (category: Category | null) => void;
}

export const VIEW_FILTERS: Record<LibraryView, (i: DownloadItem) => boolean> = {
  all: () => true,
  downloading: isActive,
  unfinished: i => i.status === 'paused' || i.status === 'queued',
  completed: i => i.status === 'completed',
  failed: i => i.status === 'error',
};

const VIEWS: { id: LibraryView; label: string; icon: LucideIcon; tint: string }[] = [
  { id: 'all', label: 'All Downloads', icon: Layers, tint: '' },
  { id: 'downloading', label: 'Downloading', icon: ArrowDownCircle, tint: 'text-cyan-500 dark:text-cyan-400' },
  { id: 'completed', label: 'Completed', icon: CheckCircle2, tint: 'text-emerald-500 dark:text-emerald-400' },
  { id: 'unfinished', label: 'Paused', icon: PauseCircle, tint: 'text-orange-500 dark:text-orange-400' },
  { id: 'failed', label: 'Failed', icon: AlertTriangle, tint: 'text-red-500 dark:text-red-400' },
];

const CATEGORY_ORDER: Category[] = ['video', 'documents', 'music', 'programs', 'compressed', 'images', 'other'];

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
        'flex h-9 w-full items-center gap-2.5 rounded-lg border px-2.5 text-[13px] transition-colors',
        active
          ? 'border-zinc-300 bg-white font-semibold text-zinc-900 shadow-xs dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-white'
          : 'border-transparent text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100',
      )}
    >
      <Icon className={cn('size-4 shrink-0', iconClass)} strokeWidth={2} />
      <span className="flex-1 truncate text-left">{label}</span>
      <span
        className={cn(
          'tabular min-w-6 rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium',
          active ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'bg-zinc-200/70 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 px-2.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">{children}</div>;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, view, category, settings, onView, onCategory }) => {
  const running = items.some(isActive);
  const failedCount = items.filter(VIEW_FILTERS.failed).length;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-950/60">
      <nav className="flex-1 space-y-6 overflow-y-auto p-3 pt-4">
        <div>
          <SectionLabel>Status</SectionLabel>
          <div className="space-y-1">
            {VIEWS.filter(v => v.id !== 'failed' || failedCount > 0).map(v => (
              <NavItem
                key={v.id}
                icon={v.icon}
                label={v.label}
                iconClass={v.tint}
                count={items.filter(VIEW_FILTERS[v.id]).length}
                active={view === v.id && !category}
                onClick={() => {
                  onView(v.id);
                  onCategory(null);
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Categories</SectionLabel>
          <div className="space-y-1">
            {CATEGORY_ORDER.map(id => {
              const count = items.filter(i => i.category === id).length;
              if (count === 0 && (id === 'images' || id === 'other')) return null;
              return (
                <NavItem
                  key={id}
                  icon={CATEGORY_META[id].icon}
                  label={CATEGORY_META[id].label}
                  count={count}
                  active={category === id}
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

      <div className="p-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
              <Cpu className="size-3.5 text-zinc-400" /> Engine Status
            </span>
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold', running ? 'text-cyan-600 dark:text-cyan-400' : 'text-emerald-600 dark:text-emerald-400')}>
              <span className={cn('size-2 rounded-full bg-current', running && 'animate-pulse')} />
              {running ? 'Running' : 'Ready'}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] leading-snug text-zinc-500">
            Multithreaded Turbo ({settings.connections} thread limit)
            <br />
            {settings.maxConcurrent} simultaneous file{settings.maxConcurrent === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </aside>
  );
};

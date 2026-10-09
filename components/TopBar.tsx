import React from 'react';
import { CheckCheck, CloudDownload, Gauge, Moon, Pause, Play, PlusCircle, Search, Settings as SettingsIcon, Sun } from 'lucide-react';
import type { Settings } from '../types';
import { formatSpeed } from '../lib/format';
import { IconButton, Kbd, cn } from './ui';

interface TopBarProps {
  search: string;
  onSearch: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  dark: boolean;
  canStartAll: boolean;
  canPauseAll: boolean;
  canClearFinished: boolean;
  onStartAll: () => void;
  onPauseAll: () => void;
  onClearFinished: () => void;
  onNew: () => void;
  onOpenSettings: () => void;
}

const toolClass =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-45 dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800';

export const TopBar: React.FC<TopBarProps> = ({
  search,
  onSearch,
  searchRef,
  settings,
  onUpdateSettings,
  dark,
  canStartAll,
  canPauseAll,
  canClearFinished,
  onStartAll,
  onPauseAll,
  onClearFinished,
  onNew,
  onOpenSettings,
}) => (
  <header className="shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex h-14 items-center gap-3 border-b border-zinc-100 px-4 dark:border-zinc-800/70">
      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 text-white shadow-md shadow-indigo-600/30">
        <CloudDownload className="size-[18px]" strokeWidth={2.2} />
      </div>
      <h1 className="text-[15px] font-semibold tracking-tight whitespace-nowrap">Shuja Download Manager</h1>
      <span className="rounded-md border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">Pro v2.0</span>
      <div className="ml-auto flex items-center gap-1">
        <IconButton icon={dark ? Sun : Moon} label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => onUpdateSettings({ theme: dark ? 'light' : 'dark' })} />
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
      <button
        type="button"
        onClick={onNew}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-[13px] font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:from-indigo-400 hover:to-violet-500"
      >
        <PlusCircle className="size-4" /> Add New URL
      </button>
      <div className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
      <button type="button" className={toolClass} disabled={!canStartAll} onClick={onStartAll}>
        <Play className="size-3.5 text-emerald-500" /> Start All
      </button>
      <button type="button" className={toolClass} disabled={!canPauseAll} onClick={onPauseAll}>
        <Pause className="size-3.5 text-orange-500" /> Pause All
      </button>
      <button type="button" className={toolClass} disabled={!canClearFinished} onClick={onClearFinished}>
        <CheckCheck className="size-3.5 text-cyan-500" /> Clear Finished
      </button>
      <button
        type="button"
        onClick={() => onUpdateSettings({ speedLimitEnabled: !settings.speedLimitEnabled })}
        title="Toggle bandwidth limiter"
        className={cn(toolClass, settings.speedLimitEnabled && 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300')}
      >
        <Gauge className={cn('size-3.5', settings.speedLimitEnabled ? 'text-amber-500' : 'text-rose-500')} />
        <span className="tabular">Limiter: {settings.speedLimitEnabled ? formatSpeed(settings.speedLimitKBps * 1024) : 'OFF'}</span>
      </button>
    </div>

    <div className="flex items-center gap-2 px-4 py-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          ref={searchRef}
          value={search}
          onChange={e => onSearch(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && (onSearch(''), e.currentTarget.blur())}
          placeholder="Search downloads..."
          className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pr-16 pl-9 text-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700/80 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
        />
        <div className="pointer-events-none absolute top-1/2 right-2.5 flex -translate-y-1/2 gap-1">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </div>
      </div>
      <button type="button" title="Settings" aria-label="Settings" onClick={onOpenSettings} className={cn(toolClass, 'w-9 justify-center px-0')}>
        <SettingsIcon className="size-4" />
      </button>
    </div>
  </header>
);

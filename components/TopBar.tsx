import React from 'react';
import { Gauge, Moon, Pause, Play, Search, Sun } from 'lucide-react';
import type { Settings } from '../types';
import { Button, IconButton, Kbd, cn } from './ui';

interface TopBarProps {
  title: string;
  search: string;
  onSearch: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  dark: boolean;
  canStartAll: boolean;
  canPauseAll: boolean;
  onStartAll: () => void;
  onPauseAll: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  search,
  onSearch,
  searchRef,
  settings,
  onUpdateSettings,
  dark,
  canStartAll,
  canPauseAll,
  onStartAll,
  onPauseAll,
}) => {
  const limit = settings.speedLimitKBps >= 1024 ? `${(settings.speedLimitKBps / 1024).toFixed(1).replace(/\.0$/, '')} MB/s` : `${settings.speedLimitKBps} KB/s`;
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <h1 className="mr-2 text-[15px] font-semibold tracking-tight whitespace-nowrap">{title}</h1>

      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          ref={searchRef}
          value={search}
          onChange={e => onSearch(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && (onSearch(''), e.currentTarget.blur())}
          placeholder="Search by name or link…"
          className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pr-16 pl-9 text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:bg-zinc-950"
        />
        <div className="pointer-events-none absolute top-1/2 right-2.5 flex -translate-y-1/2 gap-1">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" variant="ghost" icon={Play} disabled={!canStartAll} onClick={onStartAll}>
          Resume all
        </Button>
        <Button size="sm" variant="ghost" icon={Pause} disabled={!canPauseAll} onClick={onPauseAll}>
          Pause all
        </Button>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
        <button
          type="button"
          onClick={() => onUpdateSettings({ speedLimitEnabled: !settings.speedLimitEnabled })}
          title="Toggle bandwidth limit"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition',
            settings.speedLimitEnabled
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800',
          )}
        >
          <Gauge className="size-3.5" />
          <span className="tabular">{settings.speedLimitEnabled ? limit : 'Unlimited'}</span>
        </button>
        <IconButton
          icon={dark ? Sun : Moon}
          label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => onUpdateSettings({ theme: dark ? 'light' : 'dark' })}
        />
      </div>
    </header>
  );
};

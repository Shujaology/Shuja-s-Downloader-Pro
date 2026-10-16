import React from 'react';
import { Plus, Play, Pause, CheckCircle2, Gauge, Search, Settings } from 'lucide-react';
import type { IDMSettings } from '../types';

interface IDMToolbarProps {
  settings: IDMSettings;
  onUpdateSettings: (newSettings: Partial<IDMSettings>) => void;
  onAddUrl: () => void;
  onResumeSelected: () => void;
  onStopSelected: () => void;
  onStopAll: () => void;
  onDeleteSelected: () => void;
  onDeleteCompleted: () => void;
  onOptions: () => void;
  onScheduler: () => void;
  onStartQueue: () => void;
  onStopQueue: () => void;
  onGrabber: () => void;
  canResume: boolean;
  canStop: boolean;
  canDelete: boolean;
  hasActiveDownloads: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export const IDMToolbar: React.FC<IDMToolbarProps> = ({
  settings,
  onUpdateSettings,
  onAddUrl,
  onStopAll,
  onDeleteCompleted,
  onOptions,
  onStartQueue,
  searchTerm,
  onSearchTermChange,
}) => {
  return (
    <div className="px-5 pt-2 pb-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onAddUrl}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-violet-600 text-white text-[12px] font-semibold hover:bg-violet-500"
        >
          <Plus className="w-3.5 h-3.5" />
          Add URL
        </button>
        <button
          onClick={onStartQueue}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-emerald-300 hover:bg-emerald-500/10"
        >
          <Play className="w-3.5 h-3.5" />
          Start All
        </button>
        <button
          onClick={onStopAll}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-amber-300 hover:bg-amber-500/10"
        >
          <Pause className="w-3.5 h-3.5" />
          Pause All
        </button>
        <button
          onClick={onDeleteCompleted}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-sky-300 hover:bg-sky-500/10"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Clear Finished
        </button>
        <button
          onClick={() => onUpdateSettings({ speedLimiterEnabled: !settings.speedLimiterEnabled })}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-rose-300 hover:bg-rose-500/10"
        >
          <Gauge className="w-3.5 h-3.5" />
          Limiter: {settings.speedLimiterEnabled ? `${settings.speedLimitKbps} KB/s` : 'OFF'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => onSearchTermChange(e.target.value)}
            placeholder="Search downloads..."
            className="h-9 w-64 pl-9 pr-3 rounded-full bg-[#0a101c] border border-white/10 text-[12px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-sky-500/40"
          />
        </div>
        <button
          onClick={onOptions}
          className="w-9 h-9 rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 grid place-items-center"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import {
  PlusCircle,
  Play,
  Square,
  Octagon,
  Trash2,
  CheckCircle2,
  Settings,
  Clock,
  PlayCircle,
  PauseCircle,
  Globe,
  Gauge
} from 'lucide-react';
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
}

export const IDMToolbar: React.FC<IDMToolbarProps> = ({
  settings,
  onUpdateSettings,
  onAddUrl,
  onResumeSelected,
  onStopSelected,
  onStopAll,
  onDeleteSelected,
  onDeleteCompleted,
  onOptions,
  onScheduler,
  onStartQueue,
  onStopQueue,
  onGrabber,
  canResume,
  canStop,
  canDelete,
  hasActiveDownloads,
}) => {
  const isDark = settings.theme === 'windows-dark';

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 border-b overflow-x-auto select-none ${
        isDark
          ? 'bg-gradient-to-b from-[#2d2d30] to-[#252526] border-[#3c3c3c]'
          : 'bg-gradient-to-b from-[#fbfbfb] via-[#eaeaea] to-[#d6d6d6] border-[#bcbcbc]'
      }`}
    >
      {/* Add URL */}
      <button
        onClick={onAddUrl}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition group ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Add new download URL (Ctrl+N)"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-sm">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Add URL
        </span>
      </button>

      {/* Resume */}
      <button
        onClick={onResumeSelected}
        disabled={!canResume}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition disabled:opacity-35 disabled:cursor-not-allowed ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Resume selected download"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-sm">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Resume
        </span>
      </button>

      {/* Stop */}
      <button
        onClick={onStopSelected}
        disabled={!canStop}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition disabled:opacity-35 disabled:cursor-not-allowed ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Stop/Pause selected download"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-red-500 flex items-center justify-center shadow-sm">
          <Square className="w-3.5 h-3.5 text-white fill-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Stop
        </span>
      </button>

      {/* Stop All */}
      <button
        onClick={onStopAll}
        disabled={!hasActiveDownloads}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition disabled:opacity-35 disabled:cursor-not-allowed ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Stop all active downloads"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-700 to-red-600 flex items-center justify-center shadow-sm">
          <Octagon className="w-4 h-4 text-white fill-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Stop All
        </span>
      </button>

      {/* Separator */}
      <div className={`h-9 w-[1px] mx-1 ${isDark ? 'bg-[#404040]' : 'bg-[#c5c5c5]'}`} />

      {/* Delete */}
      <button
        onClick={onDeleteSelected}
        disabled={!canDelete}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition disabled:opacity-35 disabled:cursor-not-allowed ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Delete selected download(s)"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-sm">
          <Trash2 className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Delete
        </span>
      </button>

      {/* Delete Completed */}
      <button
        onClick={onDeleteCompleted}
        className={`flex flex-col items-center justify-center min-w-[62px] px-2 py-1 rounded transition ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Remove all completed downloads from list"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-600 to-zinc-500 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Delete Comp.
        </span>
      </button>

      {/* Separator */}
      <div className={`h-9 w-[1px] mx-1 ${isDark ? 'bg-[#404040]' : 'bg-[#c5c5c5]'}`} />

      {/* Options */}
      <button
        onClick={onOptions}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Options & Settings"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center shadow-sm">
          <Settings className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Options
        </span>
      </button>

      {/* Scheduler */}
      <button
        onClick={onScheduler}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Queue Scheduler"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center shadow-sm">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Scheduler
        </span>
      </button>

      {/* Start Queue */}
      <button
        onClick={onStartQueue}
        className={`flex flex-col items-center justify-center min-w-[62px] px-2 py-1 rounded transition ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Start processing download queue"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center shadow-sm">
          <PlayCircle className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Start Queue
        </span>
      </button>

      {/* Stop Queue */}
      <button
        onClick={onStopQueue}
        className={`flex flex-col items-center justify-center min-w-[62px] px-2 py-1 rounded transition ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="Stop download queue"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-zinc-600 flex items-center justify-center shadow-sm">
          <PauseCircle className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Stop Queue
        </span>
      </button>

      {/* Grabber */}
      <button
        onClick={onGrabber}
        className={`flex flex-col items-center justify-center min-w-[56px] px-2 py-1 rounded transition ${
          isDark
            ? 'hover:bg-[#383838] active:bg-[#404040]'
            : 'hover:bg-gradient-to-b hover:from-[#e8f3fe] hover:to-[#cbe3f7] hover:border-[#7eb4ea] active:from-[#bedef9] active:to-[#9ecbf4] border border-transparent'
        }`}
        title="IDM Site Grabber (Crawl web pages for media)"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-sm">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Grabber
        </span>
      </button>

      {/* Separator */}
      <div className={`h-9 w-[1px] mx-1 ${isDark ? 'bg-[#404040]' : 'bg-[#c5c5c5]'}`} />

      {/* Speed Limiter Toggle */}
      <div
        onClick={() => onUpdateSettings({ speedLimiterEnabled: !settings.speedLimiterEnabled })}
        className={`flex flex-col items-center justify-center min-w-[70px] px-2 py-1 rounded cursor-pointer transition select-none ${
          settings.speedLimiterEnabled
            ? (isDark ? 'bg-[#264f36] border border-[#2e7d32]' : 'bg-[#e2f5e9] border border-[#34c759]')
            : (isDark ? 'hover:bg-[#383838]' : 'hover:bg-[#f0f0f0] border border-transparent')
        }`}
        title="Toggle Speed Limiter"
      >
        <div className="relative">
          <Gauge className={`w-5 h-5 ${settings.speedLimiterEnabled ? 'text-emerald-500' : (isDark ? 'text-gray-400' : 'text-gray-500')}`} />
          {settings.speedLimiterEnabled && (
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </div>
        <span className={`text-[10px] font-bold mt-1 ${settings.speedLimiterEnabled ? 'text-emerald-600 dark:text-emerald-400' : (isDark ? 'text-gray-300' : 'text-gray-700')}`}>
          {settings.speedLimiterEnabled ? `${settings.speedLimitKbps} KB/s` : 'Limiter OFF'}
        </span>
      </div>
    </div>
  );
};

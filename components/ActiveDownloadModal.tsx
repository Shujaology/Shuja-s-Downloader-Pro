import React from 'react';
import {
  X,
  Pause,
  Play,
  Minimize2,
  Gauge,
  CheckCircle,
  Activity,
  Layers,
  Clock
} from 'lucide-react';
import type { DownloadItem, IDMSettings } from '../types';
import { formatBytes } from '../constants';

interface ActiveDownloadModalProps {
  item: DownloadItem | null;
  settings: IDMSettings;
  onClose: () => void;
  onPause: (item: DownloadItem) => void;
  onResume: (item: DownloadItem) => void;
  onCancel: (item: DownloadItem) => void;
  onUpdateSettings: (newSettings: Partial<IDMSettings>) => void;
}

export const ActiveDownloadModal: React.FC<ActiveDownloadModalProps> = ({
  item,
  settings,
  onClose,
  onPause,
  onResume,
  onCancel,
  onUpdateSettings,
}) => {
  const isDark = settings.theme === 'windows-dark';

  if (!item) return null;

  const isDownloading = item.status === 'downloading';
  const isComplete = item.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 select-none">
      <div
        className={`w-full max-w-2xl rounded shadow-2xl border text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]'
            : 'bg-[#f0f0f0] border-[#999999] text-[#1e1e1e]'
        }`}
      >
        {/* Title Bar */}
        <div
          className={`flex items-center justify-between px-3 py-1.5 font-semibold text-xs border-b ${
            isDark
              ? 'bg-[#1e1e1e] border-[#383838] text-gray-200'
              : 'bg-gradient-to-r from-[#005a9e] to-[#0078d4] text-white border-[#004578]'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate pr-4">
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {item.progress.toFixed(1)}% of {item.title} - Internet Download Manager
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onClose}
              title="Hide window (continue downloading in background)"
              className="hover:bg-white/20 px-1.5 py-0.5 rounded transition"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs p-3 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {isDownloading ? 'Receiving data...' : item.status === 'paused' ? 'Paused' : item.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">File size:</span>
              <span className="font-mono font-semibold">{formatBytes(item.totalBytes)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Downloaded:</span>
              <span className="font-mono font-semibold">
                {formatBytes(item.downloadedBytes)} ({item.progress.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Transfer rate:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {item.speed}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Time left:</span>
              <span className="font-mono">{item.timeLeft}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Resume capability:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Yes
              </span>
            </div>
          </div>

          {/* Big Overall Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span>Overall Progress:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{item.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-6 rounded border border-gray-400 dark:border-gray-600 relative overflow-hidden flex items-center justify-center">
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-200 ${
                  isComplete
                    ? 'bg-gradient-to-r from-emerald-600 to-green-500'
                    : isDownloading
                    ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 idm-progress-striped'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${item.progress}%` }}
              />
              <span className="relative z-10 font-mono font-bold text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {item.progress.toFixed(1)}% Complete ({formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)})
              </span>
            </div>
          </div>

          {/* IDM Signature Feature: Multi-threaded Connection Segments Visualizer */}
          <div className={`p-3 rounded border ${isDark ? 'bg-[#1e1e1e] border-[#383838]' : 'bg-[#fafafa] border-[#d8d8d8]'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span>Multi-threaded Connection Segments ({item.connections || 8} parallel threads):</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Dynamic Byte Splitting</span>
            </div>

            {/* Segment block diagram (IDM Style colored chunks) */}
            <div className="grid grid-cols-8 gap-1 h-8 bg-gray-300 dark:bg-gray-800 p-1 rounded border border-gray-400 dark:border-gray-700 mb-2.5">
              {item.segments.map((seg) => (
                <div
                  key={seg.id}
                  className="h-full bg-gray-200 dark:bg-gray-700 rounded-xs overflow-hidden relative border border-black/10"
                  title={`Part ${seg.id}: ${seg.progress}% - ${seg.currentSpeed}`}
                >
                  <div
                    className={`h-full transition-all duration-200 idm-segment-block ${
                      seg.status === 'done'
                        ? 'bg-emerald-500'
                        : isDownloading
                        ? 'bg-gradient-to-t from-blue-600 to-cyan-400'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${seg.progress}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-gray-800 dark:text-gray-200">
                    P{seg.id}
                  </span>
                </div>
              ))}
            </div>

            {/* Connection list table */}
            <div className="max-h-28 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className={`border-b sticky top-0 ${isDark ? 'bg-[#2a2a2d] text-gray-400' : 'bg-[#eaeaea] text-gray-600'}`}>
                  <tr>
                    <th className="py-1 px-2">Part</th>
                    <th className="py-1 px-2">State</th>
                    <th className="py-1 px-2 text-right">Downloaded</th>
                    <th className="py-1 px-2 text-right">Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {item.segments.map((seg) => (
                    <tr key={seg.id} className="hover:bg-blue-50 dark:hover:bg-gray-800">
                      <td className="py-0.5 px-2 font-bold text-blue-600 dark:text-blue-400">Connection {seg.id}</td>
                      <td className="py-0.5 px-2 capitalize">
                        {seg.status === 'done' ? (
                          <span className="text-emerald-500 font-semibold">Done</span>
                        ) : isDownloading ? (
                          <span className="text-blue-500 font-semibold">Receiving</span>
                        ) : (
                          <span className="text-amber-500">Idle</span>
                        )}
                      </td>
                      <td className="py-0.5 px-2 text-right">{formatBytes(seg.downloadedBytes)}</td>
                      <td className="py-0.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {seg.currentSpeed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Speed Limiter in Dialog */}
          <div className="flex items-center justify-between p-2 rounded bg-black/5 dark:bg-white/5 border border-gray-300 dark:border-gray-700 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={settings.speedLimiterEnabled}
                onChange={e => onUpdateSettings({ speedLimiterEnabled: e.target.checked })}
                className="rounded"
              />
              <Gauge className="w-3.5 h-3.5 text-amber-500" />
              <span>Speed limiter:</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min="256"
                max="10240"
                step="256"
                disabled={!settings.speedLimiterEnabled}
                value={settings.speedLimitKbps}
                onChange={e => onUpdateSettings({ speedLimitKbps: Number(e.target.value) })}
                className="w-32 cursor-pointer disabled:opacity-40"
              />
              <span className="font-mono font-bold w-16 text-right">
                {settings.speedLimitKbps} KB/s
              </span>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-700">
            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Hang up when done</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Turn off PC when done</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              {isDownloading ? (
                <button
                  type="button"
                  onClick={() => onPause(item)}
                  className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#d83b01] to-[#a80000] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#800000] flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5 fill-white" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onResume(item)}
                  className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#107c41] to-[#0b5c30] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#084223] flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onCancel(item)}
                className={`px-3 py-1.5 rounded border transition font-medium ${
                  isDark
                    ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d] text-white'
                    : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e9e9e9] text-black'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 rounded border transition ${
                  isDark
                    ? 'bg-[#2a2a2d] border-[#444444] hover:bg-[#333333] text-gray-300'
                    : 'bg-[#f4f4f4] border-[#cccccc] hover:bg-[#eaeaea] text-black'
                }`}
              >
                Hide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

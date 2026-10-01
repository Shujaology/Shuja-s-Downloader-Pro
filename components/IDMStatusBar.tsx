import React from 'react';
import { Activity, Gauge, Server, CheckCheck } from 'lucide-react';
import type { DownloadItem, IDMSettings } from '../types';
import { formatSpeed } from '../constants';

interface IDMStatusBarProps {
  settings: IDMSettings;
  downloads: DownloadItem[];
}

export const IDMStatusBar: React.FC<IDMStatusBarProps> = ({ settings, downloads }) => {
  const isDark = settings.theme === 'windows-dark';

  const totalSpeedBps = downloads
    .filter(d => d.status === 'downloading')
    .reduce((sum, d) => sum + (d.speedBps || 0), 0);

  const activeCount = downloads.filter(d => d.status === 'downloading').length;
  const pausedCount = downloads.filter(d => d.status === 'paused').length;
  const completedCount = downloads.filter(d => d.status === 'completed').length;

  return (
    <div
      className={`flex items-center justify-between px-3 py-1 border-t text-[11px] font-sans select-none ${
        isDark
          ? 'bg-[#1e1e1e] text-[#aaaaaa] border-[#333333]'
          : 'bg-[#f0f0f0] text-[#444444] border-[#dcdcdc]'
      }`}
    >
      {/* Left statistics */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-medium">
          <Server className="w-3.5 h-3.5 text-blue-500" />
          <span>Total: <strong>{downloads.length}</strong> items</span>
        </div>

        <div className="flex items-center gap-1.5">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{completedCount} finished, {activeCount} active, {pausedCount} paused</span>
        </div>
      </div>

      {/* Right bandwidth & speed limiter status */}
      <div className="flex items-center gap-5 font-mono">
        <div className="flex items-center gap-1.5">
          <Activity className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <span>
            Speed:{' '}
            <strong className={activeCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}>
              {formatSpeed(totalSpeedBps)}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 border-l pl-4 border-gray-300 dark:border-gray-700">
          <Gauge className={`w-3.5 h-3.5 ${settings.speedLimiterEnabled ? 'text-amber-500' : 'text-gray-400'}`} />
          <span>
            Limiter:{' '}
            <strong>
              {settings.speedLimiterEnabled ? `${settings.speedLimitKbps} KB/s` : 'Off'}
            </strong>
          </span>
        </div>

        <div className="border-l pl-4 border-gray-300 dark:border-gray-700 text-gray-500 text-[10px]">
          SDM v6.42
        </div>
      </div>
    </div>
  );
};

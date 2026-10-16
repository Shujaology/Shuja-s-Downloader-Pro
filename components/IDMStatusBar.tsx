import React from 'react';
import type { DownloadItem, IDMSettings } from '../types';

interface IDMStatusBarProps {
  settings: IDMSettings;
  downloads: DownloadItem[];
  serviceOnline: boolean;
}

export const IDMStatusBar: React.FC<IDMStatusBarProps> = ({ downloads, serviceOnline }) => {
  const queued = downloads.filter(d => d.status === 'queued').length;

  return (
    <div className="sdm-status-bar flex items-center justify-between px-5 py-2.5 text-[11px] text-slate-500">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${serviceOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          Network: {serviceOnline ? 'Connected' : 'Offline'}
        </span>
        <span>Disk Space Available: —</span>
      </div>
      <div className="flex items-center gap-6">
        <span>Smart Scheduler: {queued > 0 ? `${queued} queued` : 'Idle'}</span>
        <span className="text-slate-300 font-semibold">Shuja Turbo Core v3.2</span>
      </div>
    </div>
  );
};

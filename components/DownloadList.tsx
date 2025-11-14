
import React from 'react';
import type { DownloadItem } from '../types';

interface DownloadListProps {
  downloads: DownloadItem[];
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-dark-border rounded-full h-1.5">
    <div
      className="bg-brand-blue h-1.5 rounded-full transition-all duration-300 ease-linear"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

const DownloadListItem: React.FC<{ item: DownloadItem }> = ({ item }) => {
  return (
    <div className="p-4 bg-dark-surface rounded-lg">
      <div className="flex justify-between items-center text-sm">
        <p className="text-dark-text-primary font-medium truncate pr-4">{item.title} - {item.format.quality}</p>
        <p className={`font-mono text-xs ${item.status === 'completed' ? 'text-brand-green' : 'text-dark-text-secondary'}`}>
          {item.status === 'completed' ? 'Done' : `${item.progress.toFixed(0)}%`}
        </p>
      </div>
      <div className="mt-2">
        {item.status === 'downloading' && <ProgressBar progress={item.progress} />}
      </div>
      <div className="flex justify-between items-center text-xs mt-1 text-dark-text-secondary font-mono">
        <span>{item.format.container} / {item.format.size}</span>
        {item.status === 'downloading' && <span>{item.speed}</span>}
      </div>
    </div>
  );
};

const DownloadList: React.FC<DownloadListProps> = ({ downloads }) => {
  if (downloads.length === 0) {
    return null;
  }

  return (
    <div className="px-6 pb-6 border-t border-dark-border">
      <h2 className="text-lg font-bold text-dark-text-primary pt-6 pb-4">Downloads</h2>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {downloads.map(item => (
          <DownloadListItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default DownloadList;

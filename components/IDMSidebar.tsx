import React from 'react';
import {
  Folder,
  FolderArchive,
  FileText,
  Music,
  AppWindow,
  Film,
  Layers,
  RefreshCw,
  CheckCircle,
  Clock,
  HardDrive,
  Globe
} from 'lucide-react';
import type { DownloadCategory, DownloadFilter, DownloadQueue, DownloadItem, IDMSettings } from '../types';

interface IDMSidebarProps {
  settings: IDMSettings;
  selectedCategory: DownloadCategory;
  onSelectCategory: (cat: DownloadCategory) => void;
  selectedQueue: DownloadQueue;
  onSelectQueue: (queue: DownloadQueue) => void;
  selectedFilter: DownloadFilter;
  onSelectFilter: (filter: DownloadFilter) => void;
  downloads: DownloadItem[];
}

export const IDMSidebar: React.FC<IDMSidebarProps> = ({
  settings,
  selectedCategory,
  onSelectCategory,
  selectedQueue,
  onSelectQueue,
  selectedFilter,
  onSelectFilter,
  downloads,
}) => {
  const isDark = settings.theme === 'windows-dark';

  const counts = {
    all: downloads.length,
    compressed: downloads.filter(d => d.category === 'compressed').length,
    documents: downloads.filter(d => d.category === 'documents').length,
    music: downloads.filter(d => d.category === 'music').length,
    programs: downloads.filter(d => d.category === 'programs').length,
    video: downloads.filter(d => d.category === 'video').length,
    mainQueue: downloads.filter(d => d.queue === 'main' || !d.queue).length,
    syncQueue: downloads.filter(d => d.queue === 'sync').length,
    unfinished: downloads.filter(d => d.status === 'downloading' || d.status === 'paused' || d.status === 'queued' || d.status === 'connecting').length,
    finished: downloads.filter(d => d.status === 'completed').length,
  };

  const categories = [
    { id: 'all' as DownloadCategory, label: 'All Downloads', icon: Folder, color: 'text-amber-500' },
    { id: 'compressed' as DownloadCategory, label: 'Compressed', icon: FolderArchive, color: 'text-orange-500' },
    { id: 'documents' as DownloadCategory, label: 'Documents', icon: FileText, color: 'text-blue-500' },
    { id: 'music' as DownloadCategory, label: 'Music', icon: Music, color: 'text-emerald-500' },
    { id: 'programs' as DownloadCategory, label: 'Programs', icon: AppWindow, color: 'text-indigo-500' },
    { id: 'video' as DownloadCategory, label: 'Video', icon: Film, color: 'text-rose-500' },
  ];

  return (
    <div
      className={`w-60 flex-shrink-0 flex flex-col justify-between border-r select-none h-full text-xs ${
        isDark
          ? 'bg-[#1e1e1e] text-[#cccccc] border-[#3c3c3c]'
          : 'bg-[#f4f4f4] text-[#222222] border-[#dfdfdf]'
      }`}
    >
      <div className="p-2 space-y-4 overflow-y-auto">
        {/* Categories Section */}
        <div>
          <div className="flex items-center gap-1.5 px-2 py-1 font-bold uppercase tracking-wider text-[10px] text-gray-500 dark:text-gray-400">
            <span>Categories</span>
          </div>
          <div className="space-y-0.5 mt-1">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id && selectedFilter === 'all';
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onSelectFilter('all');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                    isSelected
                      ? isDark
                        ? 'bg-[#094771] text-white font-medium'
                        : 'bg-[#cce8ff] text-[#004275] font-semibold border border-[#99d1ff]'
                      : isDark
                      ? 'hover:bg-[#2d2d30]'
                      : 'hover:bg-[#e9e9e9]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                    <span>{cat.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? isDark
                          ? 'bg-[#1b5e94] text-white'
                          : 'bg-[#b3d7f5] text-[#003865]'
                        : isDark
                        ? 'bg-[#2a2a2d] text-gray-400'
                        : 'bg-[#e0e0e0] text-gray-600'
                    }`}
                  >
                    {counts[cat.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Queues Section */}
        <div>
          <div className="flex items-center gap-1.5 px-2 py-1 font-bold uppercase tracking-wider text-[10px] text-gray-500 dark:text-gray-400">
            <span>Queues</span>
          </div>
          <div className="space-y-0.5 mt-1">
            <button
              onClick={() => {
                onSelectQueue('main');
                onSelectCategory('all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                selectedQueue === 'main'
                  ? isDark
                    ? 'bg-[#094771] text-white font-medium'
                    : 'bg-[#cce8ff] text-[#004275] font-semibold border border-[#99d1ff]'
                  : isDark
                  ? 'hover:bg-[#2d2d30]'
                  : 'hover:bg-[#e9e9e9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>Main queue</span>
              </div>
              <span className={`text-[10px] px-1.5 rounded-full font-mono ${isDark ? 'bg-[#2a2a2d]' : 'bg-[#e0e0e0]'}`}>
                {counts.mainQueue}
              </span>
            </button>
            <button
              onClick={() => {
                onSelectQueue('sync');
                onSelectCategory('all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                selectedQueue === 'sync'
                  ? isDark
                    ? 'bg-[#094771] text-white font-medium'
                    : 'bg-[#cce8ff] text-[#004275] font-semibold border border-[#99d1ff]'
                  : isDark
                  ? 'hover:bg-[#2d2d30]'
                  : 'hover:bg-[#e9e9e9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400" />
                <span>Sync queue</span>
              </div>
              <span className={`text-[10px] px-1.5 rounded-full font-mono ${isDark ? 'bg-[#2a2a2d]' : 'bg-[#e0e0e0]'}`}>
                {counts.syncQueue}
              </span>
            </button>
          </div>
        </div>

        {/* Status Filters */}
        <div>
          <div className="flex items-center gap-1.5 px-2 py-1 font-bold uppercase tracking-wider text-[10px] text-gray-500 dark:text-gray-400">
            <span>Status</span>
          </div>
          <div className="space-y-0.5 mt-1">
            <button
              onClick={() => {
                onSelectFilter('unfinished');
                onSelectCategory('all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                selectedFilter === 'unfinished'
                  ? isDark
                    ? 'bg-[#094771] text-white font-medium'
                    : 'bg-[#cce8ff] text-[#004275] font-semibold border border-[#99d1ff]'
                  : isDark
                  ? 'hover:bg-[#2d2d30]'
                  : 'hover:bg-[#e9e9e9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Unfinished</span>
              </div>
              <span className="text-[10px] px-1.5 rounded-full font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                {counts.unfinished}
              </span>
            </button>
            <button
              onClick={() => {
                onSelectFilter('finished');
                onSelectCategory('all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                selectedFilter === 'finished'
                  ? isDark
                    ? 'bg-[#094771] text-white font-medium'
                    : 'bg-[#cce8ff] text-[#004275] font-semibold border border-[#99d1ff]'
                  : isDark
                  ? 'hover:bg-[#2d2d30]'
                  : 'hover:bg-[#e9e9e9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Finished</span>
              </div>
              <span className="text-[10px] px-1.5 rounded-full font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                {counts.finished}
              </span>
            </button>
            <button
              onClick={() => {
                onSelectFilter('grabber');
                onSelectCategory('all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                selectedFilter === 'grabber'
                  ? isDark
                    ? 'bg-[#094771] text-white font-medium'
                    : 'bg-[#cce8ff] text-[#004275] font-semibold border border-[#99d1ff]'
                  : isDark
                  ? 'hover:bg-[#2d2d30]'
                  : 'hover:bg-[#e9e9e9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Grabber projects</span>
              </div>
              <span className={`text-[10px] px-1.5 rounded-full font-mono ${isDark ? 'bg-[#2a2a2d]' : 'bg-[#e0e0e0]'}`}>
                0
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Disk Space & Integration Info */}
      <div className={`p-3 border-t text-[11px] ${isDark ? 'border-[#3c3c3c] bg-[#1a1a1a]' : 'border-[#dfdfdf] bg-[#ececec]'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            <span>Local Disk (C:)</span>
          </div>
          <span className="text-[10px] text-gray-500">248.5 GB free</span>
        </div>
        <div className="w-full bg-gray-300 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full" style={{ width: '52%' }} />
        </div>
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-500">
          <span>Browser Module</span>
          <span className="text-emerald-500 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </div>
  );
};

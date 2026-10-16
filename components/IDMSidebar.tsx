import React from 'react';
import type { DownloadCategory, DownloadFilter, DownloadQueue, DownloadItem } from '../types';

interface SidebarProps {
  selectedCategory: DownloadCategory;
  onSelectCategory: (cat: DownloadCategory) => void;
  selectedQueue: DownloadQueue;
  onSelectQueue: (q: DownloadQueue) => void;
  selectedFilter: DownloadFilter;
  onSelectFilter: (f: DownloadFilter) => void;
  downloads: DownloadItem[];
}

export const IDMSidebar: React.FC<SidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedFilter,
  onSelectFilter,
  downloads
}) => {
  const getCount = (cat: DownloadCategory) => downloads.filter(d => cat === 'all' || d.category === cat).length;

  const categories: { id: DownloadCategory; label: string }[] = [
    { id: 'all', label: 'All Downloads' },
    { id: 'video', label: 'Videos' },
    { id: 'documents', label: 'Documents' },
    { id: 'music', label: 'Audio' },
    { id: 'programs', label: 'Software' },
    { id: 'compressed', label: 'Archives' },
  ];

  return (
    <div className="w-56 bg-[#0a0f1e] border-r border-white/5 p-4 flex flex-col gap-4 text-xs select-none">
      <div>
        <h3 className="text-slate-500 font-bold uppercase tracking-wider mb-2 text-[10px]">Status Check</h3>
        <div className="flex flex-col gap-1">
          <button onClick={() => onSelectFilter('all')} className={`w-full flex justify-between px-2 py-1.5 rounded transition-all ${selectedFilter === 'all' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
            <span>Total Queue Items</span>
            <span className="bg-white/5 px-1.5 py-0.2 rounded text-[10px] text-slate-400">{downloads.length}</span>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-slate-500 font-bold uppercase tracking-wider mb-2 text-[10px]">Categories</h3>
        <div className="flex flex-col gap-1">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => onSelectCategory(cat.id)} className={`w-full flex justify-between px-2 py-1.5 rounded transition-all ${selectedCategory === cat.id ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <span>{cat.label}</span>
              <span className="bg-white/5 px-1.5 py-0.2 rounded text-[10px] text-slate-400">{getCount(cat.id)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-white/5 pt-4">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Engine System</div>
        <div className="bg-slate-950/40 rounded p-2 border border-white/5 text-[11px] text-slate-400 flex flex-col gap-1">
          <div className="flex justify-between"><span>Status:</span> <span className="text-emerald-400 font-medium">Ready</span></div>
          <div className="flex justify-between"><span>Threads:</span> <span className="text-sky-400">16 Turbo</span></div>
        </div>
      </div>
    </div>
  );
};

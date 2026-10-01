import React, { useState } from 'react';
import {
  FileArchive,
  FileCode,
  FileText,
  FileVideo,
  FileAudio,
  File,
  Play,
  Pause,
  Trash2,
  FolderOpen,
  ExternalLink,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import type { DownloadItem, IDMSettings } from '../types';
import { formatBytes } from '../constants';

interface IDMDownloadTableProps {
  settings: IDMSettings;
  downloads: DownloadItem[];
  selectedId: string | null;
  onSelectDownload: (id: string) => void;
  onOpenDownloadDetails: (item: DownloadItem) => void;
  onResume: (item: DownloadItem) => void;
  onPause: (item: DownloadItem) => void;
  onDelete: (id: string) => void;
  onRedownload: (item: DownloadItem) => void;
}

export const IDMDownloadTable: React.FC<IDMDownloadTableProps> = ({
  settings,
  downloads,
  selectedId,
  onSelectDownload,
  onOpenDownloadDetails,
  onResume,
  onPause,
  onDelete,
  onRedownload,
}) => {
  const isDark = settings.theme === 'windows-dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'title' | 'totalBytes' | 'progress' | 'dateAdded'>('dateAdded');
  const [sortAsc, setSortAsc] = useState(false);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: DownloadItem;
  } | null>(null);

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'compressed':
        return <FileArchive className="w-4 h-4 text-orange-500" />;
      case 'documents':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'music':
        return <FileAudio className="w-4 h-4 text-emerald-500" />;
      case 'video':
        return <FileVideo className="w-4 h-4 text-rose-500" />;
      case 'programs':
        return <FileCode className="w-4 h-4 text-indigo-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (item: DownloadItem) => {
    switch (item.status) {
      case 'downloading':
        return (
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Downloading ({item.progress.toFixed(0)}%)
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Complete
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium font-mono">
            <Pause className="w-3.5 h-3.5 text-amber-500" />
            Paused ({item.progress.toFixed(0)}%)
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1 text-indigo-500 font-medium">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            Error
          </span>
        );
      case 'queued':
        return (
          <span className="flex items-center gap-1 text-gray-500 font-medium">
            <Clock className="w-3.5 h-3.5" />
            Queued
          </span>
        );
      default:
        return <span>{item.status}</span>;
    }
  };

  const handleSort = (field: 'title' | 'totalBytes' | 'progress' | 'dateAdded') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filtered = downloads
    .filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()) || d.url.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') comparison = a.title.localeCompare(b.title);
      if (sortField === 'totalBytes') comparison = a.totalBytes - b.totalBytes;
      if (sortField === 'progress') comparison = a.progress - b.progress;
      if (sortField === 'dateAdded') comparison = a.dateAdded.localeCompare(b.dateAdded);
      return sortAsc ? comparison : -comparison;
    });

  const handleContextMenu = (e: React.MouseEvent, item: DownloadItem) => {
    e.preventDefault();
    onSelectDownload(item.id);
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 260),
      item,
    });
  };

  const handleOpenFile = (item: DownloadItem) => {
    if (item.fileBlobUrl) {
      const a = document.createElement('a');
      a.href = item.fileBlobUrl;
      a.download = item.title;
      a.click();
    } else {
      alert(`Opening file: ${item.savePath}\n(File saved in default download directory)`);
    }
  };

  return (
    <div
      onClick={() => setContextMenu(null)}
      className={`flex-1 flex flex-col h-full overflow-hidden select-none text-xs ${
        isDark ? 'bg-[#181818] text-[#e0e0e0]' : 'bg-[#ffffff] text-[#1e1e1e]'
      }`}
    >
      {/* Search / Filter Quick Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b text-xs ${
          isDark ? 'bg-[#222222] border-[#333333]' : 'bg-[#f8f8f8] border-[#e5e5e5]'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter downloads..."
              className={`pl-7 pr-3 py-1 text-xs rounded border outline-none w-56 transition ${
                isDark
                  ? 'bg-[#2d2d30] border-[#444444] text-white focus:border-blue-500'
                  : 'bg-white border-[#cccccc] text-black focus:border-blue-500'
              }`}
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[11px] text-gray-500 hover:text-red-500"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-[11px] text-gray-500 font-mono">
          Showing {filtered.length} of {downloads.length} downloads
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          {/* Header */}
          <thead
            className={`sticky top-0 z-10 border-b select-none ${
              isDark
                ? 'bg-[#252526] text-[#cccccc] border-[#383838]'
                : 'bg-gradient-to-b from-[#f7f7f7] to-[#e6e6e6] text-[#333333] border-[#cccccc]'
            }`}
          >
            <tr>
              <th className="py-1.5 px-2 w-7 text-center border-r border-gray-300 dark:border-gray-700">#</th>
              <th
                onClick={() => handleSort('title')}
                className="py-1.5 px-3 font-semibold cursor-pointer border-r border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-[#333333]"
              >
                <div className="flex items-center justify-between">
                  <span>File Name</span>
                  <ArrowUpDown className="w-3 h-3 opacity-40 ml-1" />
                </div>
              </th>
              <th
                onClick={() => handleSort('totalBytes')}
                className="py-1.5 px-3 font-semibold cursor-pointer w-24 text-right border-r border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-[#333333]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Size</span>
                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                </div>
              </th>
              <th
                onClick={() => handleSort('progress')}
                className="py-1.5 px-3 font-semibold cursor-pointer w-36 border-r border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-[#333333]"
              >
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                </div>
              </th>
              <th className="py-1.5 px-3 font-semibold w-24 border-r border-gray-300 dark:border-gray-700">Time Left</th>
              <th className="py-1.5 px-3 font-semibold w-28 text-right border-r border-gray-300 dark:border-gray-700">Transfer Rate</th>
              <th className="py-1.5 px-3 font-semibold w-36 border-r border-gray-300 dark:border-gray-700">Progress</th>
              <th
                onClick={() => handleSort('dateAdded')}
                className="py-1.5 px-3 font-semibold cursor-pointer w-32 border-r border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-[#333333]"
              >
                <div className="flex items-center justify-between">
                  <span>Last Try Date</span>
                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                </div>
              </th>
              <th className="py-1.5 px-3 font-semibold w-24">Category</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <File className="w-10 h-10 stroke-[1.2] text-gray-400" />
                    <p className="text-sm font-medium">No downloads in this view</p>
                    <p className="text-xs text-gray-500">Click "+ Add URL" to start downloading with SDM</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectDownload(item.id)}
                    onDoubleClick={() => onOpenDownloadDetails(item)}
                    onContextMenu={e => handleContextMenu(e, item)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-[#094771] text-white'
                          : 'bg-[#cce8ff] text-[#002244]'
                        : isDark
                        ? 'hover:bg-[#2a2d2e] even:bg-[#1f1f1f]'
                        : 'hover:bg-[#eaf4fe] even:bg-[#fafafa]'
                    }`}
                  >
                    <td className="py-2 px-2 text-center text-gray-400 font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-medium">
                      <div className="flex items-center gap-2 max-w-[280px] xl:max-w-md">
                        {getFileIcon(item.category)}
                        <span className="truncate" title={item.title}>
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px] whitespace-nowrap">
                      {formatBytes(item.totalBytes)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {getStatusBadge(item)}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {item.timeLeft}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {item.speed}
                    </td>
                    <td className="py-2 px-3">
                      {/* IDM Striped Progress Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-sm overflow-hidden border border-gray-300 dark:border-gray-600 relative">
                        <div
                          className={`h-full transition-all duration-300 ${
                            item.status === 'completed'
                              ? 'bg-gradient-to-r from-emerald-600 to-green-500'
                              : item.status === 'paused'
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-blue-600 to-cyan-400 idm-progress-striped'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {item.dateAdded}
                    </td>
                    <td className="py-2 px-3 capitalize text-gray-600 dark:text-gray-400 text-[11px]">
                      {item.category}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className={`fixed z-50 w-52 shadow-2xl rounded-sm border py-1 select-none text-xs ${
            isDark ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]' : 'bg-[#ffffff] border-[#999999] text-[#222222]'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.item.status === 'completed' ? (
            <>
              <button
                onClick={() => {
                  handleOpenFile(contextMenu.item);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                  isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold">Open / Run File</span>
              </button>
              <button
                onClick={() => {
                  alert(`File location:\n${contextMenu.item.savePath}`);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                  isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                Open folder
              </button>
              <div className={`my-1 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-[#e0e0e0]'}`} />
              <button
                onClick={() => {
                  onRedownload(contextMenu.item);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                  isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                Redownload
              </button>
            </>
          ) : contextMenu.item.status === 'downloading' ? (
            <button
              onClick={() => {
                onPause(contextMenu.item);
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Pause className="w-3.5 h-3.5 text-amber-500" />
              Pause download
            </button>
          ) : (
            <button
              onClick={() => {
                onResume(contextMenu.item);
                setContextMenu(null);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-green-500" />
              Resume download
            </button>
          )}

          <button
            onClick={() => {
              onOpenDownloadDetails(contextMenu.item);
              setContextMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
              isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Download Progress / Details
          </button>

          <div className={`my-1 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-[#e0e0e0]'}`} />

          <button
            onClick={() => {
              onDelete(contextMenu.item.id);
              setContextMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-red-500 hover:${
              isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete from list
          </button>
        </div>
      )}
    </div>
  );
};

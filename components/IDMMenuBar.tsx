import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  FolderOpen,
  Settings,
  HelpCircle,
  Clock,
  Layers,
  Trash2,
  Play,
  Square,
  Globe,
  Sun,
  Moon,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { IDMSettings } from '../types';

interface IDMMenuBarProps {
  settings: IDMSettings;
  onUpdateSettings: (newSettings: Partial<IDMSettings>) => void;
  onOpenAddUrl: () => void;
  onOpenOptions: () => void;
  onOpenScheduler: () => void;
  onOpenGrabber: () => void;
  onOpenAbout: () => void;
  onStartQueue: () => void;
  onStopQueue: () => void;
  onDeleteCompleted: () => void;
  onDeleteSelected: () => void;
  selectedCount: number;
}

export const IDMMenuBar: React.FC<IDMMenuBarProps> = ({
  settings,
  onUpdateSettings,
  onOpenAddUrl,
  onOpenOptions,
  onOpenScheduler,
  onOpenGrabber,
  onOpenAbout,
  onStartQueue,
  onStopQueue,
  onDeleteCompleted,
  onDeleteSelected,
  selectedCount,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleAction = (callback: () => void) => {
    callback();
    setActiveMenu(null);
  };

  const toggleTheme = () => {
    onUpdateSettings({
      theme: settings.theme === 'windows-classic' ? 'windows-dark' : 'windows-classic',
    });
    setActiveMenu(null);
  };

  const isDark = settings.theme === 'windows-dark';

  return (
    <div
      ref={menuRef}
      className={`flex items-center text-xs border-b select-none transition-colors ${
        isDark
          ? 'bg-[#252526] text-[#cccccc] border-[#3c3c3c]'
          : 'bg-[#f0f0f0] text-[#1e1e1e] border-[#dfdfdf]'
      }`}
    >
      {/* Tasks Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('tasks')}
          className={`px-3 py-1 hover:${isDark ? 'bg-[#333333]' : 'bg-[#e5f1fb]'} ${
            activeMenu === 'tasks' ? (isDark ? 'bg-[#333333]' : 'bg-[#cbe3f7]') : ''
          }`}
        >
          <span className="underline">T</span>asks
        </button>
        {activeMenu === 'tasks' && (
          <div
            className={`absolute left-0 top-full mt-0 w-56 shadow-lg border z-50 py-1 rounded-sm ${
              isDark ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]' : 'bg-[#ffffff] border-[#999999] text-[#222222]'
            }`}
          >
            <button
              onClick={() => handleAction(onOpenAddUrl)}
              className={`w-full flex items-center justify-between px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-blue-500" />
                Add new download
              </span>
              <span className="text-[10px] opacity-60">Ctrl+N</span>
            </button>
            <button
              onClick={() => handleAction(onOpenGrabber)}
              className={`w-full flex items-center justify-between px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                Run Site Grabber
              </span>
            </button>
            <div className={`my-1 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-[#e0e0e0]'}`} />
            <button
              onClick={() => handleAction(onDeleteCompleted)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Remove completed downloads
            </button>
            <button
              onClick={() => handleAction(onDeleteSelected)}
              disabled={selectedCount === 0}
              className={`w-full flex items-center gap-2 px-3 py-1.5 disabled:opacity-40 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              Delete selected ({selectedCount})
            </button>
          </div>
        )}
      </div>

      {/* File Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('file')}
          className={`px-3 py-1 hover:${isDark ? 'bg-[#333333]' : 'bg-[#e5f1fb]'} ${
            activeMenu === 'file' ? (isDark ? 'bg-[#333333]' : 'bg-[#cbe3f7]') : ''
          }`}
        >
          <span className="underline">F</span>ile
        </button>
        {activeMenu === 'file' && (
          <div
            className={`absolute left-0 top-full mt-0 w-52 shadow-lg border z-50 py-1 rounded-sm ${
              isDark ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]' : 'bg-[#ffffff] border-[#999999] text-[#222222]'
            }`}
          >
            <button
              onClick={() => handleAction(onOpenAddUrl)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
              Open URL to download
            </button>
            <div className={`my-1 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-[#e0e0e0]'}`} />
            <button
              onClick={() => handleAction(onOpenOptions)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-gray-500" />
              Default Download Folders
            </button>
          </div>
        )}
      </div>

      {/* Downloads Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('downloads')}
          className={`px-3 py-1 hover:${isDark ? 'bg-[#333333]' : 'bg-[#e5f1fb]'} ${
            activeMenu === 'downloads' ? (isDark ? 'bg-[#333333]' : 'bg-[#cbe3f7]') : ''
          }`}
        >
          <span className="underline">D</span>ownloads
        </button>
        {activeMenu === 'downloads' && (
          <div
            className={`absolute left-0 top-full mt-0 w-56 shadow-lg border z-50 py-1 rounded-sm ${
              isDark ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]' : 'bg-[#ffffff] border-[#999999] text-[#222222]'
            }`}
          >
            <button
              onClick={() => handleAction(onStartQueue)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-green-500" />
              Start Queue
            </button>
            <button
              onClick={() => handleAction(onStopQueue)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Square className="w-3.5 h-3.5 text-red-500" />
              Stop Queue
            </button>
            <div className={`my-1 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-[#e0e0e0]'}`} />
            <button
              onClick={() => handleAction(onOpenScheduler)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Scheduler / Queues
            </button>
            <button
              onClick={() => handleAction(onOpenOptions)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-blue-500" />
              Options...
            </button>
            <button
              onClick={() => {
                onUpdateSettings({ speedLimiterEnabled: !settings.speedLimiterEnabled });
                setActiveMenu(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                Speed Limiter
              </span>
              <span className={`text-[10px] font-bold ${settings.speedLimiterEnabled ? 'text-green-500' : 'text-gray-400'}`}>
                {settings.speedLimiterEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* View Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('view')}
          className={`px-3 py-1 hover:${isDark ? 'bg-[#333333]' : 'bg-[#e5f1fb]'} ${
            activeMenu === 'view' ? (isDark ? 'bg-[#333333]' : 'bg-[#cbe3f7]') : ''
          }`}
        >
          <span className="underline">V</span>iew
        </button>
        {activeMenu === 'view' && (
          <div
            className={`absolute left-0 top-full mt-0 w-56 shadow-lg border z-50 py-1 rounded-sm ${
              isDark ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]' : 'bg-[#ffffff] border-[#999999] text-[#222222]'
            }`}
          >
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center justify-between px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <span className="flex items-center gap-2">
                {isDark ? <Sun className="w-3.5 h-3.5 text-yellow-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
                Theme
              </span>
              <span className="text-[11px] font-medium opacity-75">
                {isDark ? 'Windows Dark' : 'Classic Windows'}
              </span>
            </button>
            <button
              onClick={() => {
                onUpdateSettings({ showFloatingVideoBar: !settings.showFloatingVideoBar });
                setActiveMenu(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <span>Floating Video Grabber Bar</span>
              <span className="text-[10px] font-bold">{settings.showFloatingVideoBar ? '✓' : ''}</span>
            </button>
          </div>
        )}
      </div>

      {/* Help Menu */}
      <div className="relative">
        <button
          onClick={() => handleMenuClick('help')}
          className={`px-3 py-1 hover:${isDark ? 'bg-[#333333]' : 'bg-[#e5f1fb]'} ${
            activeMenu === 'help' ? (isDark ? 'bg-[#333333]' : 'bg-[#cbe3f7]') : ''
          }`}
        >
          <span className="underline">H</span>elp
        </button>
        {activeMenu === 'help' && (
          <div
            className={`absolute left-0 top-full mt-0 w-56 shadow-lg border z-50 py-1 rounded-sm ${
              isDark ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]' : 'bg-[#ffffff] border-[#999999] text-[#222222]'
            }`}
          >
            <button
              onClick={() => handleAction(onOpenAbout)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:${
                isDark ? 'bg-[#094771] text-white' : 'bg-[#91c9f7]'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-blue-500" />
              About SDM Pro...
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

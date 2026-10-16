import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  FolderOpen,
  Settings,
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

  const MenuButton: React.FC<{ id: string; label: string }> = ({ id, label }) => (
    <button
      onClick={() => handleMenuClick(id)}
      className={activeMenu === id ? 'bg-white/[0.06] text-slate-100' : ''}
    >
      {label}
    </button>
  );

  const Item: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
    disabled?: boolean;
  }> = ({ onClick, icon, label, shortcut, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between px-3 py-2 disabled:opacity-40"
    >
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      {shortcut && <span className="text-[10px] text-slate-500">{shortcut}</span>}
    </button>
  );

  return (
    <div ref={menuRef} className="sdm-menu-bar flex items-center text-xs select-none">
      <div className="relative">
        <MenuButton id="file" label="File" />
        {activeMenu === 'file' && (
          <div className="sdm-dropdown absolute left-0 top-full mt-1 w-60 z-50 py-1">
            <Item onClick={() => handleAction(onOpenAddUrl)} icon={<Download className="w-3.5 h-3.5 text-sky-400" />} label="New download" shortcut="Ctrl+N" />
            <Item onClick={() => handleAction(onOpenGrabber)} icon={<Globe className="w-3.5 h-3.5 text-slate-400" />} label="Site grabber" />
            <Item onClick={() => handleAction(onOpenAddUrl)} icon={<FolderOpen className="w-3.5 h-3.5 text-slate-400" />} label="Open URL" />
          </div>
        )}
      </div>

      <div className="relative">
        <MenuButton id="downloads" label="Downloads" />
        {activeMenu === 'downloads' && (
          <div className="sdm-dropdown absolute left-0 top-full mt-1 w-64 z-50 py-1">
            <Item onClick={() => handleAction(onStartQueue)} icon={<Play className="w-3.5 h-3.5 text-slate-400" />} label="Start queue" />
            <Item onClick={() => handleAction(onStopQueue)} icon={<Square className="w-3.5 h-3.5 text-slate-400" />} label="Stop queue" />
            <div className="my-1 border-t border-white/10" />
            <Item onClick={() => handleAction(onDeleteCompleted)} icon={<CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />} label="Clear finished" />
            <Item onClick={() => handleAction(onDeleteSelected)} icon={<Trash2 className="w-3.5 h-3.5 text-slate-400" />} label={`Remove selected (${selectedCount})`} disabled={selectedCount === 0} />
            <div className="my-1 border-t border-white/10" />
            <Item onClick={() => handleAction(onOpenScheduler)} icon={<Clock className="w-3.5 h-3.5 text-slate-400" />} label="Scheduler" />
            <Item
              onClick={() => {
                onUpdateSettings({ speedLimiterEnabled: !settings.speedLimiterEnabled });
                setActiveMenu(null);
              }}
              icon={<Layers className="w-3.5 h-3.5 text-slate-400" />}
              label={`Speed limiter · ${settings.speedLimiterEnabled ? 'On' : 'Off'}`}
            />
          </div>
        )}
      </div>

      <div className="relative">
        <MenuButton id="view" label="View" />
        {activeMenu === 'view' && (
          <div className="sdm-dropdown absolute left-0 top-full mt-1 w-64 z-50 py-1">
            <Item
              onClick={toggleTheme}
              icon={isDark ? <Sun className="w-3.5 h-3.5 text-slate-400" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
              label={isDark ? 'Light appearance' : 'Dark appearance'}
            />
            <Item
              onClick={() => {
                onUpdateSettings({ showFloatingVideoBar: !settings.showFloatingVideoBar });
                setActiveMenu(null);
              }}
              icon={<Globe className="w-3.5 h-3.5 text-slate-400" />}
              label={`Video grabber button · ${settings.showFloatingVideoBar ? 'On' : 'Off'}`}
            />
          </div>
        )}
      </div>

      <div className="relative">
        <MenuButton id="help" label="Help" />
        {activeMenu === 'help' && (
          <div className="sdm-dropdown absolute left-0 top-full mt-1 w-56 z-50 py-1">
            <Item onClick={() => handleAction(onOpenOptions)} icon={<Settings className="w-3.5 h-3.5 text-slate-400" />} label="Settings" />
            <Item onClick={() => handleAction(onOpenAbout)} icon={<Info className="w-3.5 h-3.5 text-slate-400" />} label="About SDM Pro" />
          </div>
        )}
      </div>
    </div>
  );
};

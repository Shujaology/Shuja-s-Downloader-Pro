import React from 'react';
import { Minus, Square, X, Download } from 'lucide-react';
import type { IDMSettings } from '../types';

interface HeaderProps {
  settings: IDMSettings;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  const isDark = settings.theme === 'windows-dark';

  return (
    <div
      className={`flex items-center justify-between px-2 py-1 select-none border-b text-xs ${
        isDark
          ? 'bg-[#1e1e1e] text-[#cccccc] border-[#383838]'
          : 'bg-gradient-to-r from-[#005a9e] via-[#0070c0] to-[#0078d4] text-white border-[#004578]'
      }`}
    >
      {/* Title & Icon */}
      <div className="flex items-center gap-2 font-semibold">
        <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center p-0.5">
          <Download className="w-3 h-3 text-white" />
        </div>
        <span className="tracking-wide">
          Shuja's Download Manager Pro 6.42
        </span>
      </div>

      {/* Windows Window Controls */}
      <div className="flex items-center">
        <button
          onClick={onMinimize}
          className={`h-6 w-9 flex items-center justify-center transition ${
            isDark ? 'hover:bg-[#333333]' : 'hover:bg-white/20'
          }`}
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMaximize}
          className={`h-6 w-9 flex items-center justify-center transition ${
            isDark ? 'hover:bg-[#333333]' : 'hover:bg-white/20'
          }`}
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={onClose}
          className="h-6 w-9 flex items-center justify-center hover:bg-[#e81123] hover:text-white transition"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Header;
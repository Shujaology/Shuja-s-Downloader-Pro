import React from 'react';
import { X, Award, ShieldCheck, Heart } from 'lucide-react';
import type { IDMSettings } from '../types';

interface AboutModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  settings,
  onClose,
}) => {
  const isDark = settings.theme === 'windows-dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 select-none">
      <div
        className={`w-full max-w-md rounded shadow-2xl border text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
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
          <span>About Shuja's Download Manager Pro</span>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-md flex items-center justify-center">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Shuja's Downloader Pro (SDM)
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                Version 6.42 Build 18 (x64) Full Edition
              </p>
            </div>
          </div>

          <div className="p-3 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">License Status:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Activated (Lifetime Pro)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Registered to:</span>
              <span className="font-semibold">Shuja (Developer Edition)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Serial Number:</span>
              <span className="font-mono text-[10px] text-gray-600 dark:text-gray-400">
                SDM64-SHUJA-PRO99-ULTRA-2026
              </span>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 space-y-1 border-t border-gray-200 dark:border-gray-800 pt-3">
            <p>
              High-performance download accelerator featuring multi-threaded dynamic segment splitting, YouTube & media stream sniffing, and intelligent queue scheduling.
            </p>
            <p className="flex items-center gap-1 text-[10px] pt-1">
              <span>Engineered with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span>for maximum downloading speed.</span>
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-1.5 font-bold rounded bg-gradient-to-b from-[#0078d4] to-[#005a9e] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#004578]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

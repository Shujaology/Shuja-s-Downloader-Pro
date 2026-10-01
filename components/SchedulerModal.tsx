import React, { useState } from 'react';
import { X, Clock, Play, Square, Calendar, Power } from 'lucide-react';
import type { IDMSettings } from '../types';

interface SchedulerModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  onClose: () => void;
  onSave: (newSettings: Partial<IDMSettings>) => void;
}

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const isDark = settings.theme === 'windows-dark';
  const [maxSimultaneous, setMaxSimultaneous] = useState(settings.maxSimultaneousDownloads || 3);
  const [startTimer, setStartTimer] = useState(false);
  const [stopTimer, setStopTimer] = useState(false);
  const [turnOffPc, setTurnOffPc] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    onSave({ maxSimultaneousDownloads: maxSimultaneous });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 select-none">
      <div
        className={`w-full max-w-lg rounded shadow-2xl border text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
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
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>IDM Scheduler & Queue Settings</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          <div className="flex items-center gap-2 p-2.5 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5">
            <span className="font-semibold">Queue processing:</span>
            <span className="text-gray-500">Main download queue</span>
          </div>

          {/* Concurrent files */}
          <div className="flex items-center justify-between">
            <label className="font-semibold">Download simultaneous files at the same time:</label>
            <select
              value={maxSimultaneous}
              onChange={e => setMaxSimultaneous(Number(e.target.value))}
              className={`px-2 py-1 rounded border outline-none font-bold ${
                isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
              }`}
            >
              <option value={1}>1 download</option>
              <option value={2}>2 downloads</option>
              <option value={3}>3 downloads (Recommended)</option>
              <option value={5}>5 downloads</option>
              <option value={8}>8 downloads</option>
            </select>
          </div>

          {/* Timing options */}
          <div className="space-y-2 p-3 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={startTimer}
                  onChange={e => setStartTimer(e.target.checked)}
                  className="rounded"
                />
                <Play className="w-3.5 h-3.5 text-green-500" />
                <span>Start download at:</span>
              </span>
              <input
                type="time"
                defaultValue="02:00"
                disabled={!startTimer}
                className="px-2 py-0.5 rounded border disabled:opacity-40"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer border-t border-gray-200 dark:border-gray-800 pt-2">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={stopTimer}
                  onChange={e => setStopTimer(e.target.checked)}
                  className="rounded"
                />
                <Square className="w-3.5 h-3.5 text-red-500" />
                <span>Stop download at:</span>
              </span>
              <input
                type="time"
                defaultValue="06:00"
                disabled={!stopTimer}
                className="px-2 py-0.5 rounded border disabled:opacity-40"
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer border-t border-gray-200 dark:border-gray-800 pt-2 font-medium">
              <input
                type="checkbox"
                checked={turnOffPc}
                onChange={e => setTurnOffPc(e.target.checked)}
                className="rounded"
              />
              <Power className="w-3.5 h-3.5 text-rose-500" />
              <span>Turn off computer when downloads finish</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-300 dark:border-gray-700">
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-1.5 font-bold rounded bg-gradient-to-b from-[#0078d4] to-[#005a9e] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#004578]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded border transition ${
                isDark
                  ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d] text-white'
                  : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e9e9e9] text-black'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

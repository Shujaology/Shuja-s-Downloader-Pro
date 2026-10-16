import React from 'react';
import { X, CheckCircle, ExternalLink, FolderOpen } from 'lucide-react';
import type { DownloadItem, IDMSettings } from '../types';
import { formatBytes } from '../constants';

interface DownloadCompleteModalProps {
  item: DownloadItem | null;
  settings: IDMSettings;
  onClose: () => void;
}

export const DownloadCompleteModal: React.FC<DownloadCompleteModalProps> = ({
  item,
  settings,
  onClose,
}) => {
  const isDark = settings.theme === 'windows-dark';

  if (!item) return null;

  const handleOpen = () => {
    if (item.fileBlobUrl) {
      const a = document.createElement('a');
      a.href = item.fileBlobUrl;
      a.download = item.title;
      a.click();
    } else {
      alert('The downloaded data is no longer available in this browser session. Please download the file again.');
    }
    onClose();
  };

  const handleOpenFolder = () => {
    alert(`Downloaded file location:\n${item.savePath}`);
  };

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
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download complete</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                Download finished!
              </h4>
              <p className="font-medium text-xs truncate mt-0.5" title={item.title}>
                {item.title}
              </p>
              <div className="text-[11px] text-gray-500 font-mono mt-1">
                Size: {formatBytes(item.totalBytes)} | Browser stream complete
              </div>
            </div>
          </div>

          <div className="text-[11px] p-2.5 rounded bg-black/5 dark:bg-white/5 border border-gray-300 dark:border-gray-700 font-mono truncate">
            <span className="text-gray-500">Saved to: </span>
            <span className="font-semibold">{item.savePath}</span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700">
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span>Don't show again</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpen}
                className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#107c41] to-[#0b5c30] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#084223] flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Save file</span>
              </button>

              <button
                type="button"
                onClick={handleOpenFolder}
                className={`px-3 py-1.5 rounded border transition font-medium flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d] text-white'
                    : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e9e9e9] text-black'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Show location</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 rounded border transition ${
                  isDark
                    ? 'bg-[#2a2a2d] border-[#444444] hover:bg-[#333333] text-gray-300'
                    : 'bg-[#f4f4f4] border-[#cccccc] hover:bg-[#eaeaea] text-black'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

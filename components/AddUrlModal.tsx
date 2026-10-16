import React, { useState, useEffect } from 'react';
import { X, Link2, Download, Clipboard, Sparkles } from 'lucide-react';
import { SAMPLE_TEST_URLS } from '../constants';
import type { IDMSettings } from '../types';

interface AddUrlModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  onClose: () => void;
  onSubmitUrl: (url: string, directDownload: boolean) => void;
}

export const AddUrlModal: React.FC<AddUrlModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSubmitUrl,
}) => {
  const isDark = settings.theme === 'windows-dark';
  const [url, setUrl] = useState('');
  const [directDownload, setDirectDownload] = useState(false);

  // Auto-detect clipboard on open if valid URL
  useEffect(() => {
    if (isOpen) {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
          .then(text => {
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
              setUrl(text);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmitUrl(url.trim(), directDownload);
      setUrl('');
      onClose();
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
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
            <Download className="w-3.5 h-3.5" />
            <span>Enter new address to download</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="idm-url-input" className="font-semibold flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Address (URL):</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setUrl(text);
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Clipboard className="w-3 h-3" />
                Paste from Clipboard
              </button>
            </div>
            <input
              id="idm-url-input"
              type="text"
              required
              autoFocus
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/file.zip or YouTube URL..."
              className={`w-full px-2.5 py-1.5 rounded border outline-none font-mono text-xs transition ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#3e3e42] text-white focus:border-blue-500'
                  : 'bg-white border-[#abadb3] text-black focus:border-[#0078d4]'
              }`}
            />
          </div>

          {/* Quick Sample Links */}
          <div className={`p-2.5 rounded border text-[11px] ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-[#fafafa] border-[#e0e0e0]'}`}>
            <div className="font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Or try a sample direct-file URL:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TEST_URLS.map(sample => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => handleSelectSample(sample.url)}
                  className={`px-2 py-1 rounded border text-[10px] font-medium transition ${
                    isDark
                      ? 'bg-[#2a2a2d] border-[#444444] hover:bg-[#383838] text-gray-300'
                      : 'bg-white border-[#cccccc] hover:bg-blue-50 text-gray-700'
                  }`}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Direct download checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="directDownloadCheck"
              checked={directDownload}
              onChange={e => setDirectDownload(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="directDownloadCheck" className="cursor-pointer">
              Start download immediately (skip Download Info dialog)
            </label>
          </div>

          <div className={`rounded border p-2.5 text-[11px] ${
            isDark ? 'bg-[#1e1e1e] border-[#333333] text-gray-400' : 'bg-[#fafafa] border-[#e0e0e0] text-gray-500'
          }`}>
            Custom referrer and authentication-header controls are not available yet. Use a direct file URL accessible without those headers.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-300 dark:border-gray-700">
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-5 py-1.5 font-bold rounded bg-gradient-to-b from-[#0078d4] to-[#005a9e] text-white hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm border border-[#004578]"
            >
              OK
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded border transition ${
                isDark
                  ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d] text-white'
                  : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e5e5e5] text-black'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Globe, ArrowRight, FolderSearch, CheckSquare } from 'lucide-react';
import type { IDMSettings } from '../types';

interface SiteGrabberModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  onClose: () => void;
  onStartGrab: (url: string, fileType: string) => void;
}

export const SiteGrabberModal: React.FC<SiteGrabberModalProps> = ({
  isOpen,
  settings,
  onClose,
  onStartGrab,
}) => {
  const isDark = settings.theme === 'windows-dark';
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('New Project');
  const [startUrl, setStartUrl] = useState('https://archive.org/details/movies');
  const [grabType, setGrabType] = useState('video');
  const [exploreDepth, setExploreDepth] = useState(2);

  if (!isOpen) return null;

  const handleFinish = () => {
    onStartGrab(startUrl, grabType);
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
            <Globe className="w-3.5 h-3.5" />
            <span>IDM Site Grabber Wizard - Step {step} of 2</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Wizard Body */}
        <div className="p-4 space-y-3.5">
          {step === 1 ? (
            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Project Name:</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className={`w-full px-2 py-1 rounded border outline-none font-semibold ${
                    isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
                  }`}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Start Page / Web Address:</label>
                <input
                  type="text"
                  value={startUrl}
                  onChange={e => setStartUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-2 py-1 rounded border outline-none font-mono ${
                    isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
                  }`}
                />
              </div>

              <div className="p-2.5 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5 space-y-1 text-[11px] text-gray-500">
                <p>Site Grabber explores web links recursively to batch-download files matching your criteria.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                Select what files you want to download from this site:
              </div>

              <div className="space-y-2 p-3 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5">
                {[
                  { id: 'video', label: 'All video files (.mp4, .mkv, .avi, .webm)' },
                  { id: 'audio', label: 'All audio/music files (.mp3, .wav, .flac)' },
                  { id: 'pictures', label: 'All pictures (.jpg, .png, .webp, .svg)' },
                  { id: 'documents', label: 'All documents (.pdf, .doc, .txt, .zip)' },
                  { id: 'all', label: 'All media and links found on website' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="grabType"
                      checked={grabType === opt.id}
                      onChange={() => setGrabType(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <label className="font-semibold">Explore depth (link levels):</label>
                <select
                  value={exploreDepth}
                  onChange={e => setExploreDepth(Number(e.target.value))}
                  className={`px-2 py-1 rounded border outline-none ${
                    isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
                  }`}
                >
                  <option value={1}>1 level (current page only)</option>
                  <option value={2}>2 levels (recommended)</option>
                  <option value={3}>3 levels</option>
                </select>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700">
            <span className="text-[10px] text-gray-400">IDM Crawler Engine</span>

            <div className="flex items-center gap-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-3 py-1.5 rounded border transition ${
                    isDark ? 'bg-[#333333] border-[#444444]' : 'bg-[#e1e1e1] border-[#adadad]'
                  }`}
                >
                  Back
                </button>
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#0078d4] to-[#005a9e] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#004578] flex items-center gap-1"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#107c41] to-[#0b5c30] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#084223] flex items-center gap-1"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                  <span>Start Grabber</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 rounded border transition ${
                  isDark ? 'bg-[#2a2a2d] border-[#444444]' : 'bg-[#f4f4f4] border-[#cccccc]'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useRef } from 'react';
import { X, Play, MonitorPlay, Film, Sparkles } from 'lucide-react';
import { FloatingVideoBar } from './FloatingVideoBar';
import type { FormatOption, IDMSettings } from '../types';

interface MediaSnifferModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  onClose: () => void;
  onCaptureVideo: (videoUrl: string, format: FormatOption) => void;
}

export const MediaSnifferModal: React.FC<MediaSnifferModalProps> = ({
  isOpen,
  settings,
  onClose,
  onCaptureVideo,
}) => {
  const isDark = settings.theme === 'windows-dark';
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4 select-none">
      <div
        className={`w-full max-w-3xl rounded shadow-2xl border text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
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
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>IDM Browser Media Sniffer Demo Studio</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Video Player Area with IDM floating button overlay */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Film className="w-4 h-4 text-blue-500" />
                <span>Web Browser Video Integration Simulation</span>
              </h3>
              <p className="text-gray-500 text-[11px]">
                Notice the iconic IDM floating download panel hovering right on top of the video player!
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[11px] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Stream Sniffer Active
            </span>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-black aspect-video border border-gray-400 shadow-inner group">
            {/* The Floating IDM Bar placed right on the video player top right! */}
            <div className="absolute top-3 right-3 z-30">
              <FloatingVideoBar
                onCaptureVideo={(url, fmt) => {
                  onCaptureVideo(url, fmt);
                  onClose();
                }}
                isOpen={true}
                onToggle={() => {}}
              />
            </div>

            <video
              ref={videoRef}
              controls
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-700 text-[11px]">
            <span className="text-gray-500">
              Click the floating blue <strong>"Download this video with SDM ▾"</strong> button to capture this video!
            </span>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded border font-semibold ${
                isDark ? 'bg-[#333333] hover:bg-[#3d3d3d]' : 'bg-[#e1e1e1] hover:bg-[#eaeaea]'
              }`}
            >
              Close Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

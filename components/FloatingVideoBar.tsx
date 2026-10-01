import React, { useState } from 'react';
import { Download, ChevronDown, Film, Play, Sparkles } from 'lucide-react';
import { MOCK_FORMATS } from '../constants';
import type { FormatOption } from '../types';

interface FloatingVideoBarProps {
  onCaptureVideo: (videoUrl: string, format: FormatOption) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const FloatingVideoBar: React.FC<FloatingVideoBarProps> = ({
  onCaptureVideo,
  isOpen,
  onToggle,
}) => {
  const [showFormats, setShowFormats] = useState(false);
  const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  const handleSelectFormat = (fmt: FormatOption) => {
    setShowFormats(false);
    onCaptureVideo(sampleVideoUrl, fmt);
  };

  return (
    <div className="relative">
      {/* Floating IDM Video Sniffer Button */}
      <div className="relative inline-block z-40">
        <button
          onClick={() => setShowFormats(!showFormats)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-md bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 text-white text-xs font-bold shadow-xl border border-blue-400 hover:brightness-110 active:brightness-95 select-none transition-all animate-pulse-soft"
          title="IDM Video Download Panel (Sniffer)"
        >
          <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <Download className="w-2.5 h-2.5 text-white" />
          </div>
          <span>Download this video with SDM</span>
          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
        </button>

        {/* Dropdown with video formats */}
        {showFormats && (
          <div className="absolute right-0 top-full mt-0 w-64 rounded-b-md shadow-2xl bg-[#ffffff] dark:bg-[#252526] border border-blue-400 dark:border-[#444444] text-[#222222] dark:text-[#e0e0e0] py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span>Available Streams</span>
              <span className="text-emerald-500 font-mono">Captured</span>
            </div>
            {MOCK_FORMATS.map(fmt => (
              <button
                key={fmt.id}
                onClick={() => handleSelectFormat(fmt)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-[#094771] hover:text-blue-600 dark:hover:text-white transition text-left"
              >
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-semibold">{fmt.quality}</span>
                </div>
                <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{fmt.size}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Download } from 'lucide-react';

interface FloatingVideoBarProps {
  onCaptureVideo: (videoUrl: string) => void;
}

export const FloatingVideoBar: React.FC<FloatingVideoBarProps> = ({
  onCaptureVideo,
}) => {
  const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="relative">
      <div className="relative inline-block z-40">
        <button
          onClick={() => onCaptureVideo(sampleVideoUrl)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-md bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 text-white text-xs font-bold shadow-xl border border-blue-400 hover:brightness-110 active:brightness-95 select-none transition-all animate-pulse-soft"
          title="Download the sample video file"
        >
          <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <Download className="w-2.5 h-2.5 text-white" />
          </div>
          <span>Download sample video</span>
        </button>
      </div>
    </div>
  );
};

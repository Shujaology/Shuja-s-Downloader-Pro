import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  Sparkles,
  FileCheck,
  Clock
} from 'lucide-react';
import type { DownloadCategory, IDMSettings } from '../types';
import type { MediaFormat } from '../types';
import { detectCategory } from '../constants';
import { generateVideoSummary } from '../services/geminiService';
import { isSupportedMediaUrl } from '../services/mediaUrls';

interface DownloadInfoModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  url: string;
  onClose: () => void;
  onStartDownload: (info: {
    title: string;
    url: string;
    category: Exclude<DownloadCategory, 'all'>;
    savePath: string;
    totalBytes: number;
    summary?: string;
    thumbnailUrl?: string;
    mediaExtractor?: boolean;
    mediaFormatId?: string;
    startImmediately: boolean;
  }) => void;
}

export const DownloadInfoModal: React.FC<DownloadInfoModalProps> = ({
  isOpen,
  settings,
  url,
  onClose,
  onStartDownload,
}) => {
  const isDark = settings.theme === 'windows-dark';

  const [category, setCategory] = useState<Exclude<DownloadCategory, 'all'>>('programs');
  const [filename, setFilename] = useState('');
  const [isMediaLink, setIsMediaLink] = useState(false);
  const [isPlatformPage, setIsPlatformPage] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [mediaFormats, setMediaFormats] = useState<MediaFormat[]>([]);
  const [selectedMediaFormat, setSelectedMediaFormat] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isInspectingMedia, setIsInspectingMedia] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const detected = detectCategory(url);
    setCategory(detected);
    setMediaFormats([]);
    setSelectedMediaFormat('');
    setMediaError(null);
    setAiSummary(null);
    setThumbnailUrl(undefined);
    setIsMediaLink(false);
    setIsPlatformPage(false);

    // Extract filename from URL
    try {
      const parsed = new URL(url);
      const isMediaPlatform = isSupportedMediaUrl(url);

      if (isMediaPlatform) {
        setIsMediaLink(true);
        setIsPlatformPage(true);
        setFilename('Extracting media information...');
        setIsInspectingMedia(true);
        fetch('/api/media/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }).then(async response => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || `Media inspection failed with HTTP ${response.status}.`);
          if (cancelled) return;
          setFilename(result.title || 'media-download');
          setThumbnailUrl(result.thumbnailUrl);
          setMediaFormats(result.formats || []);
          setSelectedMediaFormat(result.formats?.[0]?.formatId || '');
          setMediaError(result.formats?.length ? null : 'No downloadable formats were found for this media URL.');
        }).catch(error => {
          if (!cancelled) setMediaError(error instanceof Error ? error.message : 'Could not inspect this media URL.');
        }).finally(() => {
          if (!cancelled) setIsInspectingMedia(false);
        });
      } else {
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || 'downloaded_file.bin';
        const cleanName = decodeURIComponent(lastSegment.split('?')[0]);
        setFilename(cleanName);
        setIsMediaLink(cleanName.match(/\.(mp4|mkv|webm|avi|mp3|m4a|flac)$/i) !== null);

      }
    } catch {
      setFilename('download_file.bin');
    }
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const summary = await generateVideoSummary(filename);
      setAiSummary(summary);
    } catch {
      setAiSummary('Summary generation failed. Check your Gemini API key and network connection.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleConfirm = (startImmediately: boolean) => {
    onStartDownload({
      title: filename,
      url,
      category,
      savePath: 'Browser Downloads folder',
      totalBytes: 0,
      summary: aiSummary || undefined,
      thumbnailUrl,
      mediaExtractor: isPlatformPage,
      mediaFormatId: selectedMediaFormat || undefined,
      startImmediately,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 select-none">
      <div
        className={`w-full max-w-xl rounded shadow-2xl border text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
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
            <FileCheck className="w-3.5 h-3.5" />
            <span>Download File Info</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5">
          {/* URL Box */}
          <div className="flex items-start gap-2">
            <label className="w-20 pt-1 font-semibold text-gray-600 dark:text-gray-400">URL:</label>
            <div className="flex-1 font-mono text-[11px] truncate bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-700">
              {url}
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold text-gray-600 dark:text-gray-400">Category:</label>
            <select
              value={category}
              onChange={e => {
                const cat = e.target.value as Exclude<DownloadCategory, 'all'>;
                setCategory(cat);
              }}
              className={`flex-1 px-2 py-1 rounded border outline-none text-xs ${
                isDark ? 'bg-[#1e1e1e] border-[#444444] text-white' : 'bg-white border-[#abadb3] text-black'
              }`}
            >
              <option value="compressed">Compressed (.zip, .rar, .7z, .iso)</option>
              <option value="documents">Documents (.pdf, .doc, .txt, .xls)</option>
              <option value="music">Music (.mp3, .wav, .flac, .m4a)</option>
              <option value="programs">Programs (.exe, .msi, .apk, .dmg)</option>
              <option value="video">Video (.mp4, .mkv, .webm, .mov)</option>
            </select>
          </div>

          {/* Save As (File Name & Directory) */}
          <div className="flex items-center gap-2">
            <label className="w-20 font-semibold text-gray-600 dark:text-gray-400">Save As:</label>
            <div className="flex-1">
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                className={`w-full px-2.5 py-1 rounded border outline-none font-semibold text-xs ${
                  isDark ? 'bg-[#1e1e1e] border-[#444444] text-white' : 'bg-white border-[#abadb3] text-black'
                }`}
              />
            </div>
          </div>

          {/* Browser-managed destination */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
            <span className="w-20">Location:</span>
            <span className="truncate">Downloads\ShujaDownloader</span>
          </div>

          {/* Media / Video Stream Selector */}
          {isMediaLink && (
            <div className={`p-3 rounded border space-y-2.5 ${isDark ? 'bg-[#1e1e1e] border-[#383838]' : 'bg-[#f7f9fc] border-[#d0dbe5]'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Film className="w-3.5 h-3.5" />
                  Media Stream Quality Detected:
                </span>
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail"
                    className="w-16 h-10 object-cover rounded border border-gray-400"
                  />
                )}
              </div>

              <div className="text-[11px] text-gray-600 dark:text-gray-400">
                {isInspectingMedia ? 'Loading formats using yt-dlp...' : isPlatformPage ? 'Select a format to download using yt-dlp.' : 'Direct media file detected; it will be downloaded as a regular file.'}
              </div>
              {mediaError && <div role="alert" className="text-[11px] rounded border border-red-300 bg-red-50 p-2 text-red-700">{mediaError}</div>}
              {mediaFormats.length > 0 && (
                <select
                  aria-label="Media download format"
                  value={selectedMediaFormat}
                  onChange={event => setSelectedMediaFormat(event.target.value)}
                  className={`w-full px-2 py-1 rounded border outline-none text-xs ${
                    isDark ? 'bg-[#252526] border-[#444444] text-white' : 'bg-white border-[#abadb3] text-black'
                  }`}
                >
                  {mediaFormats.map(format => (
                    <option key={format.formatId} value={format.formatId}>
                      {format.resolution} · {format.extension.toUpperCase()}
                      {format.size ? ` · ${(format.size / 1048576).toFixed(1)} MB` : ''}
                      {format.note ? ` · ${format.note}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Gemini AI Summary Integration */}
              <div className="pt-1 border-t border-gray-200 dark:border-gray-800">
                {aiSummary ? (
                  <div className="text-[11px] p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                    <div className="font-bold flex items-center gap-1 mb-1 text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-3 h-3" />
                      Gemini Smart AI Summary:
                    </div>
                    <p className="italic">{aiSummary}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingAi}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isGeneratingAi ? 'Analyzing video with Gemini AI...' : 'Generate Gemini AI summary for this video'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Details Bar */}
          <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded bg-black/5 dark:bg-white/5 border border-gray-300 dark:border-gray-700">
            <div>
              <span className="text-gray-500">File size: </span>
              <strong>Detected on connect</strong>
            </div>
            <div>
              <span className="text-gray-500">Resume capability: </span>
              <strong className="text-gray-600 dark:text-gray-400">
                If supported by server
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700">
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{isMediaLink ? 'Video/audio extraction via yt-dlp' : 'Local disk stream with parallel ranges when supported'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPlatformPage && (!selectedMediaFormat || isInspectingMedia || !!mediaError)}
                onClick={() => handleConfirm(true)}
                className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#107c41] to-[#0b5c30] text-white hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm border border-[#084223] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Start Download</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirm(false)}
                className={`px-3 py-1.5 rounded border transition font-medium ${
                  isDark
                    ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d] text-white'
                    : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e9e9e9] text-black'
                }`}
              >
                Download Later
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
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

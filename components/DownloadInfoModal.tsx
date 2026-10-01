import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FolderOpen,
  Film,
  Sparkles,
  CheckCircle,
  FileCheck,
  Clock
} from 'lucide-react';
import type { DownloadCategory, FormatOption, IDMSettings } from '../types';
import { MOCK_FORMATS, detectCategory, formatBytes } from '../constants';
import { generateVideoSummary } from '../services/geminiService';

interface DownloadInfoModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  url: string;
  onClose: () => void;
  onStartDownload: (info: {
    title: string;
    url: string;
    category: DownloadCategory;
    savePath: string;
    totalBytes: number;
    format?: FormatOption;
    summary?: string;
    thumbnailUrl?: string;
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

  const [category, setCategory] = useState<DownloadCategory>('programs');
  const [filename, setFilename] = useState('');
  const [saveDir, setSaveDir] = useState('');
  const [fileSize, setFileSize] = useState<number>(154200000);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('v_mp4_1080p');
  const [isMediaLink, setIsMediaLink] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (!url) return;

    const detected = detectCategory(url);
    setCategory(detected);

    // Default directory based on category
    const defaultDir = settings.categoriesDirs[detected as keyof typeof settings.categoriesDirs] || settings.saveDirectory;
    setSaveDir(defaultDir);

    // Extract filename from URL
    try {
      const parsed = new URL(url);
      const isYoutube = parsed.hostname.includes('youtube.com') || parsed.hostname === 'youtu.be';

      if (isYoutube) {
        setIsMediaLink(true);
        let videoId = 'dQw4w9WgXcQ';
        if (parsed.searchParams.get('v')) {
          videoId = parsed.searchParams.get('v')!;
        } else if (parsed.hostname === 'youtu.be') {
          videoId = parsed.pathname.slice(1);
        }
        setFilename(`YouTube_Video_${videoId}.mp4`);
        setThumbnailUrl(`https://i3.ytimg.com/vi/${videoId}/hqdefault.jpg`);
        setFileSize(154200000);
      } else {
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || 'downloaded_file.bin';
        const cleanName = decodeURIComponent(lastSegment.split('?')[0]);
        setFilename(cleanName);
        setIsMediaLink(cleanName.match(/\.(mp4|mkv|webm|avi|mp3|m4a|flac)$/i) !== null);

        // Estimate size if sample
        if (cleanName.endsWith('.iso')) setFileSize(4800000000);
        else if (cleanName.endsWith('.zip')) setFileSize(425000000);
        else if (cleanName.endsWith('.pdf')) setFileSize(24500000);
        else if (cleanName.endsWith('.mp3')) setFileSize(6400000);
        else if (cleanName.endsWith('.exe')) setFileSize(98500000);
        else setFileSize(75000000);
      }
    } catch {
      setFilename('download_file.bin');
      setFileSize(50000000);
    }
  }, [url, settings]);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const summary = await generateVideoSummary(filename);
      setAiSummary(summary);
    } catch {
      setAiSummary('High quality stream capture ready for ultra-fast multi-threaded download.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleConfirm = (startImmediately: boolean) => {
    const selectedFormat = MOCK_FORMATS.find(f => f.id === selectedFormatId);
    onStartDownload({
      title: filename,
      url,
      category,
      savePath: `${saveDir}\\${filename}`,
      totalBytes: fileSize,
      format: selectedFormat,
      summary: aiSummary || undefined,
      thumbnailUrl,
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
                const cat = e.target.value as DownloadCategory;
                setCategory(cat);
                if (settings.categoriesDirs[cat as keyof typeof settings.categoriesDirs]) {
                  setSaveDir(settings.categoriesDirs[cat as keyof typeof settings.categoriesDirs]);
                }
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
            <div className="flex-1 flex gap-1.5">
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                className={`flex-1 px-2.5 py-1 rounded border outline-none font-semibold text-xs ${
                  isDark ? 'bg-[#1e1e1e] border-[#444444] text-white' : 'bg-white border-[#abadb3] text-black'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  const newDir = prompt('Enter folder path to save to:', saveDir);
                  if (newDir) setSaveDir(newDir);
                }}
                className={`px-3 py-1 rounded border text-xs font-bold transition flex items-center gap-1 ${
                  isDark
                    ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d]'
                    : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e9e9e9]'
                }`}
                title="Browse destination folder"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>...</span>
              </button>
            </div>
          </div>

          {/* Destination Path Preview */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
            <span className="w-20">Path:</span>
            <span className="truncate">{saveDir}\{filename}</span>
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

              <div className="flex items-center gap-2">
                <label className="w-20 font-semibold text-gray-600 dark:text-gray-400">Quality:</label>
                <select
                  value={selectedFormatId}
                  onChange={e => setSelectedFormatId(e.target.value)}
                  className={`flex-1 px-2 py-1 rounded border outline-none font-semibold text-xs ${
                    isDark ? 'bg-[#252526] border-[#444444] text-white' : 'bg-white border-[#abadb3] text-black'
                  }`}
                >
                  {MOCK_FORMATS.map(fmt => (
                    <option key={fmt.id} value={fmt.id}>
                      {fmt.quality} ({fmt.container}) — {fmt.size}
                    </option>
                  ))}
                </select>
              </div>

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
              <strong>{formatBytes(fileSize)}</strong>
            </div>
            <div>
              <span className="text-gray-500">Resume capability: </span>
              <strong className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 inline-flex">
                <CheckCircle className="w-3 h-3 inline" /> Yes
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700">
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Multi-threaded (8 segments)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleConfirm(true)}
                className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#107c41] to-[#0b5c30] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#084223] flex items-center gap-1.5"
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

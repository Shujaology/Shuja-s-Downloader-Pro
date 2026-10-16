import React, { useEffect, useState } from 'react';
import { X, Globe, ArrowRight, FolderSearch, Loader2, AlertTriangle, ListChecks } from 'lucide-react';
import type { GrabbedFile, GrabResult, IDMSettings } from '../types';

interface SiteGrabberModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  onClose: () => void;
  onDownloadFiles: (files: GrabbedFile[]) => void;
}

const grabOptions = [
  { id: 'video', label: 'All video files (.mp4, .mkv, .avi, .webm)' },
  { id: 'audio', label: 'All audio/music files (.mp3, .wav, .flac)' },
  { id: 'documents', label: 'All documents and archives (.pdf, .doc, .zip)' },
  { id: 'all', label: 'All media and links found on website' },
];

const kindColor: Record<GrabbedFile['kind'], string> = {
  video: 'text-rose-400',
  audio: 'text-emerald-400',
  document: 'text-sky-400',
  archive: 'text-amber-400',
  program: 'text-indigo-400',
};

export const SiteGrabberModal: React.FC<SiteGrabberModalProps> = ({
  isOpen,
  settings,
  onClose,
  onDownloadFiles,
}) => {
  const isDark = settings.theme === 'windows-dark';
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('New Project');
  const [startUrl, setStartUrl] = useState('https://archive.org/details/movies');
  const [grabType, setGrabType] = useState('video');
  const [exploreDepth, setExploreDepth] = useState(2);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [result, setResult] = useState<GrabResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) return;
    setStep(1);
    setScanning(false);
    setScanError('');
    setResult(null);
    setSelected(new Set());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = async () => {
    setScanning(true);
    setScanError('');
    try {
      const response = await fetch('/api/grab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: startUrl, depth: exploreDepth, type: grabType }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `The grabber returned HTTP ${response.status}.`);
      const data = payload as GrabResult;
      setResult(data);
      setSelected(new Set(data.files.map(file => file.url)));
      setStep(3);
    } catch (error) {
      setResult(null);
      setSelected(new Set());
      setScanError(error instanceof Error ? error.message : 'The grabber could not read that page.');
    } finally {
      setScanning(false);
    }
  };

  const toggleFile = (url: string) => {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleDownloadSelected = () => {
    const files = (result?.files ?? []).filter(file => selected.has(file.url));
    if (!files.length) return;
    onDownloadFiles(files);
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
            <span>IDM Site Grabber Wizard - Step {step} of 3</span>
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
                {grabOptions.map(opt => (
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

              {scanError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-2.5 rounded border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300 text-[11px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  Found {result?.filesFound ?? 0} file{result?.filesFound === 1 ? '' : 's'} across{' '}
                  {result?.pagesVisited ?? 0} page{result?.pagesVisited === 1 ? '' : 's'}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set((result?.files ?? []).map(file => file.url)))}
                    className={`px-2 py-1 rounded border text-[10px] font-semibold transition ${
                      isDark ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d]' : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#eaeaea]'
                    }`}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className={`px-2 py-1 rounded border text-[10px] font-semibold transition ${
                      isDark ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d]' : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#eaeaea]'
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {result?.truncated && (
                <div className="flex items-start gap-2 p-2.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  <span>
                    The scan hit its safety limits and may have stopped early. Use a smaller depth or a
                    narrower file type to see more.
                  </span>
                </div>
              )}

              <div
                className={`max-h-64 overflow-y-auto rounded border ${
                  isDark ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-[#c9c9c9] bg-white'
                }`}
              >
                {result?.files.length ? (
                  result.files.map(file => (
                    <label
                      key={file.url}
                      title={file.url}
                      className={`flex items-center gap-2 px-2.5 py-1.5 border-b cursor-pointer ${
                        isDark ? 'border-[#333333] hover:bg-[#2a2d2e]' : 'border-[#e4e4e4] hover:bg-[#eef6fc]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(file.url)}
                        onChange={() => toggleFile(file.url)}
                      />
                      <span className={`font-mono text-[10px] font-bold uppercase w-14 flex-shrink-0 ${kindColor[file.kind]}`}>
                        {file.extension || 'file'}
                      </span>
                      <span className="flex-1 truncate text-[11px]">{file.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">L{file.depth}</span>
                    </label>
                  ))
                ) : (
                  <div className="p-4 text-center text-[11px] text-gray-500">
                    No matching files were found. Try a deeper scan or a different file type.
                  </div>
                )}
              </div>

              {!!result?.warnings.length && (
                <details className="text-[10px] text-gray-500">
                  <summary className="cursor-pointer font-semibold">
                    {result.warnings.length} page(s) could not be read
                  </summary>
                  <ul className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                    {result.warnings.map(warning => (
                      <li key={warning} className="truncate" title={warning}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700">
            <span className="text-[10px] text-gray-400">
              {step === 1
                ? 'Step 1 of 3 - Project'
                : step === 2
                ? 'Step 2 of 3 - Criteria'
                : 'Step 3 of 3 - Results'}
            </span>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(current => Math.max(1, current - 1))}
                  className={`px-3 py-1.5 rounded border transition ${
                    isDark ? 'bg-[#333333] border-[#444444]' : 'bg-[#e1e1e1] border-[#adadad]'
                  }`}
                >
                  Back
                </button>
              )}

              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#0078d4] to-[#005a9e] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#004578] flex items-center gap-1"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={scanning || !startUrl.trim()}
                  className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#107c41] to-[#0b5c30] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#084223] flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderSearch className="w-3.5 h-3.5" />
                  )}
                  <span>{scanning ? 'Scanning...' : 'Start Scan'}</span>
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  disabled={selected.size === 0}
                  className="px-4 py-1.5 font-bold rounded bg-gradient-to-b from-[#107c41] to-[#0b5c30] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#084223] flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>
                    Download {selected.size} file{selected.size === 1 ? '' : 's'}
                  </span>
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

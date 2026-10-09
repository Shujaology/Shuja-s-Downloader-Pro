import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Pause, Play, RotateCcw, Trash2, X } from 'lucide-react';
import type { DownloadItem } from '../types';
import { formatBytes, formatDate, formatDuration, formatSpeed, hostOf } from '../lib/format';
import { CATEGORY_META, Button, FileIcon, IconButton, ProgressBar, StatusPill, isActive, progressOf } from './ui';
import { SegmentMap } from './SegmentMap';

interface DetailsPanelProps {
  item: DownloadItem;
  onClose: () => void;
  onPrimaryAction: (item: DownloadItem) => void;
  onRestart: (item: DownloadItem) => void;
  onRemove: (item: DownloadItem) => void;
}

function Stat({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={`mt-0.5 truncate text-[13px] font-medium ${mono ? 'tabular' : ''}`}>{value}</div>
    </div>
  );
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ item, onClose, onPrimaryAction, onRestart, onRemove }) => {
  const [copied, setCopied] = useState(false);
  const progress = progressOf(item);
  const active = isActive(item);
  const avgSpeed = item.elapsedMs > 0 ? item.receivedBytes / (item.elapsedMs / 1000) : 0;
  const activeConnections = item.segments.filter(s => s.active).length;

  const copy = () => {
    navigator.clipboard?.writeText(item.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const primary = active || item.status === 'queued'
    ? { label: 'Pause', icon: Pause }
    : item.status === 'completed'
      ? { label: 'Save file', icon: Download }
      : item.status === 'error'
        ? { label: 'Retry', icon: RotateCcw }
        : { label: item.receivedBytes > 0 ? 'Resume' : 'Start', icon: Play };

  return (
    <aside className="animate-fade-in flex w-[380px] shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-100 px-4 dark:border-zinc-900">
        <span className="text-xs font-medium text-zinc-500">Details</span>
        <IconButton icon={X} label="Close details" size="sm" onClick={onClose} />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex gap-3">
          <FileIcon category={item.category} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] leading-snug font-semibold break-words">{item.filename}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusPill status={item.status} />
              <span className="text-xs text-zinc-500">{CATEGORY_META[item.category].label}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="tabular text-2xl font-semibold tracking-tight">{progress == null ? '—' : `${progress.toFixed(1)}%`}</span>
            <span className="tabular text-xs text-zinc-500">
              {formatBytes(item.receivedBytes)} / {formatBytes(item.totalBytes)}
            </span>
          </div>
          <ProgressBar item={item} className="h-2" />
          {item.error && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300">{item.error}</div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
          <Stat label="Speed" value={active ? formatSpeed(item.speed) : '—'} />
          <Stat label="Time left" value={active ? formatDuration(item.eta) : '—'} />
          <Stat label="Connections" value={active ? `${activeConnections} / ${item.resumable ? item.connections : 1}` : item.resumable ? item.connections : 1} />
          <Stat label="Avg speed" value={formatSpeed(avgSpeed)} />
          <Stat label="Active time" value={item.elapsedMs ? formatDuration(item.elapsedMs / 1000) : '—'} />
          <Stat label="Resumable" value={item.probed ? (item.resumable ? 'Yes' : 'No') : '—'} mono={false} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Connection map</span>
            <span className="text-[11px] text-zinc-500">{item.segments.length} segment{item.segments.length === 1 ? '' : 's'}</span>
          </div>
          <SegmentMap item={item} />
          {item.segments.length > 1 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="tabular w-full text-xs">
                <thead className="bg-zinc-50 text-[11px] text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">#</th>
                    <th className="px-3 py-1.5 text-right font-medium">Received</th>
                    <th className="px-3 py-1.5 text-right font-medium">Size</th>
                    <th className="px-3 py-1.5 text-right font-medium">Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {item.segments.map(seg => {
                    const size = seg.end - seg.start + 1;
                    const pct = item.status === 'completed' ? 100 : Math.min(100, (seg.received / size) * 100);
                    return (
                      <tr key={seg.id}>
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${pct >= 100 ? 'bg-emerald-500' : seg.active ? 'animate-pulse bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                            {seg.id + 1}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right">{pct.toFixed(0)}%</td>
                        <td className="px-3 py-1.5 text-right text-zinc-500">{formatBytes(size)}</td>
                        <td className="px-3 py-1.5 text-right">{seg.active ? formatSpeed(seg.speed) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-zinc-500">Source</div>
            <div className="mt-1 flex items-center gap-1 rounded-lg bg-zinc-50 py-1 pr-1 pl-2.5 dark:bg-zinc-900">
              <span className="flex-1 truncate font-mono text-[11px] text-zinc-600 dark:text-zinc-400" title={item.url}>
                {item.url}
              </span>
              <IconButton icon={copied ? Check : Copy} label="Copy link" size="sm" onClick={copy} />
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                title="Open link"
                className="inline-flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Host" value={hostOf(item.url)} mono={false} />
            <Stat label="Type" value={item.mimeType ?? '—'} mono={false} />
            <Stat label="Added" value={formatDate(item.addedAt)} mono={false} />
            <Stat label="Completed" value={formatDate(item.completedAt)} mono={false} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-zinc-100 p-4 dark:border-zinc-900">
        <Button
          variant="primary"
          icon={primary.icon}
          className="flex-1"
          onClick={() => onPrimaryAction(item)}
          disabled={item.status === 'completed' && item.fileAvailable === false}
        >
          {primary.label}
        </Button>
        <IconButton icon={RotateCcw} label="Restart from scratch" onClick={() => onRestart(item)} />
        <IconButton icon={Trash2} label="Remove" onClick={() => onRemove(item)} className="hover:!bg-red-500/10 hover:!text-red-600" />
      </div>
    </aside>
  );
};

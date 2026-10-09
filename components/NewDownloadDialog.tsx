import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardPaste, Download, Link2, ListPlus, Loader2, Zap } from 'lucide-react';
import type { ProbeResult } from '../types';
import { detectCategory, extractUrls, formatBytes } from '../lib/format';
import { SAMPLE_LINKS } from '../lib/samples';
import { probeUrl } from '../services/downloadManager';
import { Button, Dialog, Field, FileIcon, cn, inputClass } from './ui';

interface NewDownloadDialogProps {
  open: boolean;
  initialText: string;
  defaultConnections: number;
  onClose: () => void;
  onAdd: (probe: ProbeResult, options: { filename: string; connections: number; start: boolean }) => void;
  onAddMany: (urls: string[], start: boolean) => void;
}

type ProbeState = { status: 'idle' } | { status: 'loading' } | { status: 'ok'; result: ProbeResult } | { status: 'error'; message: string };

const CONNECTION_OPTIONS = [1, 2, 4, 8, 16, 32];

export const NewDownloadDialog: React.FC<NewDownloadDialogProps> = ({ open, initialText, defaultConnections, onClose, onAdd, onAddMany }) => {
  const [text, setText] = useState('');
  const [probe, setProbe] = useState<ProbeState>({ status: 'idle' });
  const [filename, setFilename] = useState('');
  const [connections, setConnections] = useState(defaultConnections);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setConnections(defaultConnections);
    } else {
      setProbe({ status: 'idle' });
      setFilename('');
    }
  }, [open, initialText, defaultConnections]);

  const urls = useMemo(() => extractUrls(text), [text]);
  const single = urls.length === 1 ? urls[0] : null;

  useEffect(() => {
    if (!open || !single) {
      setProbe({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setProbe({ status: 'loading' });
    const timer = setTimeout(() => {
      probeUrl(single, controller.signal)
        .then(result => {
          setProbe({ status: 'ok', result });
          setFilename(result.filename);
        })
        .catch(err => {
          if (controller.signal.aborted) return;
          setProbe({
            status: 'error',
            message: err instanceof TypeError ? "This server doesn't allow downloads from the browser (CORS), or it couldn't be reached." : String(err.message ?? err),
          });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [single, open]);

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(prev => (prev ? `${prev.trim()}\n${clip}` : clip));
    } catch {
      /* permission denied */
    }
  };

  const submit = (start: boolean) => {
    if (single && probe.status === 'ok') {
      onAdd(probe.result, { filename: filename || probe.result.filename, connections, start });
    } else if (urls.length > 0) {
      onAddMany(urls, start);
    }
    onClose();
  };

  const canSubmit = urls.length > 1 || (single != null && probe.status === 'ok');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New download"
      description="Paste one link, or several (one per line) to add them in bulk."
      icon={Link2}
      width="max-w-xl"
      footer={
        <>
          <span className="mr-auto text-xs text-zinc-500">{urls.length > 1 ? `${urls.length} links detected` : ' '}</span>
          <Button icon={ListPlus} disabled={!canSubmit} onClick={() => submit(false)}>
            Add paused
          </Button>
          <Button variant="primary" icon={Download} disabled={!canSubmit} onClick={() => submit(true)}>
            Download now
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) submit(true);
            }}
            rows={urls.length > 1 ? 5 : 2}
            placeholder="https://example.com/file.zip"
            className={cn(inputClass, 'resize-none pr-24 font-mono text-[13px]')}
          />
          <Button size="sm" variant="ghost" icon={ClipboardPaste} className="absolute top-1.5 right-1.5" onClick={paste}>
            Paste
          </Button>
        </div>

        {!text && (
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_LINKS.slice(0, 4).map(s => (
              <button
                key={s.url}
                type="button"
                onClick={() => setText(s.url)}
                className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-blue-300"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {single && probe.status === 'loading' && (
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 p-3.5 text-sm text-zinc-500 dark:border-zinc-800">
            <Loader2 className="size-4 animate-spin" /> Checking link…
          </div>
        )}

        {single && probe.status === 'error' && (
          <div className="flex gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">Can’t download this link</div>
              <div className="mt-0.5 text-xs opacity-90">{probe.message}</div>
            </div>
          </div>
        )}

        {single && probe.status === 'ok' && (
          <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <FileIcon category={detectCategory(filename || probe.result.filename, probe.result.mimeType)} />
              <div className="min-w-0 flex-1">
                <div className="tabular text-sm font-medium">{formatBytes(probe.result.totalBytes)}</div>
                <div className="truncate text-xs text-zinc-500">{probe.result.mimeType ?? 'Unknown type'}</div>
              </div>
              {probe.result.resumable ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <Zap className="size-3" /> Multi-connection · resumable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <CheckCircle2 className="size-3" /> Single connection
                </span>
              )}
            </div>
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <Field label="Save as">
                <input value={filename} onChange={e => setFilename(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Connections">
                <select
                  value={probe.result.resumable ? connections : 1}
                  disabled={!probe.result.resumable}
                  onChange={e => setConnections(Number(e.target.value))}
                  className={cn(inputClass, 'disabled:opacity-60')}
                >
                  {CONNECTION_OPTIONS.map(n => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'connection' : 'connections'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

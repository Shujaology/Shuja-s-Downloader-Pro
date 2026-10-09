import type { DownloadItem, ProbeResult, Settings } from '../types';
import { detectCategory, ensureExtension, filenameFromUrl, parseContentDisposition, sanitizeFilename } from '../lib/format';
import { isSegmentDone, planSegments, remainingBytes, splitLargestSegment } from '../lib/segments';
import { Throttle, sleep } from './throttle';
import { assembleFile, deleteParts, getParts, putPart } from './partStore';

const STORAGE_KEY = 'sdp_downloads_v2';
const FLUSH_BYTES = 4 * 1024 * 1024;
const TICK_MS = 500;
const MAX_RETRIES = 4;

export interface DownloadEvents {
  completed?: (item: DownloadItem) => void;
  failed?: (item: DownloadItem) => void;
}

interface Runtime {
  work: DownloadItem;
  controller: AbortController;
  finished: Promise<void>;
  tickBytes: number;
  segTickBytes: Map<number, number>;
  lastTick: number;
  failure?: unknown;
}

class AbortedError extends Error {}

function friendlyError(err: unknown): string {
  if (err instanceof TypeError) {
    return "Couldn't reach the server, or it doesn't allow downloads from the browser (CORS).";
  }
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    return 'Not enough browser storage for this file. Free up space and retry.';
  }
  return err instanceof Error ? err.message : String(err);
}

export async function probeUrl(url: string, signal?: AbortSignal): Promise<ProbeResult> {
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Only http(s) links are supported.');

  const res = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal, cache: 'no-store' });
  res.body?.cancel().catch(() => {});
  if (!res.ok) throw new Error(`Server responded with HTTP ${res.status}.`);

  const resumable = res.status === 206;
  let totalBytes: number | null = null;
  const contentRange = res.headers.get('Content-Range');
  if (resumable && contentRange) {
    const total = Number(contentRange.split('/')[1]);
    if (Number.isFinite(total)) totalBytes = total;
  } else if (!resumable) {
    const len = Number(res.headers.get('Content-Length'));
    if (len > 0) totalBytes = len;
  }
  if (resumable && totalBytes == null) {
    const head = await fetch(url, { method: 'HEAD', signal, cache: 'no-store' }).catch(() => null);
    const len = Number(head?.headers.get('Content-Length'));
    if (len > 0) totalBytes = len;
  }

  const mimeType = res.headers.get('Content-Type')?.split(';')[0].trim() || undefined;
  const filename = ensureExtension(
    sanitizeFilename(parseContentDisposition(res.headers.get('Content-Disposition')) || filenameFromUrl(res.url || url)),
    mimeType,
  );

  return { url, finalUrl: res.url || url, filename, totalBytes, resumable: resumable && totalBytes != null, mimeType };
}

export function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

export class DownloadManager {
  private items: DownloadItem[] = [];
  private runtimes = new Map<string, Runtime>();
  private listeners = new Set<() => void>();
  private throttle = new Throttle();
  private ticker: number | null = null;
  private lastPersist = 0;
  private settings: Pick<Settings, 'connections' | 'maxConcurrent' | 'autoSave'> = {
    connections: 8,
    maxConcurrent: 3,
    autoSave: true,
  };
  events: DownloadEvents = {};

  constructor() {
    this.items = this.load();
    void this.reconcile();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.items;

  configure(settings: Settings) {
    this.settings = settings;
    this.throttle.setRate(settings.speedLimitEnabled ? settings.speedLimitKBps * 1024 : 0);
    this.pump();
  }

  get activeCount() {
    return this.runtimes.size;
  }

  add(
    probe: ProbeResult,
    options: { filename?: string; connections?: number; start: boolean; probed?: boolean },
  ): DownloadItem {
    const filename = sanitizeFilename(options.filename || probe.filename);
    const item: DownloadItem = {
      id: `dl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      url: probe.finalUrl || probe.url,
      filename,
      category: detectCategory(filename, probe.mimeType),
      mimeType: probe.mimeType,
      totalBytes: probe.totalBytes,
      receivedBytes: 0,
      status: 'paused',
      resumable: probe.resumable,
      probed: options.probed ?? true,
      connections: options.connections ?? this.settings.connections,
      segments: planSegments(probe.totalBytes, options.connections ?? this.settings.connections, probe.resumable),
      speed: 0,
      eta: null,
      addedAt: Date.now(),
      elapsedMs: 0,
    };
    this.items = [item, ...this.items];
    this.emit(true);
    if (options.start) this.start(item.id);
    else this.patch(item.id, { status: 'paused' });
    return item;
  }

  /** Add a link that could not be probed yet; it is probed when it starts. */
  addUnprobed(url: string, start: boolean) {
    return this.add(
      { url, finalUrl: url, filename: filenameFromUrl(url), totalBytes: null, resumable: false },
      { start, probed: false },
    );
  }

  start(id: string) {
    const item = this.find(id);
    if (!item || this.runtimes.has(id) || item.status === 'completed') return;
    if (this.runtimes.size >= this.settings.maxConcurrent) {
      this.patch(id, { status: 'queued', error: undefined });
      return;
    }
    this.run(item);
  }

  async pause(id: string) {
    const rt = this.runtimes.get(id);
    if (!rt) {
      const item = this.find(id);
      if (item?.status === 'queued') this.patch(id, { status: 'paused' });
      return;
    }
    rt.controller.abort(new AbortedError('paused'));
    await rt.finished;
  }

  async remove(id: string) {
    await this.pause(id);
    this.items = this.items.filter(i => i.id !== id);
    this.emit(true);
    await deleteParts(id).catch(() => {});
    this.pump();
  }

  async restart(id: string) {
    await this.pause(id);
    const item = this.find(id);
    if (!item) return;
    await deleteParts(id).catch(() => {});
    this.patch(id, {
      status: 'paused',
      receivedBytes: 0,
      error: undefined,
      completedAt: undefined,
      elapsedMs: 0,
      fileAvailable: undefined,
      segments: planSegments(item.totalBytes, item.connections, item.resumable),
    });
    this.start(id);
  }

  startAll() {
    for (const item of this.items) {
      if (['paused', 'error', 'queued'].includes(item.status)) this.start(item.id);
    }
  }

  async pauseAll() {
    for (const item of this.items) if (item.status === 'queued') this.patch(item.id, { status: 'paused' });
    await Promise.all([...this.runtimes.keys()].map(id => this.pause(id)));
  }

  async clearCompleted() {
    const done = this.items.filter(i => i.status === 'completed');
    this.items = this.items.filter(i => i.status !== 'completed');
    this.emit(true);
    await Promise.all(done.map(i => deleteParts(i.id).catch(() => {})));
  }

  async getFile(id: string): Promise<Blob | null> {
    const item = this.find(id);
    if (!item || item.status !== 'completed') return null;
    const blob = await assembleFile(id, item.mimeType);
    if (item.totalBytes != null && blob.size !== item.totalBytes) return null;
    return blob;
  }

  async saveToDisk(id: string): Promise<boolean> {
    const item = this.find(id);
    const blob = await this.getFile(id);
    if (!item || !blob) {
      this.patch(id, { fileAvailable: false });
      return false;
    }
    saveBlob(blob, item.filename);
    return true;
  }

  // ---- internals ----------------------------------------------------------

  private find(id: string) {
    return this.items.find(i => i.id === id);
  }

  private patch(id: string, patch: Partial<DownloadItem>) {
    const rt = this.runtimes.get(id);
    if (rt) Object.assign(rt.work, patch);
    this.items = this.items.map(i => (i.id === id ? { ...i, ...patch } : i));
    this.emit(true);
  }

  private publish(work: DownloadItem) {
    const snapshot = { ...work, segments: work.segments.map(s => ({ ...s })) };
    this.items = this.items.map(i => (i.id === work.id ? snapshot : i));
  }

  private emit(persist = false) {
    if (persist || Date.now() - this.lastPersist > 3000) this.persist();
    for (const l of this.listeners) l();
  }

  private pump() {
    if (this.runtimes.size >= this.settings.maxConcurrent) return;
    const queued = this.items
      .filter(i => i.status === 'queued' && !this.runtimes.has(i.id))
      .sort((a, b) => a.addedAt - b.addedAt);
    for (const item of queued) {
      if (this.runtimes.size >= this.settings.maxConcurrent) break;
      this.run(item);
    }
  }

  private run(item: DownloadItem) {
    const work: DownloadItem = {
      ...item,
      segments: item.segments.map(s => ({ ...s, active: false, speed: 0 })),
      status: 'connecting',
      error: undefined,
      startedAt: item.startedAt ?? Date.now(),
    };
    const rt: Runtime = {
      work,
      controller: new AbortController(),
      finished: Promise.resolve(),
      tickBytes: 0,
      segTickBytes: new Map(),
      lastTick: performance.now(),
    };
    this.runtimes.set(item.id, rt);
    this.publish(work);
    this.emit(true);
    this.ensureTicker();
    rt.finished = this.execute(rt);
  }

  private async execute(rt: Runtime) {
    const { work, controller } = rt;
    const signal = controller.signal;
    try {
      if (!work.probed) {
        const probe = await probeUrl(work.url, signal);
        Object.assign(work, {
          filename: probe.filename,
          category: detectCategory(probe.filename, probe.mimeType),
          mimeType: probe.mimeType,
          totalBytes: probe.totalBytes,
          resumable: probe.resumable,
          probed: true,
          segments: planSegments(probe.totalBytes, work.connections, probe.resumable),
        });
      }
      if (!work.resumable) {
        await deleteParts(work.id);
        work.segments = planSegments(work.totalBytes, 1, false);
        work.receivedBytes = 0;
      }
      work.status = 'downloading';
      this.publish(work);
      this.emit(true);

      const workers = Math.max(1, work.resumable ? work.connections : 1);
      await Promise.all(Array.from({ length: workers }, () => this.worker(rt)));
      if (rt.failure) throw rt.failure;
      if (signal.aborted) throw signal.reason;

      if (work.totalBytes == null) work.totalBytes = work.receivedBytes;
      const blob = await assembleFile(work.id, work.mimeType);
      if (blob.size !== work.totalBytes) {
        throw new Error(`Size check failed: expected ${work.totalBytes} bytes, got ${blob.size}.`);
      }
      Object.assign(work, {
        status: 'completed',
        completedAt: Date.now(),
        speed: 0,
        eta: 0,
        fileAvailable: true,
        segments: work.segments.map(s => ({ ...s, active: false, speed: 0 })),
      });
      this.finish(rt);
      if (this.settings.autoSave) saveBlob(blob, work.filename);
      this.events.completed?.(this.find(work.id)!);
    } catch (err) {
      const aborted = signal.aborted && !rt.failure;
      if (!signal.aborted) controller.abort(new AbortedError('failed'));
      Object.assign(work, {
        status: aborted ? 'paused' : 'error',
        error: aborted ? undefined : friendlyError(rt.failure ?? err),
        speed: 0,
        eta: null,
        segments: work.segments.map(s => ({ ...s, active: false, speed: 0 })),
      });
      if (!work.resumable) {
        work.receivedBytes = 0;
        work.segments = planSegments(work.totalBytes, 1, false);
        await deleteParts(work.id).catch(() => {});
      }
      this.finish(rt);
      if (!aborted) this.events.failed?.(this.find(work.id)!);
    }
  }

  private finish(rt: Runtime) {
    this.runtimes.delete(rt.work.id);
    this.publish(rt.work);
    this.emit(true);
    this.pump();
  }

  private nextSegment(rt: Runtime) {
    const { work } = rt;
    const idle = work.segments.find(s => !s.active && !isSegmentDone(s));
    if (idle) return idle;
    if (!work.resumable) return null;
    return splitLargestSegment(work.segments);
  }

  private async worker(rt: Runtime) {
    const signal = rt.controller.signal;
    while (!signal.aborted) {
      const seg = this.nextSegment(rt);
      if (!seg) return;
      seg.active = true;
      try {
        await this.downloadSegment(rt, seg.id);
      } catch (err) {
        if (!signal.aborted) {
          rt.failure ??= err;
          rt.controller.abort(new AbortedError('failed'));
        }
        return;
      } finally {
        const current = rt.work.segments.find(s => s.id === seg.id);
        if (current) {
          current.active = false;
          current.speed = 0;
        }
      }
    }
  }

  private async downloadSegment(rt: Runtime, segId: number) {
    const { work } = rt;
    const signal = rt.controller.signal;
    const seg = () => work.segments.find(s => s.id === segId)!;
    let attempt = 0;

    while (true) {
      let buffer: Uint8Array[] = [];
      let buffered = 0;
      let bufferOffset = seg().start + seg().received;

      const flush = async () => {
        if (!buffered) return;
        const blob = new Blob(buffer as BlobPart[]);
        const offset = bufferOffset;
        buffer = [];
        bufferOffset += buffered;
        buffered = 0;
        await putPart(work.id, offset, blob);
      };

      try {
        const s = seg();
        const from = s.start + s.received;
        if (s.end >= 0 && from > s.end) return;
        const headers: HeadersInit = work.resumable ? { Range: `bytes=${from}-${s.end >= 0 ? s.end : ''}` } : {};
        const res = await fetch(work.url, { headers, signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`Server responded with HTTP ${res.status}.`);
        if (work.resumable && res.status !== 206) throw new Error('Server stopped honouring range requests.');
        if (!res.body) throw new Error('Empty response body.');

        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const cur = seg();
          const allowed = cur.end >= 0 ? cur.end - (cur.start + cur.received) + 1 : Infinity;
          const chunk = value.length > allowed ? value.subarray(0, allowed) : value;
          if (chunk.length) {
            await this.throttle.take(chunk.length, signal);
            buffer.push(chunk);
            buffered += chunk.length;
            cur.received += chunk.length;
            work.receivedBytes += chunk.length;
            rt.tickBytes += chunk.length;
            rt.segTickBytes.set(segId, (rt.segTickBytes.get(segId) ?? 0) + chunk.length);
            if (buffered >= FLUSH_BYTES) await flush();
          }
          if (cur.end >= 0 && remainingBytes(cur) === 0) {
            reader.cancel().catch(() => {});
            break;
          }
        }
        await flush();
        const cur = seg();
        if (cur.end < 0) cur.end = cur.start + cur.received - 1;
        else if (remainingBytes(cur) > 0) throw new Error('Connection closed early.');
        return;
      } catch (err) {
        if (work.resumable) {
          await flush().catch(() => {});
        }
        if (signal.aborted) throw signal.reason;
        if (!work.resumable || ++attempt > MAX_RETRIES || (err instanceof DOMException && err.name === 'QuotaExceededError')) {
          throw err;
        }
        await sleep(800 * 2 ** (attempt - 1), signal);
      }
    }
  }

  private ensureTicker() {
    if (this.ticker != null) return;
    this.ticker = window.setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    if (this.runtimes.size === 0) {
      if (this.ticker != null) window.clearInterval(this.ticker);
      this.ticker = null;
      return;
    }
    const now = performance.now();
    for (const rt of this.runtimes.values()) {
      const dt = (now - rt.lastTick) / 1000;
      if (dt <= 0) continue;
      const { work } = rt;
      const instant = rt.tickBytes / dt;
      work.speed = work.speed ? work.speed * 0.6 + instant * 0.4 : instant;
      for (const s of work.segments) {
        const segInstant = (rt.segTickBytes.get(s.id) ?? 0) / dt;
        s.speed = s.active ? (s.speed ? s.speed * 0.6 + segInstant * 0.4 : segInstant) : 0;
      }
      if (work.status === 'downloading') work.elapsedMs += now - rt.lastTick;
      work.eta = work.totalBytes != null && work.speed > 0 ? (work.totalBytes - work.receivedBytes) / work.speed : null;
      rt.tickBytes = 0;
      rt.segTickBytes.clear();
      rt.lastTick = now;
      this.publish(work);
    }
    this.emit();
  }

  private persist() {
    this.lastPersist = Date.now();
    try {
      const data = this.items.map(i => ({
        ...i,
        speed: 0,
        eta: null,
        segments: i.segments.map(s => ({ ...s, active: false, speed: 0 })),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable */
    }
  }

  private load(): DownloadItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items: DownloadItem[] = raw ? JSON.parse(raw) : [];
      return items.map(i =>
        i.status === 'downloading' || i.status === 'connecting' ? { ...i, status: 'paused', speed: 0, eta: null } : i,
      );
    } catch {
      return [];
    }
  }

  /** Align saved progress with the bytes actually persisted in IndexedDB. */
  private async reconcile() {
    for (const item of this.items) {
      if (this.runtimes.has(item.id)) continue;
      try {
        const parts = await getParts(item.id);
        if (item.status === 'completed') {
          const size = parts.reduce((n, p) => n + p.blob.size, 0);
          const available = item.totalBytes == null ? size > 0 : size === item.totalBytes;
          if (available !== item.fileAvailable) this.patch(item.id, { fileAvailable: available });
          continue;
        }
        if (!item.resumable) {
          if (item.receivedBytes) this.patch(item.id, { receivedBytes: 0, segments: planSegments(item.totalBytes, 1, false) });
          continue;
        }
        parts.sort((a, b) => a.offset - b.offset);
        const segments = item.segments.map(s => {
          let received = 0;
          for (const p of parts) {
            if (p.offset === s.start + received && p.offset <= s.end) received += p.blob.size;
          }
          return { ...s, received: Math.min(received, s.end - s.start + 1) };
        });
        const receivedBytes = segments.reduce((n, s) => n + s.received, 0);
        if (receivedBytes !== item.receivedBytes) this.patch(item.id, { segments, receivedBytes });
      } catch {
        /* IndexedDB unavailable */
      }
    }
  }
}

export const downloadManager = new DownloadManager();

import type { DownloadItem, DownloadSegment } from '../types';
import { soundEffects } from './soundEffects';
import { formatSpeed, formatSeconds } from '../constants';

export class DownloadEngine {
  private activeIntervals: Map<string, number> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  public createInitialSegments(totalBytes: number, connectionCount: number = 8): DownloadSegment[] {
    const segments: DownloadSegment[] = [];
    const segmentSize = Math.max(1, Math.floor(totalBytes / connectionCount));

    for (let i = 0; i < connectionCount; i++) {
      const start = i * segmentSize;
      const end = i === connectionCount - 1 ? totalBytes : (i + 1) * segmentSize - 1;
      segments.push({
        id: i + 1,
        startByte: start,
        endByte: end,
        downloadedBytes: 0,
        progress: 0,
        currentSpeed: 'Connecting...',
        status: 'active',
      });
    }

    return segments;
  }

  public startDownload(
    item: DownloadItem,
    speedLimitKbps: number,
    speedLimiterEnabled: boolean,
    onProgress: (updated: DownloadItem) => void,
    onComplete: (completedItem: DownloadItem) => void
  ) {
    this.stopDownload(item.id);

    // Initial setup
    let currentItem: DownloadItem = {
      ...item,
      status: 'downloading',
      speed: 'Connecting...',
    };

    if (!currentItem.segments || currentItem.segments.length === 0) {
      currentItem.segments = this.createInitialSegments(currentItem.totalBytes, currentItem.connections || 8);
    }

    soundEffects.playStart();
    onProgress(currentItem);

    const controller = new AbortController();
    this.abortControllers.set(item.id, controller);

    let lastBytes = currentItem.downloadedBytes;
    let lastTime = Date.now();

    // Determine target speed limit (bytes per second)
    const targetMaxSpeed = speedLimiterEnabled && speedLimitKbps > 0
      ? speedLimitKbps * 1024
      : 18 * 1024 * 1024; // 18 MB/s typical IDM burst speed

    const intervalId = window.setInterval(() => {
      if (currentItem.status !== 'downloading') {
        window.clearInterval(intervalId);
        return;
      }

      const now = Date.now();
      const elapsedSec = (now - lastTime) / 1000;
      if (elapsedSec <= 0) return;

      // Realistic speed fluctuation (± 15%)
      const jitter = 0.85 + Math.random() * 0.3;
      const currentSpeedBps = Math.floor(targetMaxSpeed * jitter);
      const bytesToAdd = Math.floor(currentSpeedBps * elapsedSec);

      lastTime = now;

      // Advance segments
      let newTotalDownloaded = currentItem.downloadedBytes;
      const activeSegments = currentItem.segments.filter(s => s.status === 'active');
      const segmentBytesChunk = activeSegments.length > 0 ? Math.floor(bytesToAdd / activeSegments.length) : 0;

      const updatedSegments = currentItem.segments.map(seg => {
        if (seg.status === 'done') return seg;

        const maxRemaining = (seg.endByte - seg.startByte + 1) - seg.downloadedBytes;
        const segmentAdvance = Math.min(segmentBytesChunk, maxRemaining);
        const newDownloaded = seg.downloadedBytes + segmentAdvance;
        const segProgress = Math.min(100, Math.floor((newDownloaded / (seg.endByte - seg.startByte + 1)) * 100));

        newTotalDownloaded += segmentAdvance;

        return {
          ...seg,
          downloadedBytes: newDownloaded,
          progress: segProgress,
          currentSpeed: segProgress >= 100 ? 'Done' : formatSpeed(Math.floor(currentSpeedBps / currentItem.connections)),
          status: segProgress >= 100 ? ('done' as const) : ('active' as const),
        };
      });

      const totalDownloaded = Math.min(currentItem.totalBytes, newTotalDownloaded);
      const overallProgress = Math.min(100, Number(((totalDownloaded / currentItem.totalBytes) * 100).toFixed(1)));
      const remainingBytes = currentItem.totalBytes - totalDownloaded;
      const secondsLeft = currentSpeedBps > 0 ? Math.ceil(remainingBytes / currentSpeedBps) : 0;

      if (overallProgress >= 100 || totalDownloaded >= currentItem.totalBytes) {
        window.clearInterval(intervalId);
        this.activeIntervals.delete(item.id);

        // Generate mock download blob so user can save/open
        const mockBlob = new Blob(
          [`Shuja's Downloader Pro - IDM Engine Downloaded: ${currentItem.title}\nURL: ${currentItem.url}\nDate: ${new Date().toISOString()}`],
          { type: 'application/octet-stream' }
        );
        const blobUrl = URL.createObjectURL(mockBlob);

        const finishedItem: DownloadItem = {
          ...currentItem,
          progress: 100,
          downloadedBytes: currentItem.totalBytes,
          speed: 'Complete',
          speedBps: 0,
          timeLeft: 'Finished',
          status: 'completed',
          segments: updatedSegments.map(s => ({ ...s, progress: 100, status: 'done', currentSpeed: 'Done' })),
          fileBlobUrl: blobUrl,
          fileBlob: mockBlob,
        };

        soundEffects.playComplete();
        onComplete(finishedItem);
      } else {
        currentItem = {
          ...currentItem,
          downloadedBytes: totalDownloaded,
          progress: overallProgress,
          speed: formatSpeed(currentSpeedBps),
          speedBps: currentSpeedBps,
          timeLeft: formatSeconds(secondsLeft),
          segments: updatedSegments,
        };

        onProgress(currentItem);
      }
    }, 300);

    this.activeIntervals.set(item.id, intervalId);
  }

  public stopDownload(id: string) {
    if (this.activeIntervals.has(id)) {
      window.clearInterval(this.activeIntervals.get(id));
      this.activeIntervals.delete(id);
    }
    if (this.abortControllers.has(id)) {
      this.abortControllers.get(id)?.abort();
      this.abortControllers.delete(id);
    }
  }

  public pauseDownload(item: DownloadItem, onPaused: (updated: DownloadItem) => void) {
    this.stopDownload(item.id);
    soundEffects.playError();
    const pausedItem: DownloadItem = {
      ...item,
      status: 'paused',
      speed: 'Paused',
      speedBps: 0,
      segments: item.segments.map(s => ({
        ...s,
        currentSpeed: s.status === 'done' ? 'Done' : 'Paused',
        status: s.status === 'done' ? 'done' : 'idle',
      })),
    };
    onPaused(pausedItem);
  }
}

export const downloadEngine = new DownloadEngine();

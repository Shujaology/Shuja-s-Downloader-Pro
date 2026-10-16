import type { DownloadItem, DownloadSegment } from '../types';
import { soundEffects } from './soundEffects';

interface ApiDownload extends Omit<DownloadItem, 'fileBlob' | 'fileBlobUrl'> {
  fileBlobUrl?: string;
}

const apiRequest = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Download service returned HTTP ${response.status}.`);
  }
  return result as T;
};

const toDownloadItem = (item: ApiDownload): DownloadItem => ({
  ...item,
  fileBlobUrl: item.fileBlobUrl,
});

export class DownloadEngine {
  private pollers = new Map<string, number>();
  private knownIds = new Set<string>();
  private pendingStarts = new Map<string, Promise<void>>();

  public createInitialSegments(_totalBytes: number, _connectionCount = 1): DownloadSegment[] {
    return [{
      id: 1,
      startByte: 0,
      endByte: 0,
      downloadedBytes: 0,
      progress: 0,
      currentSpeed: 'Connecting...',
      status: 'active',
    }];
  }

  public async listDownloads(): Promise<DownloadItem[]> {
    const downloads = await apiRequest<ApiDownload[]>('/api/downloads');
    downloads.forEach(item => this.knownIds.add(item.id));
    return downloads.map(toDownloadItem);
  }

  public startDownload(
    item: DownloadItem,
    speedLimitKbps: number,
    speedLimiterEnabled: boolean,
    onProgress: (updated: DownloadItem) => void,
    onComplete: (completedItem: DownloadItem) => void
  ) {
    if (this.pendingStarts.has(item.id)) return;
    this.stopPolling(item.id);
    soundEffects.playStart();

    const start = async () => {
      try {
        const path = this.knownIds.has(item.id)
          ? `/api/downloads/${encodeURIComponent(item.id)}/resume`
          : '/api/downloads';
        const body = path === '/api/downloads'
          ? JSON.stringify({
              id: item.id,
              url: item.url,
              title: item.title,
              category: item.category,
              connections: item.connections,
              speedLimitKbps,
              speedLimiterEnabled,
              mediaExtractor: item.mediaExtractor,
              mediaFormatId: item.mediaFormatId,
            })
          : undefined;
        const result = await apiRequest<ApiDownload>(path, {
          method: 'POST',
          body,
        });
        this.knownIds.add(item.id);
        onProgress(toDownloadItem(result));
        if (result.status === 'completed') {
          onComplete(toDownloadItem(result));
          return;
        }
        this.poll(item, onProgress, onComplete);
      } catch (error) {
        onProgress({
          ...item,
          status: 'error',
          speed: 'Download failed',
          speedBps: 0,
          timeLeft: 'Failed',
          errorMessage: error instanceof Error ? error.message : 'Could not reach the local download service.',
        });
      }
    };
    const pending = start();
    this.pendingStarts.set(item.id, pending);
    void pending.finally(() => {
      if (this.pendingStarts.get(item.id) === pending) this.pendingStarts.delete(item.id);
    });
  }

  private poll(
    initialItem: DownloadItem,
    onProgress: (updated: DownloadItem) => void,
    onComplete: (completedItem: DownloadItem) => void
  ) {
    const id = initialItem.id;
    let timer = 0;
    let requestInFlight = false;
    let lastSeen = initialItem;
    timer = window.setInterval(async () => {
      if (requestInFlight || this.pollers.get(id) !== timer) return;
      requestInFlight = true;
      try {
        const item = await apiRequest<ApiDownload>(`/api/downloads/${encodeURIComponent(id)}`);
        const download = toDownloadItem(item);
        lastSeen = download;
        if (this.pollers.get(id) !== timer) return;
        onProgress(download);
        if (download.status === 'completed') {
          this.stopPolling(id);
          soundEffects.playComplete();
          onComplete(download);
        } else if (download.status === 'error' || download.status === 'paused') {
          this.stopPolling(id);
        }
      } catch (error) {
        if (this.pollers.get(id) !== timer) return;
        this.stopPolling(id);
        onProgress({
          ...lastSeen,
          speed: 'Download service error',
          speedBps: 0,
          timeLeft: 'Failed',
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Lost connection to the local download service.',
        });
      } finally {
        requestInFlight = false;
      }
    }, 700);
    this.pollers.set(id, timer);
  }

  private stopPolling(id: string) {
    const timer = this.pollers.get(id);
    if (timer !== undefined) {
      window.clearInterval(timer);
      this.pollers.delete(id);
    }
  }

  public pauseDownload(item: DownloadItem, onPaused: (updated: DownloadItem) => void) {
    this.stopPolling(item.id);
    soundEffects.playError();
    const pendingStart = this.pendingStarts.get(item.id);
    void Promise.resolve(pendingStart).catch(() => undefined).then(() =>
      apiRequest<ApiDownload>(`/api/downloads/${encodeURIComponent(item.id)}/pause`, {
        method: 'POST',
      })
    ).then(result => {
      onPaused(toDownloadItem(result));
    }).catch(error => {
      onPaused({
        ...item,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Could not pause the download.',
      });
    });
  }

  public stopDownload(id: string) {
    this.stopPolling(id);
    const pendingStart = this.pendingStarts.get(id);
    void Promise.resolve(pendingStart).catch(() => undefined)
      .then(() => apiRequest(`/api/downloads/${encodeURIComponent(id)}`, { method: 'DELETE' }))
      .then(() => this.knownIds.delete(id))
      .catch(error => console.error('Could not remove download:', error));
  }
}

export const downloadEngine = new DownloadEngine();

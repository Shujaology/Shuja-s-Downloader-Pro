export type Category = 'video' | 'music' | 'documents' | 'compressed' | 'programs' | 'images' | 'other';

export type DownloadStatus = 'queued' | 'connecting' | 'downloading' | 'paused' | 'completed' | 'error';

export type LibraryView = 'all' | 'downloading' | 'unfinished' | 'completed' | 'failed';

export interface Segment {
  id: number;
  /** First byte offset (inclusive). */
  start: number;
  /** Last byte offset (inclusive), or -1 when the total size is unknown. */
  end: number;
  received: number;
  active: boolean;
  speed: number;
}

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  category: Category;
  mimeType?: string;
  totalBytes: number | null;
  receivedBytes: number;
  status: DownloadStatus;
  error?: string;
  /** Server honours HTTP range requests, so the file can be split and resumed. */
  resumable: boolean;
  probed: boolean;
  connections: number;
  segments: Segment[];
  speed: number;
  eta: number | null;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  /** Active download time in ms, used for average speed. */
  elapsedMs: number;
  /** Completed file bytes are still available in browser storage. */
  fileAvailable?: boolean;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  connections: number;
  maxConcurrent: number;
  speedLimitEnabled: boolean;
  speedLimitKBps: number;
  autoSave: boolean;
  notifications: boolean;
  sound: boolean;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleStop: string;
}

export interface ProbeResult {
  url: string;
  finalUrl: string;
  filename: string;
  totalBytes: number | null;
  resumable: boolean;
  mimeType?: string;
}

export type SortKey = 'addedAt' | 'filename' | 'totalBytes' | 'progress' | 'speed';

export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

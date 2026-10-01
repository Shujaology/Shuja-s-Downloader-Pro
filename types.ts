export type DownloadCategory = 'all' | 'compressed' | 'documents' | 'music' | 'programs' | 'video';
export type DownloadQueue = 'all' | 'main' | 'sync';
export type DownloadFilter = 'all' | 'unfinished' | 'finished' | 'grabber';
export type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'error' | 'queued' | 'connecting';

export interface FormatOption {
  id: string;
  quality: string;
  container: string;
  type: 'video' | 'audio';
  size: string;
}

export interface AnalysisResult {
  title: string;
  thumbnailUrl: string;
  formats: FormatOption[];
  summary: string;
}

export interface DownloadSegment {
  id: number;
  startByte: number;
  endByte: number;
  downloadedBytes: number;
  progress: number; // 0 to 100
  currentSpeed: string;
  status: 'active' | 'done' | 'idle';
}

export interface DownloadItem {
  id: string;
  title: string;
  url: string;
  category: 'compressed' | 'documents' | 'music' | 'programs' | 'video';
  queue?: 'main' | 'sync';
  format?: FormatOption;
  progress: number; // 0 to 100
  totalBytes: number;
  downloadedBytes: number;
  speed: string; // e.g. "12.4 MB/s"
  speedBps: number;
  timeLeft: string; // e.g. "00:00:14"
  status: DownloadStatus;
  dateAdded: string;
  savePath: string;
  connections: number; // default 8
  segments: DownloadSegment[];
  summary?: string;
  thumbnailUrl?: string;
  fileBlobUrl?: string;
  fileBlob?: Blob;
  description?: string;
  resumeSupported: boolean;
}

export interface IDMSettings {
  theme: 'windows-classic' | 'windows-dark';
  saveDirectory: string;
  categoriesDirs: {
    compressed: string;
    documents: string;
    music: string;
    programs: string;
    video: string;
  };
  maxConnections: number; // 1, 4, 8, 16, 32
  speedLimiterEnabled: boolean;
  speedLimitKbps: number; // in KB/s
  soundEnabled: boolean;
  autoStartDownloads: boolean;
  showFloatingVideoBar: boolean;
  maxSimultaneousDownloads: number;
}

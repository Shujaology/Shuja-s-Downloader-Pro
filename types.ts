
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

export interface DownloadItem {
  id: string;
  title: string;
  format: FormatOption;
  progress: number;
  speed: string;
  status: 'downloading' | 'completed' | 'error';
}

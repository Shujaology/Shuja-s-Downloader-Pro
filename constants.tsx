import React from 'react';
import type { DownloadCategory, DownloadItem, FormatOption, IDMSettings } from './types';

export const MOCK_FORMATS: FormatOption[] = [
  { id: 'v_mp4_1080p', quality: '1080p Full HD (60fps)', container: 'MP4', type: 'video', size: '154.2 MB' },
  { id: 'v_mp4_720p', quality: '720p HD', container: 'MP4', type: 'video', size: '94.6 MB' },
  { id: 'v_webm_1080p', quality: '1080p HD', container: 'WebM', type: 'video', size: '132.0 MB' },
  { id: 'v_webm_720p', quality: '720p', container: 'WebM', type: 'video', size: '82.5 MB' },
  { id: 'v_mp4_480p', quality: '480p Standard', container: 'MP4', type: 'video', size: '48.1 MB' },
  { id: 'v_mp4_360p', quality: '360p Mobile', container: 'MP4', type: 'video', size: '28.3 MB' },
  { id: 'a_m4a_best', quality: 'Audio Best Quality (320kbps)', container: 'M4A', type: 'audio', size: '7.8 MB' },
  { id: 'a_mp3_best', quality: 'Audio MP3 Stereo (256kbps)', container: 'MP3', type: 'audio', size: '6.4 MB' },
  { id: 'a_opus_medium', quality: 'Audio Opus (128kbps)', container: 'Opus', type: 'audio', size: '3.9 MB' },
];

export const INITIAL_SETTINGS: IDMSettings = {
  theme: 'windows-dark',
  saveDirectory: 'C:\\Users\\Shuja\\Downloads',
  categoriesDirs: {
    compressed: 'C:\\Users\\Shuja\\Downloads\\Compressed',
    documents: 'C:\\Users\\Shuja\\Downloads\\Documents',
    music: 'C:\\Users\\Shuja\\Downloads\\Music',
    programs: 'C:\\Users\\Shuja\\Downloads\\Programs',
    video: 'C:\\Users\\Shuja\\Downloads\\Video',
  },
  maxConnections: 8,
  speedLimiterEnabled: false,
  speedLimitKbps: 1024,
  soundEnabled: true,
  autoStartDownloads: true,
  showFloatingVideoBar: true,
  maxSimultaneousDownloads: 3,
};

export const SAMPLE_TEST_URLS = [
  {
    name: 'Big Buck Bunny (MP4 Video)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    category: 'video' as DownloadCategory,
    size: 158008374,
  },
  {
    name: 'Sample PDF Document',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    category: 'documents' as DownloadCategory,
    size: 13264,
  },
  {
    name: 'Sample Sound Audio (MP3)',
    url: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg',
    category: 'music' as DownloadCategory,
    size: 2450000,
  },
  {
    name: 'Ubuntu Linux 24.04 LTS (ISO Image)',
    url: 'https://releases.ubuntu.com/24.04/ubuntu-24.04-desktop-amd64.iso',
    category: 'compressed' as DownloadCategory,
    size: 6100000000,
  },
  {
    name: 'VSCode Setup Installer (EXE)',
    url: 'https://update.code.visualstudio.com/latest/win32-x64-user/stable',
    category: 'programs' as DownloadCategory,
    size: 98500000,
  },
];

export const INITIAL_DOWNLOADS: DownloadItem[] = [];

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatSpeed = (bytesPerSec: number): string => {
  if (bytesPerSec <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
};

export const formatSeconds = (seconds: number): string => {
  if (!isFinite(seconds) || seconds <= 0) return 'Finished';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const detectCategory = (filenameOrUrl: string): Exclude<DownloadCategory, 'all'> => {
  const clean = filenameOrUrl.toLowerCase().split('?')[0];
  if (clean.match(/\.(zip|rar|7z|tar|gz|bz2|iso|dmg|tgz|xz)$/)) return 'compressed';
  if (clean.match(/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|epub|csv|rtf)$/)) return 'documents';
  if (clean.match(/\.(mp3|wav|flac|aac|m4a|ogg|wma|opus)$/)) return 'music';
  if (clean.match(/\.(exe|msi|apk|dmg|pkg|deb|rpm|appimage|bat|cmd|sh)$/)) return 'programs';
  if (clean.match(/\.(mp4|mkv|avi|webm|mov|flv|wmv|m4v|3gp|ts)$/) || clean.includes('youtube.com') || clean.includes('youtu.be')) return 'video';
  return 'programs';
};
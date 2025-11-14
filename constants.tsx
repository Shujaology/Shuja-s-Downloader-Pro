import React from 'react';
import type { FormatOption } from './types';

export const MOCK_FORMATS: FormatOption[] = [
  { id: 'v_mp4_1080p', quality: '1080p HD', container: 'MP4', type: 'video', size: '150 MB' },
  { id: 'v_mp4_720p', quality: '720p', container: 'MP4', type: 'video', size: '95 MB' },
  { id: 'v_webm_1080p', quality: '1080p HD', container: 'WebM', type: 'video', size: '135 MB' },
  { id: 'v_webm_720p', quality: '720p', container: 'WebM', type: 'video', size: '85 MB' },
  { id: 'v_mp4_360p', quality: '360p', container: 'MP4', type: 'video', size: '30 MB' },
  { id: 'a_m4a_best', quality: 'Best Audio (128kbps)', container: 'M4A', type: 'audio', size: '5.2 MB' },
  { id: 'a_opus_medium', quality: 'Medium Audio (70kbps)', container: 'Opus', type: 'audio', size: '3.1 MB' },
];

export const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

export const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
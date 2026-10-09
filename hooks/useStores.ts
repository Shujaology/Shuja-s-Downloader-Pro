import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Settings } from '../types';
import { downloadManager } from '../services/downloadManager';
import { toastStore } from '../services/toast';

const SETTINGS_KEY = 'sdp_settings_v2';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  connections: 8,
  maxConcurrent: 3,
  speedLimitEnabled: false,
  speedLimitKBps: 2048,
  autoSave: true,
  notifications: true,
  sound: true,
  scheduleEnabled: false,
  scheduleStart: '02:00',
  scheduleStop: '07:00',
};

export function useDownloads() {
  return useSyncExternalStore(downloadManager.subscribe, downloadManager.getSnapshot);
}

export function useToasts() {
  return useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    downloadManager.configure(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings(prev => ({ ...prev, ...patch })), []);
  return [settings, update] as const;
}

export function useResolvedTheme(theme: Settings['theme']) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#fafafa');
  }, [dark]);
  return dark;
}

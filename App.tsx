import React, { useState, useEffect, useCallback } from 'react';
import type { DownloadCategory, DownloadFilter, DownloadQueue, DownloadItem, IDMSettings } from './types';
import { INITIAL_SETTINGS, detectCategory } from './constants';
import { IDMToolbar } from './components/IDMToolbar';
import { IDMSidebar } from './components/IDMSidebar';
import { IDMDownloadTable } from './components/IDMDownloadTable';
import { IDMStatusBar } from './components/IDMStatusBar';
import { AddUrlModal } from './components/AddUrlModal';
import { DownloadInfoModal } from './components/DownloadInfoModal';
import { OptionsModal } from './components/OptionsModal';
import { SchedulerModal } from './components/SchedulerModal';
import { SiteGrabberModal } from './components/SiteGrabberModal';
import { ActiveDownloadModal } from './components/ActiveDownloadModal';
import { DownloadCompleteModal } from './components/DownloadCompleteModal';
import { downloadEngine } from './services/downloadEngine';
import { soundEffects } from './services/soundEffects';
import { isSupportedMediaUrl } from './services/mediaUrls';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<IDMSettings>(() => {
    try {
      const saved = localStorage.getItem('sdm_settings');
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch { return INITIAL_SETTINGS; }
  });

  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceOnline, setServiceOnline] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DownloadCategory>('all');
  const [selectedQueue, setSelectedQueue] = useState<DownloadQueue>('all');
  const [selectedFilter, setSelectedFilter] = useState<DownloadFilter>('all');

  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const [isDownloadInfoOpen, setIsDownloadInfoOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isGrabberOpen, setIsGrabberOpen] = useState(false);
  const [activeDownloadModalItem, setActiveDownloadModalItem] = useState<DownloadItem | null>(null);
  const [completedModalItem, setCompletedModalItem] = useState<DownloadItem | null>(null);
  const [candidateUrl, setCandidateUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleUpdateSettings = useCallback((newSettings: Partial<IDMSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try { localStorage.setItem('sdm_settings', JSON.stringify(updated)); } catch (e) {}
      if (typeof newSettings.soundEnabled === 'boolean') soundEffects.setSoundEnabled(newSettings.soundEnabled);
      return updated;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const items = await downloadEngine.listDownloads();
        if (mounted) {
          setDownloads(items);
          setServiceError(null);
          setServiceOnline(true);
        }
      } catch (error) {
        if (mounted) {
          setServiceError(error instanceof Error ? error.message : 'Service unavailable');
          setServiceOnline(false);
        }
      }
    };
    refresh();
    const intervalId = window.setInterval(refresh, 1500);
    return () => { mounted = false; window.clearInterval(intervalId); };
  }, []);

  const handleStartDownloadItem = useCallback((targetItem: DownloadItem) => {
    downloadEngine.startDownload(targetItem, settings.speedLimitKbps, settings.speedLimiterEnabled,
      (u) => {
        setDownloads(prev => prev.map(d => d.id === u.id ? u : d));
        setActiveDownloadModalItem(prev => (prev?.id === u.id ? u : prev));
      },
      (f) => {
        setDownloads(prev => prev.map(d => d.id === f.id ? f : d));
        setActiveDownloadModalItem(prev => (prev?.id === f.id ? f : prev));
        setCompletedModalItem(f);
      }
    );
  }, [settings]);

  const handleAddUrlSubmit = (url: string, directDownload: boolean) => {
    if (directDownload) {
      let isMedia = false;
      try { isMedia = isSupportedMediaUrl(url); } catch (e) {}
      const category = isMedia ? 'video' : detectCategory(url);
      const newItem: DownloadItem = {
        id: `sdm-${crypto.randomUUID()}`,
        title: isMedia ? 'media-download' : 'download_file.bin',
        url, category, queue: 'main', progress: 0, totalBytes: 0, downloadedBytes: 0,
        speed: 'Connecting...', speedBps: 0, timeLeft: 'Calculating...', status: 'downloading',
        dateAdded: new Date().toISOString().replace('T', ' ').slice(0, 16),
        savePath: 'Downloads\\ShujaDownloader',
        connections: settings.maxConnections || 8,
        segments: downloadEngine.createInitialSegments(0, settings.maxConnections || 8),
        mediaExtractor: isMedia, resumeSupported: false,
      };
      setDownloads(prev => [newItem, ...prev]);
      handleStartDownloadItem(newItem);
    } else {
      setCandidateUrl(url);
      setIsDownloadInfoOpen(true);
    }
  };

  const handleConfirmDownloadInfo = (info: any) => {
    const newItem: DownloadItem = {
      id: `sdm-${crypto.randomUUID()}`,
      title: info.title, url: info.url, category: info.category, queue: 'main',
      savePath: info.savePath, totalBytes: info.totalBytes, downloadedBytes: 0, progress: 0,
      speed: info.startImmediately ? 'Connecting...' : 'Paused', speedBps: 0,
      timeLeft: info.startImmediately ? 'Calculating...' : 'Paused',
      status: info.startImmediately ? 'downloading' : 'paused',
      dateAdded: new Date().toISOString().replace('T', ' ').slice(0, 16),
      connections: settings.maxConnections || 8,
      segments: downloadEngine.createInitialSegments(info.totalBytes, settings.maxConnections || 8),
      mediaExtractor: Boolean(info.mediaExtractor), mediaFormatId: info.mediaFormatId, resumeSupported: true,
    };
    setDownloads(prev => [newItem, ...prev]);
    if (info.startImmediately) handleStartDownloadItem(newItem);
    setIsDownloadInfoOpen(false);
  };

  return (
    <div className="sdm-app-shell min-h-screen text-slate-100 flex flex-col font-sans overflow-hidden bg-[#060a14]">
      <div className="sdm-window-surface flex-1 flex flex-col overflow-hidden">
        
        {/* Title Bar */}
        <div className="sdm-window-header flex items-center justify-between border-b border-white/5 bg-slate-950/40 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="bg-sky-500 text-slate-950 px-2 py-0.5 rounded font-bold text-sm">SDM</div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Shuja Download Manager</h1>
              <p className="text-[10px] text-slate-400">Version 1.0.0 Pro (Turbo Multi-threaded)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Engine Active</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <IDMToolbar 
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onAddUrl={() => setIsAddUrlOpen(true)}
          onResumeSelected={() => {
            const item = downloads.find(d => d.id === selectedId);
            if (item && item.status !== 'completed') handleStartDownloadItem(item);
          }}
          onStopSelected={() => {
            const item = downloads.find(d => d.id === selectedId);
            if (item && item.status === 'downloading') downloadEngine.pauseDownload(item, (updated) => {
              setDownloads(prev => prev.map(d => d.id === updated.id ? updated : d));
            });
          }}
          onStopAll={() => downloads.forEach(d => d.status === 'downloading' && downloadEngine.pauseDownload(d, (updated) => {
            setDownloads(prev => prev.map(item => item.id === updated.id ? updated : item));
          }))}
          onDeleteSelected={() => {
            if (selectedId) {
              downloadEngine.stopDownload(selectedId);
              setDownloads(prev => prev.filter(d => d.id !== selectedId));
              setSelectedId(null);
            }
          }}
          onDeleteCompleted={() => {
            downloads.forEach(d => {
              if (d.status === 'completed') downloadEngine.stopDownload(d.id);
            });
            setDownloads(prev => prev.filter(d => d.status !== 'completed'));
          }}
          onOptions={() => setIsOptionsOpen(true)}
          onScheduler={() => setIsSchedulerOpen(true)}
          onStartQueue={() => downloads.forEach(d => d.status === 'paused' && handleStartDownloadItem(d))}
          onStopQueue={() => downloads.forEach(d => d.status === 'downloading' && downloadEngine.pauseDownload(d, (updated) => {
            setDownloads(prev => prev.map(item => item.id === updated.id ? updated : item));
          }))}
          onGrabber={() => setIsGrabberOpen(true)}
          canResume={Boolean(selectedId && downloads.find(d => d.id === selectedId)?.status !== 'completed')}
          canStop={Boolean(selectedId && downloads.find(d => d.id === selectedId)?.status === 'downloading')}
          canDelete={Boolean(selectedId)}
          hasActiveDownloads={downloads.some(d => d.status === 'downloading')}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />

        {/* Main Interface Layout */}
        <div className="flex flex-1 overflow-hidden sdm-main-layout">
          <IDMSidebar 
            selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory}
            selectedQueue={selectedQueue} onSelectQueue={setSelectedQueue}
            selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter}
            downloads={downloads}
          />
          <div className="flex-1 flex flex-col bg-slate-900/10 overflow-hidden">
            <div className="flex-1 overflow-auto p-4 sdm-download-table">
              <IDMDownloadTable 
                downloads={downloads} selectedId={selectedId} onSelectId={setSelectedId}
                searchTerm={searchTerm} selectedCategory={selectedCategory}
                selectedFilter={selectedFilter} selectedQueue={selectedQueue}
                onStartItem={handleStartDownloadItem}
                onOpenItem={(item) => setActiveDownloadModalItem(item)}
                onPauseItem={(item) => downloadEngine.pauseDownload(item, (updated) => {
                  setDownloads(prev => prev.map(d => d.id === updated.id ? updated : d));
                  setActiveDownloadModalItem(prev => (prev?.id === updated.id ? updated : prev));
                })}
                onDeleteItem={(id) => {
                  downloadEngine.stopDownload(id);
                  setDownloads(prev => prev.filter(d => d.id !== id));
                  if (selectedId === id) setSelectedId(null);
                  if (activeDownloadModalItem?.id === id) setActiveDownloadModalItem(null);
                }}
              />
            </div>
          </div>
        </div>

        {/* Status Footbar */}
        <IDMStatusBar downloads={downloads} serviceOnline={serviceOnline} serviceError={serviceError} />
      </div>

      {/* Modals Popups */}
      {isAddUrlOpen && (
        <AddUrlModal
          isOpen={isAddUrlOpen}
          settings={settings}
          onClose={() => setIsAddUrlOpen(false)}
          onSubmitUrl={handleAddUrlSubmit}
        />
      )}
      {isDownloadInfoOpen && (
        <DownloadInfoModal
          isOpen={isDownloadInfoOpen}
          settings={settings}
          url={candidateUrl}
          onClose={() => setIsDownloadInfoOpen(false)}
          onStartDownload={handleConfirmDownloadInfo}
        />
      )}
      {isOptionsOpen && (
        <OptionsModal
          isOpen={isOptionsOpen}
          settings={settings}
          onClose={() => setIsOptionsOpen(false)}
          onSave={handleUpdateSettings}
        />
      )}
      {isSchedulerOpen && (
        <SchedulerModal
          isOpen={isSchedulerOpen}
          settings={settings}
          onClose={() => setIsSchedulerOpen(false)}
          onSave={handleUpdateSettings}
        />
      )}
      {isGrabberOpen && (
        <SiteGrabberModal
          isOpen={isGrabberOpen}
          settings={settings}
          onClose={() => setIsGrabberOpen(false)}
          onStartGrab={(url) => {
            handleAddUrlSubmit(url, false);
          }}
        />
      )}
      {activeDownloadModalItem && (
        <ActiveDownloadModal
          item={activeDownloadModalItem}
          settings={settings}
          onClose={() => setActiveDownloadModalItem(null)}
          onPause={(item) => {
            downloadEngine.pauseDownload(item, (updated) => {
              setDownloads(prev => prev.map(d => (d.id === updated.id ? updated : d)));
              setActiveDownloadModalItem(updated);
            });
          }}
          onResume={(item) => handleStartDownloadItem(item)}
          onCancel={(item) => {
            downloadEngine.stopDownload(item.id);
            setActiveDownloadModalItem(null);
            setDownloads(prev => prev.filter(d => d.id !== item.id));
          }}
          onUpdateSettings={handleUpdateSettings}
        />
      )}
      {completedModalItem && (
        <DownloadCompleteModal
          item={completedModalItem}
          settings={settings}
          onClose={() => setCompletedModalItem(null)}
        />
      )}
    </div>
  );
};

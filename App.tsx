import React, { useState, useEffect, useCallback } from 'react';
import type {
  DownloadCategory,
  DownloadFilter,
  DownloadQueue,
  DownloadItem,
  FormatOption,
  IDMSettings,
} from './types';
import {
  INITIAL_DOWNLOADS,
  INITIAL_SETTINGS,
  detectCategory,
} from './constants';
import { Header } from './components/Header';
import { IDMMenuBar } from './components/IDMMenuBar';
import { IDMToolbar } from './components/IDMToolbar';
import { IDMSidebar } from './components/IDMSidebar';
import { IDMDownloadTable } from './components/IDMDownloadTable';
import { IDMStatusBar } from './components/IDMStatusBar';
import { AddUrlModal } from './components/AddUrlModal';
import { DownloadInfoModal } from './components/DownloadInfoModal';
import { ActiveDownloadModal } from './components/ActiveDownloadModal';
import { DownloadCompleteModal } from './components/DownloadCompleteModal';
import { OptionsModal } from './components/OptionsModal';
import { SchedulerModal } from './components/SchedulerModal';
import { SiteGrabberModal } from './components/SiteGrabberModal';
import { AboutModal } from './components/AboutModal';
import { MediaSnifferModal } from './components/MediaSnifferModal';
import { downloadEngine } from './services/downloadEngine';
import { soundEffects } from './services/soundEffects';
import { MonitorPlay } from 'lucide-react';

export const App: React.FC = () => {
  // Settings with localStorage persistence
  const [settings, setSettings] = useState<IDMSettings>(() => {
    try {
      const saved = localStorage.getItem('sdm_settings');
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Downloads list with localStorage persistence
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    try {
      const saved = localStorage.getItem('sdm_downloads');
      return saved ? JSON.parse(saved) : INITIAL_DOWNLOADS;
    } catch {
      return INITIAL_DOWNLOADS;
    }
  });

  // Selection & Filtering
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return downloads.length > 0 ? downloads[0].id : null;
  });
  const [selectedCategory, setSelectedCategory] = useState<DownloadCategory>('all');
  const [selectedQueue, setSelectedQueue] = useState<DownloadQueue>('all');
  const [selectedFilter, setSelectedFilter] = useState<DownloadFilter>('all');

  // Modals state
  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const [isDownloadInfoOpen, setIsDownloadInfoOpen] = useState(false);
  const [candidateUrl, setCandidateUrl] = useState('');
  const [activeDownloadModalItem, setActiveDownloadModalItem] = useState<DownloadItem | null>(null);
  const [completedModalItem, setCompletedModalItem] = useState<DownloadItem | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isGrabberOpen, setIsGrabberOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMediaSnifferOpen, setIsMediaSnifferOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync settings
  const handleUpdateSettings = useCallback((newSettings: Partial<IDMSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('sdm_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      if (typeof newSettings.soundEnabled === 'boolean') {
        soundEffects.setSoundEnabled(newSettings.soundEnabled);
      }
      return updated;
    });
  }, []);

  // Save downloads to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sdm_downloads', JSON.stringify(downloads));
    } catch (e) {
      console.warn(e);
    }
  }, [downloads]);

  // Keep active modal item in sync with downloads state
  useEffect(() => {
    if (activeDownloadModalItem) {
      const live = downloads.find(d => d.id === activeDownloadModalItem.id);
      if (live) {
        setActiveDownloadModalItem(live);
      }
    }
  }, [downloads, activeDownloadModalItem?.id]);

  // Start real or simulated download
  const handleStartDownloadItem = useCallback((targetItem: DownloadItem) => {
    downloadEngine.startDownload(
      targetItem,
      settings.speedLimitKbps,
      settings.speedLimiterEnabled,
      // On Progress
      (updatedItem) => {
        setDownloads(prev => prev.map(d => (d.id === updatedItem.id ? updatedItem : d)));
      },
      // On Complete
      (finishedItem) => {
        setDownloads(prev => prev.map(d => (d.id === finishedItem.id ? finishedItem : d)));
        setCompletedModalItem(finishedItem);
      }
    );
  }, [settings.speedLimitKbps, settings.speedLimiterEnabled]);

  // Trigger from Add URL dialog
  const handleAddUrlSubmit = (url: string, directDownload: boolean) => {
    if (directDownload) {
      // Create and start immediately
      const category = detectCategory(url);
      const filename = url.split('/').pop()?.split('?')[0] || 'downloaded_file.bin';
      const newItem: DownloadItem = {
        id: `sdm-${Date.now()}`,
        title: filename,
        url,
        category,
        queue: 'main',
        progress: 0,
        totalBytes: 85000000,
        downloadedBytes: 0,
        speed: 'Connecting...',
        speedBps: 0,
        timeLeft: 'Calculating...',
        status: 'downloading',
        dateAdded: new Date().toISOString().replace('T', ' ').slice(0, 16),
        savePath: `${settings.categoriesDirs[category as keyof typeof settings.categoriesDirs] || settings.saveDirectory}\\${filename}`,
        connections: settings.maxConnections || 8,
        segments: downloadEngine.createInitialSegments(85000000, settings.maxConnections || 8),
        resumeSupported: true,
      };

      setDownloads(prev => [newItem, ...prev]);
      setSelectedId(newItem.id);
      setActiveDownloadModalItem(newItem);
      handleStartDownloadItem(newItem);
    } else {
      // Open Download Info Modal for confirmation & configuration
      setCandidateUrl(url);
      setIsDownloadInfoOpen(true);
    }
  };

  // Trigger confirmed download from Download Info dialog
  const handleConfirmDownloadInfo = (info: {
    title: string;
    url: string;
    category: DownloadCategory;
    savePath: string;
    totalBytes: number;
    format?: FormatOption;
    summary?: string;
    thumbnailUrl?: string;
    startImmediately: boolean;
  }) => {
    const newItem: DownloadItem = {
      id: `sdm-${Date.now()}`,
      title: info.title,
      url: info.url,
      category: info.category,
      queue: 'main',
      format: info.format,
      progress: 0,
      totalBytes: info.totalBytes,
      downloadedBytes: 0,
      speed: info.startImmediately ? 'Connecting...' : 'Paused',
      speedBps: 0,
      timeLeft: info.startImmediately ? 'Calculating...' : 'Paused',
      status: info.startImmediately ? 'downloading' : 'paused',
      dateAdded: new Date().toISOString().replace('T', ' ').slice(0, 16),
      savePath: info.savePath,
      connections: settings.maxConnections || 8,
      segments: downloadEngine.createInitialSegments(info.totalBytes, settings.maxConnections || 8),
      summary: info.summary,
      thumbnailUrl: info.thumbnailUrl,
      resumeSupported: true,
    };

    setDownloads(prev => [newItem, ...prev]);
    setSelectedId(newItem.id);

    if (info.startImmediately) {
      setActiveDownloadModalItem(newItem);
      handleStartDownloadItem(newItem);
    }
  };

  // Selected item helpers
  const selectedItem = downloads.find(d => d.id === selectedId) || null;
  const canResume = !!selectedItem && (selectedItem.status === 'paused' || selectedItem.status === 'error' || selectedItem.status === 'queued');
  const canStop = !!selectedItem && (selectedItem.status === 'downloading' || selectedItem.status === 'connecting');
  const hasActiveDownloads = downloads.some(d => d.status === 'downloading');

  const handleResumeSelected = () => {
    if (selectedItem && canResume) {
      handleStartDownloadItem(selectedItem);
    }
  };

  const handleStopSelected = () => {
    if (selectedItem && canStop) {
      downloadEngine.pauseDownload(selectedItem, (updated) => {
        setDownloads(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      });
    }
  };

  const handleStopAll = () => {
    downloads.forEach(d => {
      if (d.status === 'downloading') {
        downloadEngine.pauseDownload(d, (updated) => {
          setDownloads(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        });
      }
    });
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      downloadEngine.stopDownload(selectedId);
      setDownloads(prev => prev.filter(d => d.id !== selectedId));
      setSelectedId(null);
      if (activeDownloadModalItem?.id === selectedId) {
        setActiveDownloadModalItem(null);
      }
    }
  };

  const handleDeleteCompleted = () => {
    setDownloads(prev => prev.filter(d => d.status !== 'completed'));
  };

  const handleStartQueue = () => {
    const uncompleted = downloads.filter(d => d.status === 'paused' || d.status === 'queued');
    const toStart = uncompleted.slice(0, settings.maxSimultaneousDownloads || 3);
    toStart.forEach(item => {
      handleStartDownloadItem(item);
    });
  };

  const handleStopQueue = () => {
    handleStopAll();
  };

  // Filter downloads based on sidebar selection
  const filteredDownloads = downloads.filter(d => {
    if (selectedFilter === 'unfinished') {
      if (d.status === 'completed') return false;
    } else if (selectedFilter === 'finished') {
      if (d.status !== 'completed') return false;
    }

    if (selectedCategory !== 'all') {
      if (d.category !== selectedCategory) return false;
    }

    if (selectedQueue !== 'all') {
      if (d.queue !== selectedQueue) return false;
    }

    return true;
  });

  return (
    <div
      className={`w-screen h-screen flex flex-col font-sans transition-colors ${
        settings.theme === 'windows-dark' ? 'dark-theme bg-[#121212]' : 'bg-[#0f172a]'
      }`}
    >
      {/* Main IDM Desktop Application Frame */}
      <div
        className={`flex-1 flex flex-col m-0 shadow-2xl overflow-hidden ${
          isMaximized ? 'w-full h-full' : 'p-0.5'
        }`}
      >
        <div
          className={`flex-1 flex flex-col border overflow-hidden rounded-xs ${
            settings.theme === 'windows-dark'
              ? 'bg-[#1e1e1e] border-[#3c3c3c]'
              : 'bg-[#f0f0f0] border-[#999999]'
          }`}
        >
          {/* Windows Title Bar */}
          <Header
            settings={settings}
            onMinimize={() => {}}
            onMaximize={() => setIsMaximized(!isMaximized)}
            onClose={() => {
              if (confirm('Exit Shuja\'s Download Manager Pro?')) {
                window.close();
              }
            }}
          />

          {/* IDM Menu Bar */}
          <IDMMenuBar
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenAddUrl={() => setIsAddUrlOpen(true)}
            onOpenOptions={() => setIsOptionsOpen(true)}
            onOpenScheduler={() => setIsSchedulerOpen(true)}
            onOpenGrabber={() => setIsGrabberOpen(true)}
            onOpenAbout={() => setIsAboutOpen(true)}
            onStartQueue={handleStartQueue}
            onStopQueue={handleStopQueue}
            onDeleteCompleted={handleDeleteCompleted}
            onDeleteSelected={handleDeleteSelected}
            selectedCount={selectedId ? 1 : 0}
          />

          {/* IDM Glossy 3D Toolbar */}
          <IDMToolbar
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onAddUrl={() => setIsAddUrlOpen(true)}
            onResumeSelected={handleResumeSelected}
            onStopSelected={handleStopSelected}
            onStopAll={handleStopAll}
            onDeleteSelected={handleDeleteSelected}
            onDeleteCompleted={handleDeleteCompleted}
            onOptions={() => setIsOptionsOpen(true)}
            onScheduler={() => setIsSchedulerOpen(true)}
            onStartQueue={handleStartQueue}
            onStopQueue={handleStopQueue}
            onGrabber={() => setIsGrabberOpen(true)}
            canResume={canResume}
            canStop={canStop}
            canDelete={!!selectedId}
            hasActiveDownloads={hasActiveDownloads}
          />

          {/* Main Area: Left Categories Sidebar + Right Downloads Grid Table */}
          <div className="flex-1 flex overflow-hidden">
            <IDMSidebar
              settings={settings}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedQueue={selectedQueue}
              onSelectQueue={setSelectedQueue}
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
              downloads={downloads}
            />

            <IDMDownloadTable
              settings={settings}
              downloads={filteredDownloads}
              selectedId={selectedId}
              onSelectDownload={setSelectedId}
              onOpenDownloadDetails={(item) => setActiveDownloadModalItem(item)}
              onResume={(item) => handleStartDownloadItem(item)}
              onPause={(item) => {
                downloadEngine.pauseDownload(item, (updated) => {
                  setDownloads(prev => prev.map(d => (d.id === updated.id ? updated : d)));
                });
              }}
              onDelete={(id) => {
                downloadEngine.stopDownload(id);
                setDownloads(prev => prev.filter(d => d.id !== id));
                if (selectedId === id) setSelectedId(null);
              }}
              onRedownload={(item) => {
                const resetItem: DownloadItem = {
                  ...item,
                  progress: 0,
                  downloadedBytes: 0,
                  speed: 'Connecting...',
                  speedBps: 0,
                  timeLeft: 'Calculating...',
                  status: 'downloading',
                  segments: downloadEngine.createInitialSegments(item.totalBytes, item.connections || 8),
                };
                setDownloads(prev => prev.map(d => (d.id === item.id ? resetItem : d)));
                setActiveDownloadModalItem(resetItem);
                handleStartDownloadItem(resetItem);
              }}
            />
          </div>

          {/* IDM Status Bar */}
          <IDMStatusBar settings={settings} downloads={downloads} />
        </div>
      </div>

      {/* Floating Media Sniffer Launcher Button (Bottom Right) */}
      {settings.showFloatingVideoBar && (
        <div className="fixed bottom-8 right-6 z-40">
          <button
            onClick={() => setIsMediaSnifferOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all border border-blue-300 drop-shadow-[0_10px_20px_rgba(0,100,255,0.4)] animate-pulse-soft"
            title="Launch IDM Video Grabber Test Studio"
          >
            <MonitorPlay className="w-4 h-4 text-white" />
            <span>Test Floating Video Grabber</span>
          </button>
        </div>
      )}

      {/* All Authentic IDM Modals */}
      <AddUrlModal
        isOpen={isAddUrlOpen}
        settings={settings}
        onClose={() => setIsAddUrlOpen(false)}
        onSubmitUrl={handleAddUrlSubmit}
      />

      <DownloadInfoModal
        isOpen={isDownloadInfoOpen}
        settings={settings}
        url={candidateUrl}
        onClose={() => setIsDownloadInfoOpen(false)}
        onStartDownload={handleConfirmDownloadInfo}
      />

      <ActiveDownloadModal
        item={activeDownloadModalItem}
        settings={settings}
        onClose={() => setActiveDownloadModalItem(null)}
        onPause={(item) => {
          downloadEngine.pauseDownload(item, (updated) => {
            setDownloads(prev => prev.map(d => (d.id === updated.id ? updated : d)));
          });
        }}
        onResume={(item) => handleStartDownloadItem(item)}
        onCancel={(item) => {
          downloadEngine.stopDownload(item.id);
          setActiveDownloadModalItem(null);
          setDownloads(prev =>
            prev.map(d => (d.id === item.id ? { ...d, status: 'paused', speed: 'Cancelled' } : d))
          );
        }}
        onUpdateSettings={handleUpdateSettings}
      />

      <DownloadCompleteModal
        item={completedModalItem}
        settings={settings}
        onClose={() => setCompletedModalItem(null)}
      />

      <OptionsModal
        isOpen={isOptionsOpen}
        settings={settings}
        onClose={() => setIsOptionsOpen(false)}
        onSave={(newSettings) => handleUpdateSettings(newSettings)}
      />

      <SchedulerModal
        isOpen={isSchedulerOpen}
        settings={settings}
        onClose={() => setIsSchedulerOpen(false)}
        onSave={(newSettings) => handleUpdateSettings(newSettings)}
      />

      <SiteGrabberModal
        isOpen={isGrabberOpen}
        settings={settings}
        onClose={() => setIsGrabberOpen(false)}
        onStartGrab={(url, fileType) => {
          handleAddUrlSubmit(url, false);
        }}
      />

      <AboutModal
        isOpen={isAboutOpen}
        settings={settings}
        onClose={() => setIsAboutOpen(false)}
      />

      <MediaSnifferModal
        isOpen={isMediaSnifferOpen}
        settings={settings}
        onClose={() => setIsMediaSnifferOpen(false)}
        onCaptureVideo={(videoUrl, format) => {
          handleConfirmDownloadInfo({
            title: `Big_Buck_Bunny_${format.quality.replace(/\s+/g, '_')}.${format.container.toLowerCase()}`,
            url: videoUrl,
            category: 'video',
            savePath: `${settings.categoriesDirs.video}\\Big_Buck_Bunny.${format.container.toLowerCase()}`,
            totalBytes: 158008374,
            format,
            startImmediately: true,
          });
        }}
      />
    </div>
  );
};

export default App;

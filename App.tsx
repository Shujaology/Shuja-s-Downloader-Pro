import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, Link2, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import type { Category, DownloadItem, LibraryView, SortKey, SortState } from './types';
import { downloadManager } from './services/downloadManager';
import { soundEffects } from './services/soundEffects';
import { toast } from './services/toast';
import { useDownloads, useResolvedTheme, useSettings } from './hooks/useStores';
import { extractUrls } from './lib/format';
import { Sidebar, VIEW_FILTERS } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DownloadList } from './components/DownloadList';
import { DetailsPanel } from './components/DetailsPanel';
import { StatusBar } from './components/StatusBar';
import { StatCards } from './components/StatCards';
import { Toaster } from './components/Toaster';
import { NewDownloadDialog } from './components/NewDownloadDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { ContextMenu, type MenuEntry } from './components/ContextMenu';
import { Button, isActive, progressOf } from './components/ui';

const TRANSFER_KEY = 'sdp_transfer_today';
const todayKey = () => new Date().toDateString();

function loadTransferredToday(): number {
  try {
    const saved = JSON.parse(localStorage.getItem(TRANSFER_KEY) ?? 'null') as { day: string; bytes: number } | null;
    return saved && saved.day === todayKey() ? saved.bytes : 0;
  } catch {
    return 0;
  }
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

function sortItems(items: DownloadItem[], sort: SortState) {
  const value = (i: DownloadItem): number | string => {
    switch (sort.key) {
      case 'filename':
        return i.filename.toLowerCase();
      case 'totalBytes':
        return i.totalBytes ?? -1;
      case 'progress':
        return progressOf(i) ?? -1;
      case 'speed':
        return i.speed;
      default:
        return i.addedAt;
    }
  };
  return [...items].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number);
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}

export const App: React.FC = () => {
  const items = useDownloads();
  const [settings, updateSettings] = useSettings();
  const dark = useResolvedTheme(settings.theme);

  const [view, setView] = useState<LibraryView>('all');
  const [category, setCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'addedAt', dir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; item: DownloadItem } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [transferredToday, setTransferredToday] = useState(loadTransferredToday);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => soundEffects.setSoundEnabled(settings.sound), [settings.sound]);

  useEffect(() => {
    const notify = (title: string, body: string) => {
      if (settings.notifications && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.svg' });
      }
    };
    downloadManager.events = {
      completed: item => {
        soundEffects.playComplete();
        toast('Download complete', item.filename, 'success');
        notify('Download complete', item.filename);
      },
      failed: item => {
        soundEffects.playError();
        toast(`Couldn't download ${item.filename}`, item.error, 'error');
        notify('Download failed', `${item.filename}: ${item.error ?? ''}`);
      },
    };
  }, [settings.notifications]);

  useEffect(() => {
    const received = new Map(downloadManager.getSnapshot().map(i => [i.id, i.receivedBytes]));
    let day = todayKey();
    let bytes = loadTransferredToday();
    const t = window.setInterval(() => {
      const snapshot = downloadManager.getSnapshot();
      const total = snapshot.reduce((n, i) => n + (isActive(i) ? i.speed : 0), 0);
      setSpeedHistory(h => [...h.slice(-59), total]);

      if (todayKey() !== day) {
        day = todayKey();
        bytes = 0;
      }
      let delta = 0;
      for (const i of snapshot) {
        delta += Math.max(0, i.receivedBytes - (received.get(i.id) ?? 0));
        received.set(i.id, i.receivedBytes);
      }
      if (delta > 0) {
        bytes += delta;
        setTransferredToday(bytes);
        localStorage.setItem(TRANSFER_KEY, JSON.stringify({ day, bytes }));
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  // Scheduler: resume at start time, pause at stop time.
  useEffect(() => {
    if (!settings.scheduleEnabled) return;
    let last = '';
    const check = () => {
      const now = new Date();
      const hhmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (hhmm === last) return;
      last = hhmm;
      if (hhmm === settings.scheduleStart) {
        downloadManager.startAll();
        toast('Scheduler started your downloads');
      } else if (hhmm === settings.scheduleStop) {
        void downloadManager.pauseAll();
        toast('Scheduler paused your downloads');
      }
    };
    const t = window.setInterval(check, 15_000);
    check();
    return () => window.clearInterval(t);
  }, [settings.scheduleEnabled, settings.scheduleStart, settings.scheduleStop]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter(
      i => VIEW_FILTERS[view](i) && (!category || i.category === category) && (!q || i.filename.toLowerCase().includes(q) || i.url.toLowerCase().includes(q)),
    );
    return sortItems(filtered, sort);
  }, [items, view, category, search, sort]);

  const detailsItem = items.find(i => i.id === detailsId) ?? null;
  const selectedItems = items.filter(i => selected.has(i.id));

  useEffect(() => {
    const ids = new Set(items.map(i => i.id));
    setSelected(prev => {
      const next = new Set([...prev].filter(id => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
    if (detailsId && !ids.has(detailsId)) setDetailsId(null);
  }, [items, detailsId]);

  const openNew = useCallback((text = '') => {
    setNewText(text);
    setNewOpen(true);
  }, []);

  const primaryAction = useCallback(async (item: DownloadItem) => {
    if (isActive(item) || item.status === 'queued') return downloadManager.pause(item.id);
    if (item.status === 'completed') {
      const ok = await downloadManager.saveToDisk(item.id);
      if (!ok) toast('File is no longer in browser storage', 'Restart the download to get it again.', 'error');
      return;
    }
    downloadManager.start(item.id);
  }, []);

  const removeItems = useCallback(async (targets: DownloadItem[]) => {
    await Promise.all(targets.map(i => downloadManager.remove(i.id)));
    if (targets.length) toast(targets.length === 1 ? `Removed ${targets[0].filename}` : `Removed ${targets.length} downloads`);
  }, []);

  const addMany = useCallback((urls: string[], start: boolean) => {
    urls.forEach(url => downloadManager.addUnprobed(url, start));
    toast(`Added ${urls.length} download${urls.length === 1 ? '' : 's'}`);
  }, []);

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey && anchor) {
      const ids = visible.map(i => i.id);
      const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y);
      setSelected(new Set(ids.slice(a, b + 1)));
    } else if (e.metaKey || e.ctrlKey) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setAnchor(id);
    } else {
      setSelected(new Set([id]));
      setAnchor(id);
      setDetailsId(id);
    }
  };

  const handleSort = (key: SortKey) =>
    setSort(prev => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'filename' ? 'asc' : 'desc' }));

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (newOpen || settingsOpen || isTyping(e.target)) return;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openNew();
      } else if (e.key === ',') {
        setSettingsOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelected(new Set(visible.map(i => i.id)));
      } else if (e.key === 'Escape') {
        setSelected(new Set());
        setDetailsId(null);
      } else if (e.key === ' ' && selectedItems.length) {
        e.preventDefault();
        const anyActive = selectedItems.some(i => isActive(i) || i.status === 'queued');
        selectedItems.forEach(i => (anyActive ? downloadManager.pause(i.id) : i.status !== 'completed' && downloadManager.start(i.id)));
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItems.length) {
        e.preventDefault();
        void removeItems(selectedItems);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newOpen, settingsOpen, visible, selectedItems, openNew, removeItems]);

  // Paste or drop links anywhere
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (newOpen || isTyping(e.target)) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (extractUrls(text).length) {
        e.preventDefault();
        openNew(text);
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.some(t => t === 'text/uri-list' || t === 'text/plain')) return;
      e.preventDefault();
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const text = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || '';
      const urls = extractUrls(text);
      if (urls.length) openNew(urls.join('\n'));
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [newOpen, openNew]);

  const menuEntries = (item: DownloadItem): MenuEntry[] => {
    const active = isActive(item) || item.status === 'queued';
    return [
      active
        ? { label: 'Pause', icon: Pause, onClick: () => downloadManager.pause(item.id), shortcut: 'Space' }
        : item.status === 'completed'
          ? { label: 'Save file', icon: Download, onClick: () => primaryAction(item), disabled: item.fileAvailable === false }
          : { label: item.status === 'error' ? 'Retry' : 'Resume', icon: Play, onClick: () => downloadManager.start(item.id), shortcut: 'Space' },
      { label: 'Restart from scratch', icon: RotateCcw, onClick: () => downloadManager.restart(item.id) },
      'separator',
      { label: 'Copy link', icon: Copy, onClick: () => navigator.clipboard?.writeText(item.url) },
      { label: 'Open link in new tab', icon: ExternalLink, onClick: () => window.open(item.url, '_blank', 'noopener') },
      { label: 'Show details', icon: Link2, onClick: () => setDetailsId(item.id) },
      'separator',
      { label: 'Remove', icon: Trash2, onClick: () => removeItems([item]), danger: true, shortcut: 'Del' },
    ];
  };

  const totalSpeed = items.reduce((n, i) => n + (isActive(i) ? i.speed : 0), 0);
  const activeThreads = items.reduce((n, i) => n + (isActive(i) ? i.segments.filter(s => s.active).length : 0), 0);
  const clearFinished = () => {
    void downloadManager.clearCompleted();
    toast('Cleared finished downloads');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        settings={settings}
        onUpdateSettings={updateSettings}
        dark={dark}
        canStartAll={items.some(i => ['paused', 'error', 'queued'].includes(i.status))}
        canPauseAll={items.some(i => isActive(i) || i.status === 'queued')}
        onStartAll={() => downloadManager.startAll()}
        onPauseAll={() => downloadManager.pauseAll()}
        canClearFinished={items.some(i => i.status === 'completed')}
        onClearFinished={clearFinished}
        onNew={() => openNew()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar items={items} view={view} category={category} settings={settings} onView={setView} onCategory={setCategory} />

        <main className="flex min-w-0 flex-1 flex-col">
          <StatCards speed={totalSpeed} threads={activeThreads} transferredToday={transferredToday} speedHistory={speedHistory} />

          {selected.size > 1 && (
            <div className="animate-fade-in flex h-11 shrink-0 items-center gap-2 mx-4 mb-2 rounded-xl border border-indigo-500/30 bg-indigo-50 px-4 text-sm dark:bg-indigo-500/10">
              <span className="font-medium">{selected.size} selected</span>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" icon={Play} onClick={() => selectedItems.forEach(i => i.status !== 'completed' && downloadManager.start(i.id))}>
                  Resume
                </Button>
                <Button size="sm" icon={Pause} onClick={() => selectedItems.forEach(i => downloadManager.pause(i.id))}>
                  Pause
                </Button>
                <Button size="sm" icon={Trash2} onClick={() => removeItems(selectedItems)}>
                  Remove
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1">
            <DownloadList
              items={visible}
              selected={selected}
              sort={sort}
              onSort={handleSort}
              onSelect={handleSelect}
              onOpen={id => {
                const item = items.find(i => i.id === id);
                if (item) void primaryAction(item);
              }}
              onPrimaryAction={primaryAction}
              onContextMenu={(e, item) => {
                e.preventDefault();
                if (!selected.has(item.id)) {
                  setSelected(new Set([item.id]));
                  setAnchor(item.id);
                }
                setMenu({ x: e.clientX, y: e.clientY, item });
              }}
              onNew={() => openNew()}
              onAddSample={url => openNew(url)}
              isEmptyLibrary={items.length === 0}
            />
            {detailsItem && (
              <DetailsPanel
                item={detailsItem}
                onClose={() => setDetailsId(null)}
                onPrimaryAction={primaryAction}
                onRestart={item => downloadManager.restart(item.id)}
                onRemove={item => removeItems([item])}
              />
            )}
          </div>
        </main>
      </div>

      <StatusBar items={items} settings={settings} />

      {menu && <ContextMenu x={menu.x} y={menu.y} entries={menuEntries(menu.item)} onClose={() => setMenu(null)} />}

      <NewDownloadDialog
        open={newOpen}
        initialText={newText}
        defaultConnections={settings.connections}
        onClose={() => setNewOpen(false)}
        onAdd={(probe, options) => {
          const item = downloadManager.add(probe, options);
          setSelected(new Set([item.id]));
          setDetailsId(item.id);
          setView('all');
          setCategory(null);
        }}
        onAddMany={addMany}
      />

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
        onClearCompleted={clearFinished}
      />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-blue-600/10 p-6 backdrop-blur-[2px]">
          <div className="flex h-full w-full items-center justify-center rounded-3xl border-2 border-dashed border-blue-500">
            <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-xl dark:bg-zinc-900">
              <Download className="mx-auto size-6 text-blue-600" />
              <div className="mt-2 text-sm font-semibold">Drop links to download</div>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
};

export default App;

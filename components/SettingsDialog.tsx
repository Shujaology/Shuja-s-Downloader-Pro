import React from 'react';
import { Monitor, Moon, Settings2, Sun } from 'lucide-react';
import type { Settings } from '../types';
import { Button, Dialog, Kbd, Switch, cn, inputClass } from './ui';

interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onClose: () => void;
  onClearCompleted: () => void;
}

function Row({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">{title}</h3>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
    </section>
  );
}

const SHORTCUTS: [string[], string][] = [
  [['N'], 'New download'],
  [['Ctrl', 'K'], 'Search'],
  [['Space'], 'Pause / resume selected'],
  [['Del'], 'Remove selected'],
  [['Ctrl', 'A'], 'Select all'],
  [['Ctrl', 'V'], 'Paste links to download'],
  [[','], 'Settings'],
];

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, settings, onUpdate, onClose, onClearCompleted }) => {
  const requestNotifications = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    onUpdate({ notifications: enabled });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Settings" icon={Settings2} width="max-w-2xl" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="-mt-1 max-h-[60vh] space-y-6 overflow-y-auto pr-1">
        <Section title="Appearance">
          <Row title="Theme">
            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
              {([
                ['light', Sun, 'Light'],
                ['dark', Moon, 'Dark'],
                ['system', Monitor, 'System'],
              ] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onUpdate({ theme: value })}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition',
                    settings.theme === value ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        <Section title="Downloads">
          <Row title="Connections per file" description="Parallel ranged connections for servers that support it.">
            <select value={settings.connections} onChange={e => onUpdate({ connections: Number(e.target.value) })} className={cn(inputClass, 'w-28 py-1.5')}>
              {[1, 2, 4, 8, 16, 32].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Row>
          <Row title="Simultaneous downloads" description="Extra downloads wait in the queue.">
            <select value={settings.maxConcurrent} onChange={e => onUpdate({ maxConcurrent: Number(e.target.value) })} className={cn(inputClass, 'w-28 py-1.5')}>
              {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Row>
          <Row title="Save to disk automatically" description="Hand finished files to the browser's Downloads folder.">
            <Switch label="Save automatically" checked={settings.autoSave} onChange={v => onUpdate({ autoSave: v })} />
          </Row>
        </Section>

        <Section title="Bandwidth">
          <Row title="Limit download speed" description="Applies to the combined speed of all downloads.">
            <Switch label="Limit speed" checked={settings.speedLimitEnabled} onChange={v => onUpdate({ speedLimitEnabled: v })} />
          </Row>
          <Row title="Maximum speed">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={16}
                step={128}
                value={settings.speedLimitKBps}
                disabled={!settings.speedLimitEnabled}
                onChange={e => onUpdate({ speedLimitKBps: Math.max(16, Number(e.target.value) || 16) })}
                className={cn(inputClass, 'tabular w-28 py-1.5 disabled:opacity-50')}
              />
              <span className="text-xs text-zinc-500">KB/s</span>
            </div>
          </Row>
        </Section>

        <Section title="Scheduler">
          <Row title="Run on a schedule" description="Resume everything at the start time and pause at the stop time (while this tab is open).">
            <Switch label="Enable scheduler" checked={settings.scheduleEnabled} onChange={v => onUpdate({ scheduleEnabled: v })} />
          </Row>
          <Row title="Start / stop">
            <div className="flex items-center gap-2">
              <input type="time" value={settings.scheduleStart} disabled={!settings.scheduleEnabled} onChange={e => onUpdate({ scheduleStart: e.target.value })} className={cn(inputClass, 'w-32 py-1.5 disabled:opacity-50')} />
              <span className="text-zinc-400">→</span>
              <input type="time" value={settings.scheduleStop} disabled={!settings.scheduleEnabled} onChange={e => onUpdate({ scheduleStop: e.target.value })} className={cn(inputClass, 'w-32 py-1.5 disabled:opacity-50')} />
            </div>
          </Row>
        </Section>

        <Section title="Notifications">
          <Row title="Desktop notifications" description="Notify when a download finishes or fails while the tab is in the background.">
            <Switch label="Desktop notifications" checked={settings.notifications} onChange={requestNotifications} />
          </Row>
          <Row title="Sounds">
            <Switch label="Sounds" checked={settings.sound} onChange={v => onUpdate({ sound: v })} />
          </Row>
        </Section>

        <Section title="Storage">
          <Row title="Clear completed downloads" description="Removes finished items and frees the browser storage they use.">
            <Button size="sm" onClick={onClearCompleted}>
              Clear completed
            </Button>
          </Row>
        </Section>

        <Section title="Keyboard shortcuts">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-3">
            {SHORTCUTS.map(([keys, label]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                <span className="flex gap-1">
                  {keys.map(k => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </Dialog>
  );
};

import React, { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './ui';

export type MenuEntry = { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean; disabled?: boolean; shortcut?: string } | 'separator';

export const ContextMenu: React.FC<{ x: number; y: number; entries: MenuEntry[]; onClose: () => void }> = ({ x, y, entries, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 230);
  const top = Math.min(y, window.innerHeight - entries.length * 34 - 16);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left, top }}
      className="animate-pop-in fixed z-50 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {entries.map((entry, i) =>
        entry === 'separator' ? (
          <div key={i} className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={entry.disabled}
            onClick={() => {
              entry.onClick();
              onClose();
            }}
            className={cn(
              'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40',
              entry.danger
                ? 'text-red-600 hover:bg-red-500/10 dark:text-red-400'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
            )}
          >
            <entry.icon className="size-4" strokeWidth={2} />
            <span className="flex-1 text-left">{entry.label}</span>
            {entry.shortcut && <span className="text-[11px] text-zinc-400">{entry.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
};

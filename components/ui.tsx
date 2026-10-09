import React, { useEffect } from 'react';
import {
  AppWindow,
  Archive,
  FileQuestion,
  FileText,
  Film,
  Image,
  Music,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Category, DownloadItem } from '../types';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon; tint: string }> = {
  video: { label: 'Videos', icon: Film, tint: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  music: { label: 'Audio', icon: Music, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  images: { label: 'Images', icon: Image, tint: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400' },
  documents: { label: 'Documents', icon: FileText, tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  compressed: { label: 'Archives', icon: Archive, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  programs: { label: 'Software', icon: AppWindow, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  other: { label: 'Other', icon: FileQuestion, tint: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400' },
};

export function progressOf(item: DownloadItem): number | null {
  if (item.status === 'completed') return 100;
  if (!item.totalBytes) return null;
  return Math.min(100, (item.receivedBytes / item.totalBytes) * 100);
}

export const isActive = (item: DownloadItem) => item.status === 'downloading' || item.status === 'connecting';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-600/30 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50',
  secondary:
    'bg-white text-zinc-800 border border-zinc-200 shadow-xs hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  active,
  className,
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; active?: boolean; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40',
        'focus-visible:outline-2 focus-visible:outline-blue-500',
        size === 'sm' ? 'size-7' : 'size-9',
        active
          ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        className,
      )}
      {...props}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-[18px]'} strokeWidth={2} />
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-1 font-sans text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
      {children}
    </kbd>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-pop-in w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900',
          width,
        )}
      >
        <div className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          {Icon && (
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Icon className="size-[18px]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        checked ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700',
      )}
    >
      <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

const BAR_COLORS: Record<DownloadItem['status'], string> = {
  downloading: 'bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500',
  connecting: 'bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500',
  completed: 'bg-emerald-500',
  paused: 'bg-orange-500',
  queued: 'bg-zinc-400',
  error: 'bg-red-500',
};

export function ProgressBar({ item, className }: { item: DownloadItem; className?: string }) {
  const value = progressOf(item);
  return (
    <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800', className)}>
      {value == null && isActive(item) ? (
        <div className="progress-indeterminate absolute inset-y-0 w-2/5 rounded-full bg-blue-600" />
      ) : (
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            BAR_COLORS[item.status],
            item.status === 'downloading' && 'progress-active',
          )}
          style={{ width: `${value ?? 0}%` }}
        />
      )}
    </div>
  );
}

const PILL: Record<DownloadItem['status'], { label: string; cls: string }> = {
  downloading: { label: 'Downloading', cls: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  connecting: { label: 'Connecting', cls: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  completed: { label: 'Completed', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  paused: { label: 'Paused', cls: 'border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  queued: { label: 'Queued', cls: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300' },
  error: { label: 'Failed', cls: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' },
};

export function StatusPill({ status }: { status: DownloadItem['status'] }) {
  const { label, cls } = PILL[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium', cls)}>
      <span
        className={cn(
          'size-1.5 rounded-full bg-current',
          (status === 'downloading' || status === 'connecting') && 'animate-pulse',
        )}
      />
      {label}
    </span>
  );
}

export function FileIcon({ category, size = 'md' }: { category: Category; size?: 'md' | 'lg' }) {
  const { icon: Icon, tint } = CATEGORY_META[category];
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-xl', tint, size === 'lg' ? 'size-12' : 'size-9')}>
      <Icon className={size === 'lg' ? 'size-6' : 'size-[18px]'} strokeWidth={1.8} />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-600';

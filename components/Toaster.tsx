import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { toastStore } from '../services/toast';
import { useToasts } from '../hooks/useStores';
import { cn } from './ui';

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle };
const TONES = {
  info: 'text-blue-600 dark:text-blue-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
};

export const Toaster: React.FC = () => {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed right-4 bottom-12 z-[60] flex w-80 flex-col gap-2">
      {toasts.map(t => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="animate-pop-in pointer-events-auto flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', TONES[t.tone])} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.title}</div>
              {t.description && <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{t.description}</div>}
            </div>
            <button type="button" onClick={() => toastStore.dismiss(t.id)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" aria-label="Dismiss">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

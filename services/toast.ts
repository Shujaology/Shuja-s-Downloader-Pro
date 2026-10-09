export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const toastStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => toasts,
  dismiss(id: number) {
    toasts = toasts.filter(t => t.id !== id);
    emit();
  },
};

export function toast(title: string, description?: string, tone: ToastTone = 'info') {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, title, description, tone }];
  emit();
  setTimeout(() => toastStore.dismiss(id), tone === 'error' ? 7000 : 4500);
}

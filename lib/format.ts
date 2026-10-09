import type { Category } from '../types';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (bytes == null || !isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 ? 0 : decimals)} ${UNITS[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '—';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${(s % 60).toString().padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, '0')}m`;
}

export function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '').trim();
  return cleaned.slice(0, 200) || 'download';
}

export function parseContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[2].trim().replace(/^"|"$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
  if (plain) return (plain[2] ?? plain[1]).trim();
  return null;
}

export function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    if (last) return sanitizeFilename(decodeURIComponent(last));
    return sanitizeFilename(parsed.hostname);
  } catch {
    return 'download';
  }
}

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/json': 'json',
  'text/html': 'html',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
};

export function ensureExtension(filename: string, mimeType?: string): string {
  if (/\.[a-z0-9]{1,8}$/i.test(filename) || !mimeType) return filename;
  const ext = MIME_EXT[mimeType.split(';')[0].trim().toLowerCase()];
  return ext ? `${filename}.${ext}` : filename;
}

const CATEGORY_EXT: [Category, RegExp][] = [
  ['video', /\.(mp4|mkv|avi|webm|mov|flv|wmv|m4v|3gp|mpeg|mpg|ts)$/],
  ['music', /\.(mp3|wav|flac|aac|m4a|ogg|oga|wma|opus|alac)$/],
  ['images', /\.(jpe?g|png|gif|webp|bmp|svg|tiff?|heic|avif|ico)$/],
  ['documents', /\.(pdf|docx?|txt|xlsx?|pptx?|epub|csv|rtf|odt|ods|md|json|xml)$/],
  ['compressed', /\.(zip|rar|7z|tar|gz|tgz|bz2|xz|zst|iso|dmg)$/],
  ['programs', /\.(exe|msi|apk|pkg|deb|rpm|appimage|bat|cmd|sh|jar|js|wasm)$/],
];

export function detectCategory(filename: string, mimeType?: string): Category {
  const name = filename.toLowerCase();
  for (const [category, re] of CATEGORY_EXT) {
    if (re.test(name)) return category;
  }
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'music';
  if (mime.startsWith('image/')) return 'images';
  if (mime.startsWith('text/') || mime.includes('pdf')) return 'documents';
  if (mime.includes('zip') || mime.includes('compressed')) return 'compressed';
  return 'other';
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  return Array.from(new Set(matches.map(u => u.replace(/[),.;]+$/, ''))));
}

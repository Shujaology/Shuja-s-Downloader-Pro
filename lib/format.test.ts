import { describe, expect, it } from 'vitest';
import { detectCategory, ensureExtension, extractUrls, filenameFromUrl, formatBytes, parseContentDisposition } from './format';

describe('format helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(300 * 1024 * 1024)).toBe('300 MB');
    expect(formatBytes(null)).toBe('—');
  });

  it('parses Content-Disposition', () => {
    expect(parseContentDisposition('attachment; filename="report.pdf"')).toBe('report.pdf');
    expect(parseContentDisposition("attachment; filename*=UTF-8''na%C3%AFve%20file.txt")).toBe('naïve file.txt');
    expect(parseContentDisposition(null)).toBeNull();
  });

  it('derives filenames from URLs', () => {
    expect(filenameFromUrl('https://example.com/a/b/My%20File.zip?x=1')).toBe('My File.zip');
    expect(filenameFromUrl('https://example.com/')).toBe('example.com');
    expect(ensureExtension('download', 'application/pdf')).toBe('download.pdf');
    expect(ensureExtension('movie.mp4', 'application/pdf')).toBe('movie.mp4');
  });

  it('detects categories', () => {
    expect(detectCategory('movie.MKV')).toBe('video');
    expect(detectCategory('song.flac')).toBe('music');
    expect(detectCategory('archive.tar.gz')).toBe('compressed');
    expect(detectCategory('blob', 'image/png')).toBe('images');
    expect(detectCategory('blob')).toBe('other');
  });

  it('extracts unique URLs from text', () => {
    expect(extractUrls('see https://a.com/x.zip, and https://a.com/x.zip\nhttp://b.org/y')).toEqual([
      'https://a.com/x.zip',
      'http://b.org/y',
    ]);
  });
});

import type { Segment } from '../types';

export const MIN_SEGMENT_BYTES = 1024 * 1024;

export function remainingBytes(seg: Segment): number {
  if (seg.end < 0) return Infinity;
  return Math.max(0, seg.end - seg.start + 1 - seg.received);
}

export function isSegmentDone(seg: Segment): boolean {
  return seg.end >= 0 && remainingBytes(seg) === 0;
}

/** Split a file into up to `connections` contiguous byte ranges. */
export function planSegments(totalBytes: number | null, connections: number, resumable: boolean): Segment[] {
  if (!resumable || totalBytes == null || totalBytes <= 0) {
    return [{ id: 0, start: 0, end: totalBytes && totalBytes > 0 ? totalBytes - 1 : -1, received: 0, active: false, speed: 0 }];
  }
  const count = Math.max(1, Math.min(connections, Math.floor(totalBytes / MIN_SEGMENT_BYTES)));
  const size = Math.ceil(totalBytes / count);
  const segments: Segment[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * size;
    if (start >= totalBytes) break;
    segments.push({ id: i, start, end: Math.min(totalBytes, start + size) - 1, received: 0, active: false, speed: 0 });
  }
  return segments;
}

/**
 * Dynamic segmentation: take the unfinished segment with the most bytes left and give
 * its second half to a new segment, so an idle connection can help finish the file.
 * Mutates `segments` and returns the new segment, or null when nothing is worth splitting.
 */
export function splitLargestSegment(segments: Segment[]): Segment | null {
  let target: Segment | null = null;
  for (const seg of segments) {
    if (seg.end < 0) continue;
    if (!target || remainingBytes(seg) > remainingBytes(target)) target = seg;
  }
  if (!target) return null;
  const remaining = remainingBytes(target);
  if (remaining < MIN_SEGMENT_BYTES * 2) return null;

  const cursor = target.start + target.received;
  const mid = cursor + Math.floor(remaining / 2);
  const created: Segment = {
    id: Math.max(...segments.map(s => s.id)) + 1,
    start: mid,
    end: target.end,
    received: 0,
    active: false,
    speed: 0,
  };
  target.end = mid - 1;
  segments.push(created);
  segments.sort((a, b) => a.start - b.start);
  return created;
}

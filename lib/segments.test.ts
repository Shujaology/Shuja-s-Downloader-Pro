import { describe, expect, it } from 'vitest';
import { MIN_SEGMENT_BYTES, planSegments, remainingBytes, splitLargestSegment } from './segments';

const MB = MIN_SEGMENT_BYTES;

describe('planSegments', () => {
  it('covers the whole file with contiguous, non-overlapping ranges', () => {
    const total = 100 * MB + 123;
    const segs = planSegments(total, 8, true);
    expect(segs).toHaveLength(8);
    expect(segs[0].start).toBe(0);
    expect(segs[segs.length - 1].end).toBe(total - 1);
    for (let i = 1; i < segs.length; i++) expect(segs[i].start).toBe(segs[i - 1].end + 1);
  });

  it('uses fewer connections for small files', () => {
    expect(planSegments(3 * MB, 8, true)).toHaveLength(3);
    expect(planSegments(1000, 8, true)).toHaveLength(1);
  });

  it('falls back to a single stream when ranges are not supported or size is unknown', () => {
    expect(planSegments(50 * MB, 8, false)).toEqual([expect.objectContaining({ start: 0, end: 50 * MB - 1 })]);
    expect(planSegments(null, 8, true)).toEqual([expect.objectContaining({ start: 0, end: -1 })]);
  });
});

describe('splitLargestSegment', () => {
  it('halves the remaining part of the largest unfinished segment', () => {
    const segs = planSegments(16 * MB, 2, true);
    segs[0].received = 8 * MB;
    segs[1].received = 2 * MB;
    const created = splitLargestSegment(segs)!;
    expect(created).not.toBeNull();
    const original = segs.find(s => s.id === 1)!;
    expect(original.end + 1).toBe(created.start);
    expect(created.end).toBe(16 * MB - 1);
    expect(remainingBytes(original) + remainingBytes(created)).toBe(6 * MB);
  });

  it('refuses to split tiny remainders', () => {
    const segs = planSegments(4 * MB, 2, true);
    segs[0].received = 2 * MB;
    segs[1].received = 2 * MB - 100;
    expect(splitLargestSegment(segs)).toBeNull();
  });
});

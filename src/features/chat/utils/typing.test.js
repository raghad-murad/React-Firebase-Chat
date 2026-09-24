import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTypingRecent, TYPING_STALE_MS } from './typing.js';

const NOW = new Date('2026-09-23T15:30:00.000Z').getTime();

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('isTypingRecent', () => {
    it('is false for a null/undefined timestamp', () => {
        expect(isTypingRecent(null)).toBe(false);
        expect(isTypingRecent(undefined)).toBe(false);
    });

    it('is false for a malformed value without toMillis', () => {
        expect(isTypingRecent({ seconds: 1 })).toBe(false);
    });

    it('is true for a timestamp within the staleness threshold', () => {
        const ts = { toMillis: () => NOW - (TYPING_STALE_MS - 500) };
        expect(isTypingRecent(ts)).toBe(true);
    });

    it('is false for a timestamp older than the staleness threshold (a crashed tab mid-type)', () => {
        const ts = { toMillis: () => NOW - (TYPING_STALE_MS + 500) };
        expect(isTypingRecent(ts)).toBe(false);
    });
});

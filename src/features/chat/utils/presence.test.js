import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isUserOnline, PRESENCE_THRESHOLD_MS } from './presence.js';

const NOW = new Date('2026-09-23T15:30:00.000Z').getTime();

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('isUserOnline', () => {
    it('is false for a null/missing profile', () => {
        expect(isUserOnline(null)).toBe(false);
        expect(isUserOnline(undefined)).toBe(false);
    });

    it('is false when the raw online flag is not true', () => {
        expect(isUserOnline({ online: false, lastSeen: { toMillis: () => NOW } })).toBe(false);
        expect(isUserOnline({ lastSeen: { toMillis: () => NOW } })).toBe(false);
    });

    it('is false when online but lastSeen is missing or malformed', () => {
        expect(isUserOnline({ online: true })).toBe(false);
        expect(isUserOnline({ online: true, lastSeen: {} })).toBe(false);
    });

    it('is true when online and lastSeen is fresh (within the threshold)', () => {
        const lastSeen = { toMillis: () => NOW - (PRESENCE_THRESHOLD_MS - 1000) };
        expect(isUserOnline({ online: true, lastSeen })).toBe(true);
    });

    it('is false when online but lastSeen is stale (a crashed tab that never wrote offline)', () => {
        const lastSeen = { toMillis: () => NOW - (PRESENCE_THRESHOLD_MS + 1000) };
        expect(isUserOnline({ online: true, lastSeen })).toBe(false);
    });
});

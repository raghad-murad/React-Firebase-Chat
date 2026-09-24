import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    toIsoString,
    formatMessageTime,
    formatConversationTimestamp,
    formatDateDivider,
    isSameDayGroup,
    formatLastSeen,
} from './formatTime.js';

const NOW = new Date('2026-09-23T15:30:00.000Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('toIsoString', () => {
    it('falls back to "now" for a null/undefined value (a serverTimestamp() still pending locally)', () => {
        expect(toIsoString(null)).toBe(NOW.toISOString());
        expect(toIsoString(undefined)).toBe(NOW.toISOString());
    });

    it('converts a Firestore-Timestamp-shaped object via its toDate()', () => {
        const fakeTimestamp = { toDate: () => new Date('2026-01-01T00:00:00.000Z') };
        expect(toIsoString(fakeTimestamp)).toBe('2026-01-01T00:00:00.000Z');
    });

    it('parses anything else the Date constructor accepts', () => {
        expect(toIsoString('2026-05-05T00:00:00.000Z')).toBe('2026-05-05T00:00:00.000Z');
    });
});

describe('isSameDayGroup', () => {
    it('is true for two timestamps on the same calendar day', () => {
        expect(isSameDayGroup('2026-09-23T00:05:00.000Z', '2026-09-23T23:55:00.000Z')).toBe(true);
    });

    it('is false across a midnight boundary', () => {
        expect(isSameDayGroup('2026-09-23T23:59:00.000Z', '2026-09-24T00:01:00.000Z')).toBe(false);
    });
});

describe('formatDateDivider', () => {
    it('returns "Today" for the current date', () => {
        expect(formatDateDivider(NOW.toISOString())).toBe('Today');
    });

    it('returns "Yesterday" for the day before', () => {
        const yesterday = new Date(NOW);
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatDateDivider(yesterday.toISOString())).toBe('Yesterday');
    });

    it('omits the year for an older date in the same year', () => {
        const sameYearOlder = new Date('2026-03-01T12:00:00.000Z');
        const result = formatDateDivider(sameYearOlder.toISOString());
        expect(result).not.toBe('Today');
        expect(result).not.toBe('Yesterday');
        expect(result).not.toContain('2026');
    });

    it('includes the year for a date in a different year', () => {
        const differentYear = new Date('2024-03-01T12:00:00.000Z');
        expect(formatDateDivider(differentYear.toISOString())).toContain('2024');
    });
});

describe('formatConversationTimestamp', () => {
    it('matches formatMessageTime for a timestamp today', () => {
        expect(formatConversationTimestamp(NOW.toISOString())).toBe(formatMessageTime(NOW.toISOString()));
    });

    it('returns "Yesterday" for the day before', () => {
        const yesterday = new Date(NOW);
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatConversationTimestamp(yesterday.toISOString())).toBe('Yesterday');
    });

    it('falls back to a short date for older timestamps', () => {
        const older = new Date('2026-01-15T12:00:00.000Z');
        const result = formatConversationTimestamp(older.toISOString());
        expect(result).not.toBe('Today');
        expect(result).not.toBe('Yesterday');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('formatLastSeen', () => {
    it('returns null when there is no lastSeen value', () => {
        expect(formatLastSeen(null)).toBeNull();
        expect(formatLastSeen(undefined)).toBeNull();
    });

    it('returns null for a value without a toMillis function (not a real Timestamp)', () => {
        expect(formatLastSeen({ seconds: 123 })).toBeNull();
    });

    it('returns "just now" under a minute ago', () => {
        const ts = { toMillis: () => NOW.getTime() - 30_000 };
        expect(formatLastSeen(ts)).toBe('last seen just now');
    });

    it('returns minutes ago under an hour', () => {
        const ts = { toMillis: () => NOW.getTime() - 5 * 60_000 };
        expect(formatLastSeen(ts)).toBe('last seen 5m ago');
    });

    it('returns hours ago under a day', () => {
        const ts = { toMillis: () => NOW.getTime() - 3 * 60 * 60_000 };
        expect(formatLastSeen(ts)).toBe('last seen 3h ago');
    });

    it('returns days ago beyond a day', () => {
        const ts = { toMillis: () => NOW.getTime() - 2 * 24 * 60 * 60_000 };
        expect(formatLastSeen(ts)).toBe('last seen 2d ago');
    });
});

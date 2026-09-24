import { describe, it, expect } from 'vitest';
import { formatFileSize } from './formatFileSize.js';

describe('formatFileSize', () => {
    it('returns "" for non-finite or negative input', () => {
        expect(formatFileSize(NaN)).toBe('');
        expect(formatFileSize(-1)).toBe('');
        expect(formatFileSize(Infinity)).toBe('');
    });

    it('formats whole bytes with no decimal', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(500)).toBe('500 B');
        expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('formats the KB boundary at exactly 1024 bytes', () => {
        expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('rounds to one decimal place within KB', () => {
        expect(formatFileSize(1500)).toBe('1.5 KB');
    });

    it('formats the MB boundary at exactly 1024*1024 bytes', () => {
        expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });

    it('formats the GB boundary at exactly 1024^3 bytes', () => {
        expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('caps at GB for values beyond a gigabyte (no TB unit)', () => {
        expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1024.0 GB');
    });
});

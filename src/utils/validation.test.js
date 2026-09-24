import { describe, it, expect } from 'vitest';
import { nameValidation, emailValidation, passwordValidation, usernameValidation } from './validation.js';

describe('nameValidation', () => {
    it('rejects empty/whitespace-only values', () => {
        expect(nameValidation('')).toEqual({ isValid: false, error: 'Contact Name is required!' });
        expect(nameValidation('   ')).toEqual({ isValid: false, error: 'Contact Name is required!' });
    });

    it('rejects names shorter than 3 characters', () => {
        const result = nameValidation('Al');
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/at least 3 characters/);
    });

    it('rejects names with non-letter/space characters', () => {
        const result = nameValidation('Jane99');
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/invalid characters/);
    });

    it('accepts a valid name', () => {
        expect(nameValidation('Jane Doe')).toEqual({ isValid: true, error: '' });
    });
});

describe('emailValidation', () => {
    it('rejects empty values', () => {
        expect(emailValidation('')).toEqual({ isValid: false, error: 'Email is required!' });
    });

    it('rejects emails shorter than 10 characters', () => {
        const result = emailValidation('a@b.co');
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/at least 10 characters/);
    });

    it('rejects emails containing spaces', () => {
        const result = emailValidation('test user@example.com');
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/cannot contain spaces/);
    });

    it('rejects emails without exactly one @', () => {
        expect(emailValidation('testuserexample.com').error).toMatch(/exactly one/);
        expect(emailValidation('test@user@example.com').error).toMatch(/exactly one/);
    });

    it('rejects invalid characters in the username part', () => {
        const result = emailValidation('test!user@example.com');
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/invalid characters in username/);
    });

    it('rejects a username starting or ending with underscore', () => {
        expect(emailValidation('_testuser@example.com').error).toMatch(/cannot start or end with underscore/);
        expect(emailValidation('testuser_@example.com').error).toMatch(/cannot start or end with underscore/);
    });

    it('rejects consecutive dots in the username part', () => {
        const result = emailValidation('test..user@example.com');
        expect(result.error).toMatch(/username cannot contain consecutive dots/);
    });

    it('rejects consecutive dots in the domain part', () => {
        const result = emailValidation('testuser@example..com');
        expect(result.error).toMatch(/domain cannot contain consecutive dots/);
    });

    it('rejects a domain with no dot (missing TLD separator)', () => {
        const result = emailValidation('testuser@domaincom');
        expect(result.error).toMatch(/username@domain\.tld/);
    });

    it('rejects a domain with an empty part', () => {
        const result = emailValidation('testuser@.domain.com');
        expect(result.error).toMatch(/domain cannot contain empty parts/);
    });

    it('rejects a domain part with invalid characters', () => {
        const result = emailValidation('testuser@do_main.com');
        expect(result.error).toMatch(/domain contains invalid characters/);
    });

    it('rejects an invalid top-level domain', () => {
        const result = emailValidation('testuser@domain.c');
        expect(result.error).toMatch(/invalid top-level domain/);
    });

    it('accepts a valid email', () => {
        expect(emailValidation('test.user@example.com')).toEqual({ isValid: true, error: '' });
    });
});

describe('passwordValidation', () => {
    it('rejects empty values', () => {
        expect(passwordValidation('')).toEqual({ isValid: false, error: 'Password is required!' });
    });

    it('rejects passwords shorter than 8 characters', () => {
        const result = passwordValidation('Ab1!');
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/at least 8 characters/);
    });

    it('rejects passwords missing an uppercase letter', () => {
        expect(passwordValidation('lowercase1!').error).toMatch(/uppercase letter/);
    });

    it('rejects passwords missing a lowercase letter', () => {
        expect(passwordValidation('UPPERCASE1!').error).toMatch(/lowercase letter/);
    });

    it('rejects passwords missing a number', () => {
        expect(passwordValidation('NoNumbers!').error).toMatch(/one number/);
    });

    it('rejects passwords missing a special character', () => {
        expect(passwordValidation('NoSpecial1').error).toMatch(/special character/);
    });

    it('accepts a valid password', () => {
        expect(passwordValidation('Passw0rd!')).toEqual({ isValid: true, error: '' });
    });
});

describe('usernameValidation', () => {
    it('rejects an empty/whitespace-only value as required', () => {
        expect(usernameValidation('')).toEqual({ isValid: false, error: 'Username is required.' });
        expect(usernameValidation('   ')).toEqual({ isValid: false, error: 'Username is required.' });
        expect(usernameValidation(undefined)).toEqual({ isValid: false, error: 'Username is required.' });
    });

    it('rejects a username containing spaces', () => {
        const result = usernameValidation('john doe');
        expect(result.isValid).toBe(false);
    });

    it('rejects disallowed symbols and emoji', () => {
        expect(usernameValidation('john@doe').isValid).toBe(false);
        expect(usernameValidation('john😀doe').isValid).toBe(false);
    });

    it('accepts the allowed character set (lowercase letters, digits, ., _, -)', () => {
        expect(usernameValidation('ab.cd_ef-1')).toEqual({ isValid: true, error: '' });
    });

    it('auto-lowercases and trims before validating, so uppercase input is accepted', () => {
        expect(usernameValidation('  ABCdef  ')).toEqual({ isValid: true, error: '' });
    });

    it('enforces the minimum length (3)', () => {
        expect(usernameValidation('ab').isValid).toBe(false);
        expect(usernameValidation('abc').isValid).toBe(true);
    });

    it('enforces the maximum length (20)', () => {
        expect(usernameValidation('a'.repeat(20)).isValid).toBe(true);
        expect(usernameValidation('a'.repeat(21)).isValid).toBe(false);
    });
});

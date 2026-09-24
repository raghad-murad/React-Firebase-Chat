import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted so the vi.mock factories below (which run before normal imports)
// can reference these fakes without a TDZ error.
const mocks = vi.hoisted(() => ({
    setDoc: vi.fn().mockResolvedValue(undefined),
    doc: vi.fn((...args) => ({ __refArgs: args })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP_SENTINEL'),
    onSnapshot: vi.fn(),
    collection: vi.fn((...args) => ({ __collectionArgs: args })),
    query: vi.fn((...args) => ({ __queryArgs: args })),
    where: vi.fn((...args) => ({ __whereArgs: args })),
    orderBy: vi.fn((...args) => ({ __orderByArgs: args })),
    startAt: vi.fn((value) => ({ __startAt: value })),
    endAt: vi.fn((value) => ({ __endAt: value })),
    limit: vi.fn((n) => ({ __limit: n })),
    updateProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/firestore', () => ({
    doc: mocks.doc,
    getDoc: mocks.getDoc,
    setDoc: mocks.setDoc,
    deleteDoc: mocks.deleteDoc,
    serverTimestamp: mocks.serverTimestamp,
    onSnapshot: mocks.onSnapshot,
    collection: mocks.collection,
    query: mocks.query,
    where: mocks.where,
    orderBy: mocks.orderBy,
    startAt: mocks.startAt,
    endAt: mocks.endAt,
    limit: mocks.limit,
    getDocs: mocks.getDocs,
}));

vi.mock('firebase/auth', () => ({
    updateProfile: mocks.updateProfile,
}));

vi.mock('@/firebase/firebase.js', () => ({
    db: {},
    auth: { currentUser: null },
}));

const {
    upsertUserProfile,
    setUserPresence,
    setUserOffline,
    getUser,
    subscribeToUser,
    findUserByEmail,
    searchUsersByUsername,
    searchUsers,
} = await import('./userService.js');

beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear());
});

describe('upsertUserProfile', () => {
    // Regression test: upsertUserProfile runs on every sign-in, and it must
    // never write photoURL or username — both are owned exclusively by
    // updateUserProfile ("About Me" save). A real bug shipped once where
    // this clobbered the saved avatar/username with Auth's empty defaults
    // on every login; this guards against that happening again.
    it('writes uid/email/name/online/lastSeen with merge:true, and never touches photoURL or username', async () => {
        const fakeAuthUser = {
            uid: 'u1',
            email: 'a@b.com',
            displayName: 'A',
            photoURL: 'data:image/jpeg;base64,AAAA',
        };

        await upsertUserProfile(fakeAuthUser);

        expect(mocks.setDoc).toHaveBeenCalledTimes(1);
        const [, payload, options] = mocks.setDoc.mock.calls[0];

        expect(payload).toMatchObject({
            uid: 'u1',
            email: 'a@b.com',
            name: 'A',
            online: true,
        });
        expect(payload.lastSeen).toBe('SERVER_TIMESTAMP_SENTINEL');
        expect(options).toEqual({ merge: true });

        expect(payload).not.toHaveProperty('photoURL');
        expect(payload).not.toHaveProperty('username');
    });

    it('falls back to empty strings when displayName/email are missing', async () => {
        await upsertUserProfile({ uid: 'u2' });

        const [, payload] = mocks.setDoc.mock.calls[0];
        expect(payload.name).toBe('');
        expect(payload.email).toBe('');
    });
});

describe('setUserPresence / setUserOffline', () => {
    it('writes only { online, lastSeen } with merge:true — never photoURL or username', async () => {
        await setUserPresence('u1', true);

        expect(mocks.setDoc).toHaveBeenCalledTimes(1);
        const [, payload, options] = mocks.setDoc.mock.calls[0];

        expect(Object.keys(payload).sort()).toEqual(['lastSeen', 'online']);
        expect(payload.online).toBe(true);
        expect(payload.lastSeen).toBe('SERVER_TIMESTAMP_SENTINEL');
        expect(options).toEqual({ merge: true });
    });

    it('setUserOffline sets online:false via setUserPresence', async () => {
        await setUserOffline('u1');

        const [, payload] = mocks.setDoc.mock.calls[0];
        expect(payload).toEqual({ online: false, lastSeen: 'SERVER_TIMESTAMP_SENTINEL' });
    });
});

describe('getUser', () => {
    it('returns { id, ...data } when the profile doc exists', async () => {
        mocks.getDoc.mockResolvedValueOnce({ exists: () => true, id: 'u1', data: () => ({ name: 'Test' }) });

        const result = await getUser('u1');

        expect(result).toEqual({ id: 'u1', name: 'Test' });
    });

    it('returns null when the profile doc does not exist', async () => {
        mocks.getDoc.mockResolvedValueOnce({ exists: () => false });

        expect(await getUser('missing')).toBeNull();
    });
});

describe('subscribeToUser', () => {
    it('subscribes via onSnapshot and forwards the hydrated profile to the callback', () => {
        mocks.onSnapshot.mockImplementation((ref, handler) => {
            handler({ exists: () => true, id: 'u1', data: () => ({ name: 'Live' }) });
            return 'UNSUBSCRIBE_FN';
        });

        const callback = vi.fn();
        const unsubscribe = subscribeToUser('u1', callback);

        // The onSnapshot unsubscribe function must be returned as-is, so the
        // caller can actually stop listening.
        expect(unsubscribe).toBe('UNSUBSCRIBE_FN');
        expect(callback).toHaveBeenCalledWith({ id: 'u1', name: 'Live' });
    });

    it('forwards null when the snapshot does not exist (e.g. a deleted user)', () => {
        mocks.onSnapshot.mockImplementation((ref, handler) => {
            handler({ exists: () => false });
            return vi.fn();
        });

        const callback = vi.fn();
        subscribeToUser('u1', callback);

        expect(callback).toHaveBeenCalledWith(null);
    });
});

describe('findUserByEmail', () => {
    it('queries for an exact, trimmed email match and returns the first result', async () => {
        mocks.getDocs.mockResolvedValueOnce({
            empty: false,
            docs: [{ id: 'u1', data: () => ({ email: 'test@example.com', name: 'Test' }) }],
        });

        const result = await findUserByEmail('  test@example.com  ');

        expect(mocks.where).toHaveBeenCalledWith('email', '==', 'test@example.com');
        expect(mocks.limit).toHaveBeenCalledWith(1);
        expect(result).toEqual({ id: 'u1', email: 'test@example.com', name: 'Test' });
    });

    it('returns null when no user matches', async () => {
        mocks.getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

        expect(await findUserByEmail('nobody@example.com')).toBeNull();
    });
});

describe('searchUsersByUsername', () => {
    it('builds a lowercased-prefix range query (orderBy + startAt/endAt) and excludes the current user', async () => {
        mocks.getDocs.mockResolvedValueOnce({
            docs: [
                { id: 'u1', data: () => ({ username: 'johnny' }) },
                { id: 'self', data: () => ({ username: 'john-self' }) },
            ],
        });

        const results = await searchUsersByUsername('  John', 'self');

        expect(mocks.orderBy).toHaveBeenCalledWith('username');
        expect(mocks.startAt).toHaveBeenCalledWith('john');
        // The upper bound of the prefix range appends '' (the standard
        // Firestore trick — the highest Unicode private-use codepoint), not
        // a bare copy of the prefix.
        expect(mocks.endAt).toHaveBeenCalledWith('john');
        expect(mocks.limit).toHaveBeenCalledWith(20);

        expect(results).toEqual([{ id: 'u1', username: 'johnny' }]);
    });
});

describe('searchUsers', () => {
    it('merges username-prefix and exact-email results, dedupes by id, and excludes the current user', async () => {
        // Promise.all([searchUsersByUsername(...), getDocs(emailQuery)]) — the
        // two array elements are invoked synchronously left-to-right, so the
        // first getDocs call is always the username-prefix query (fired from
        // inside searchUsersByUsername) and the second is the exact-email one.
        mocks.getDocs
            .mockResolvedValueOnce({
                docs: [
                    { id: 'u-alice', data: () => ({ username: 'alice1' }) },
                    { id: 'self', data: () => ({ username: 'selfuser' }) },
                ],
            })
            .mockResolvedValueOnce({
                docs: [
                    { id: 'u-alice', data: () => ({ email: 'alice@example.com', username: 'alice1' }) },
                    { id: 'u-bob', data: () => ({ email: 'match@example.com' }) },
                ],
            });

        const results = await searchUsers(' match@example.com ', 'self');

        expect(mocks.where).toHaveBeenCalledWith('email', '==', 'match@example.com');

        const ids = results.map((r) => r.id).sort();
        expect(ids).toEqual(['u-alice', 'u-bob']);
        expect(results.find((r) => r.id === 'self')).toBeUndefined();
    });

    it('returns [] immediately for an empty/whitespace-only term, without querying', async () => {
        const results = await searchUsers('   ', 'self');

        expect(results).toEqual([]);
        expect(mocks.getDocs).not.toHaveBeenCalled();
    });
});

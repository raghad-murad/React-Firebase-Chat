import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted so the vi.mock factory below (which runs before normal imports)
// can reference these fakes without a TDZ error.
const mocks = vi.hoisted(() => ({
    doc: vi.fn((...args) => ({ __refArgs: args })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((...args) => ({ __collectionArgs: args })),
    query: vi.fn((...args) => ({ __queryArgs: args })),
    where: vi.fn((...args) => ({ __whereArgs: args })),
    orderBy: vi.fn((...args) => ({ __orderByArgs: args })),
    limit: vi.fn((n) => ({ __limit: n })),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP_SENTINEL'),
}));

vi.mock('firebase/firestore', () => ({
    collection: mocks.collection,
    doc: mocks.doc,
    getDoc: mocks.getDoc,
    getDocs: mocks.getDocs,
    setDoc: mocks.setDoc,
    updateDoc: mocks.updateDoc,
    deleteDoc: mocks.deleteDoc,
    query: mocks.query,
    where: mocks.where,
    orderBy: mocks.orderBy,
    limit: mocks.limit,
    onSnapshot: mocks.onSnapshot,
    writeBatch: mocks.writeBatch,
    serverTimestamp: mocks.serverTimestamp,
}));

vi.mock('@/firebase/firebase.js', () => ({ db: {} }));

const { chatIdFor, createOrGetChat, deleteConversation, markChatRead, setTyping } = await import('./chatService.js');
const { db } = await import('@/firebase/firebase.js');

beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear());
});

describe('chatIdFor', () => {
    it('is order-independent (same chat id regardless of argument order)', () => {
        expect(chatIdFor('uidA', 'uidB')).toBe(chatIdFor('uidB', 'uidA'));
    });

    it('is the two uids sorted and joined with an underscore', () => {
        expect(chatIdFor('zzz', 'aaa')).toBe('aaa_zzz');
        expect(chatIdFor('aaa', 'zzz')).toBe('aaa_zzz');
    });
});

describe('createOrGetChat', () => {
    it('returns the existing chat without writing, keyed by the deterministic sorted id', async () => {
        mocks.getDoc.mockResolvedValueOnce({
            exists: () => true,
            id: 'a_b',
            data: () => ({ participants: ['a', 'b'], lastMessage: 'hi', updatedAt: 'ts' }),
        });

        const result = await createOrGetChat('b', 'a');

        expect(mocks.doc).toHaveBeenCalledWith(db, 'chats', 'a_b');
        expect(mocks.setDoc).not.toHaveBeenCalled();
        expect(result).toEqual({ id: 'a_b', participants: ['a', 'b'], lastMessage: 'hi', updatedAt: 'ts' });
    });

    it('creates a new chat with both uids as participants when none exists yet', async () => {
        mocks.getDoc.mockResolvedValueOnce({ exists: () => false });

        const result = await createOrGetChat('current-user', 'other-user');

        expect(mocks.setDoc).toHaveBeenCalledTimes(1);
        const [ref, chatData] = mocks.setDoc.mock.calls[0];
        expect(ref).toEqual(mocks.doc(db, 'chats', 'current-user_other-user'));
        expect(chatData).toEqual({
            participants: ['current-user', 'other-user'],
            lastMessage: '',
            updatedAt: 'SERVER_TIMESTAMP_SENTINEL',
        });

        expect(result).toEqual({
            id: 'current-user_other-user',
            participants: ['current-user', 'other-user'],
            lastMessage: '',
            updatedAt: 'SERVER_TIMESTAMP_SENTINEL',
        });
    });
});

describe('deleteConversation', () => {
    function makeDocs(n, prefix) {
        return Array.from({ length: n }, (_, i) => ({ ref: { __msgRef: `${prefix}${i}` } }));
    }

    it('deletes all messages in batches of the 450 limit, then the chat doc last', async () => {
        const callOrder = [];

        mocks.getDocs
            .mockImplementationOnce(async () => {
                callOrder.push('getDocs');
                return { empty: false, size: 450, docs: makeDocs(450, 'batch1-') };
            })
            .mockImplementationOnce(async () => {
                callOrder.push('getDocs');
                return { empty: false, size: 450, docs: makeDocs(450, 'batch2-') };
            })
            .mockImplementationOnce(async () => {
                callOrder.push('getDocs');
                return { empty: true, size: 0, docs: [] };
            });

        const deletedRefs = [];
        mocks.writeBatch.mockImplementation(() => ({
            delete: (ref) => deletedRefs.push(ref),
            commit: vi.fn(async () => {
                callOrder.push('commit');
            }),
        }));

        mocks.deleteDoc.mockImplementation(async () => {
            callOrder.push('deleteDoc');
        });

        await deleteConversation('chat1');

        expect(mocks.getDocs).toHaveBeenCalledTimes(3);
        expect(mocks.writeBatch).toHaveBeenCalledTimes(2);
        expect(deletedRefs.length).toBe(900);
        expect(mocks.deleteDoc).toHaveBeenCalledTimes(1);
        expect(mocks.deleteDoc).toHaveBeenCalledWith({ __refArgs: [db, 'chats', 'chat1'] });

        // The whole point: every message batch is deleted (and committed)
        // BEFORE the parent chat doc itself is deleted.
        expect(callOrder).toEqual(['getDocs', 'commit', 'getDocs', 'commit', 'getDocs', 'deleteDoc']);
    });

    it('deletes just the chat doc when there are no messages at all', async () => {
        mocks.getDocs.mockResolvedValueOnce({ empty: true, size: 0, docs: [] });

        await deleteConversation('chat-empty');

        expect(mocks.getDocs).toHaveBeenCalledTimes(1);
        expect(mocks.writeBatch).not.toHaveBeenCalled();
        expect(mocks.deleteDoc).toHaveBeenCalledTimes(1);
    });
});

describe('markChatRead', () => {
    it('writes unreadCounts.{uid} = 0 via a dot-notation path, touching no other key', async () => {
        await markChatRead('chat1', 'u1');

        expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
        const [ref, payload] = mocks.updateDoc.mock.calls[0];
        expect(ref).toEqual({ __refArgs: [db, 'chats', 'chat1'] });
        expect(payload).toEqual({ 'unreadCounts.u1': 0 });
    });
});

describe('setTyping', () => {
    it('writes only typing.{uid} to a fresh timestamp when starting to type', async () => {
        await setTyping('chat1', 'u1', true);

        expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
        const [, payload] = mocks.updateDoc.mock.calls[0];
        expect(payload).toEqual({ 'typing.u1': 'SERVER_TIMESTAMP_SENTINEL' });
    });

    it('writes only typing.{uid} = null when stopping', async () => {
        await setTyping('chat1', 'u1', false);

        const [, payload] = mocks.updateDoc.mock.calls[0];
        expect(payload).toEqual({ 'typing.u1': null });
    });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted so the vi.mock factories below (which run before normal imports)
// can reference these fakes without a TDZ error.
const mocks = vi.hoisted(() => ({
    collection: vi.fn((...args) => ({ __collectionArgs: args })),
    // Mirrors real Firestore doc(): doc(db, path, id) uses the given id;
    // doc(collectionRef) auto-generates one — faked here as a fixed id so
    // sendMessage/sendAttachmentMessage's returned message id is assertable.
    doc: vi.fn((...args) => ({ __docArgs: args, id: args.length === 1 ? 'generated-id' : args[args.length - 1] })),
    query: vi.fn((...args) => ({ __queryArgs: args })),
    where: vi.fn((...args) => ({ __whereArgs: args })),
    orderBy: vi.fn((...args) => ({ __orderByArgs: args })),
    limit: vi.fn((n) => ({ __limit: n })),
    onSnapshot: vi.fn(),
    getDocs: vi.fn(),
    writeBatch: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP_SENTINEL'),
    increment: vi.fn((n) => ({ __increment: n })),
    processAttachmentImage: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    collection: mocks.collection,
    doc: mocks.doc,
    query: mocks.query,
    where: mocks.where,
    orderBy: mocks.orderBy,
    limit: mocks.limit,
    onSnapshot: mocks.onSnapshot,
    getDocs: mocks.getDocs,
    writeBatch: mocks.writeBatch,
    serverTimestamp: mocks.serverTimestamp,
    increment: mocks.increment,
}));

vi.mock('@/firebase/firebase.js', () => ({ db: {} }));

vi.mock('../utils/processAttachmentImage.js', () => ({
    processAttachmentImage: mocks.processAttachmentImage,
}));

const { sendMessage, sendAttachmentMessage, deleteMessage } = await import('./messageService.js');

function makeBatch() {
    return {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
    };
}

beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear());
});

describe('sendMessage', () => {
    it('writes the message doc and updates the parent chat, incrementing unreadCounts for the recipient only', async () => {
        mocks.writeBatch.mockImplementationOnce(() => makeBatch());

        const messageId = await sendMessage('chat1', 'sender-1', 'hello', 'recipient-1');

        const batch = mocks.writeBatch.mock.results[0].value;

        expect(batch.set).toHaveBeenCalledTimes(1);
        const [, msgData] = batch.set.mock.calls[0];
        expect(msgData).toEqual({
            senderId: 'sender-1',
            text: 'hello',
            createdAt: 'SERVER_TIMESTAMP_SENTINEL',
            status: 'sent',
        });

        expect(batch.update).toHaveBeenCalledTimes(1);
        const [, chatData] = batch.update.mock.calls[0];
        expect(Object.keys(chatData).sort()).toEqual(
            ['lastMessage', 'lastMessageSenderId', 'unreadCounts.recipient-1', 'updatedAt'].sort()
        );
        expect(chatData.lastMessage).toBe('hello');
        expect(chatData.lastMessageSenderId).toBe('sender-1');
        expect(chatData.updatedAt).toBe('SERVER_TIMESTAMP_SENTINEL');
        expect(chatData['unreadCounts.recipient-1']).toEqual({ __increment: 1 });
        // The sender's own unread count must never be touched by their own send.
        expect('unreadCounts.sender-1' in chatData).toBe(false);

        expect(batch.commit).toHaveBeenCalledTimes(1);
        expect(messageId).toBe('generated-id');
    });
});

describe('sendAttachmentMessage', () => {
    it('rejects a non-image file over the raw size cap before writing anything', async () => {
        const bigFile = new File([new Uint8Array(701 * 1024)], 'big.bin', { type: 'application/octet-stream' });

        await expect(sendAttachmentMessage('chat1', 'sender-1', bigFile, '', 'recipient-1')).rejects.toThrow(
            /too large/i
        );

        expect(mocks.writeBatch).not.toHaveBeenCalled();
    });

    it('rejects when the resulting data URL exceeds the hard backstop cap, even for a (supposedly compressed) image', async () => {
        mocks.processAttachmentImage.mockResolvedValueOnce('data:image/png;base64,' + 'A'.repeat(1_000_000));
        const imageFile = new File(['x'], 'huge.png', { type: 'image/png' });

        await expect(sendAttachmentMessage('chat1', 'sender-1', imageFile, '', 'recipient-1')).rejects.toThrow(
            /too large/i
        );

        expect(mocks.writeBatch).not.toHaveBeenCalled();
    });

    it('sends an image attachment: compresses via processAttachmentImage, decodes the stored size, and previews as "📷 Photo"', async () => {
        // "QUFBQQ==" base64-decodes to 4 bytes ("AAAA"); 2 bytes of "==" padding.
        mocks.processAttachmentImage.mockResolvedValueOnce('data:image/png;base64,QUFBQQ==');
        mocks.writeBatch.mockImplementationOnce(() => makeBatch());

        const imageFile = new File(['pretend-image-bytes'], 'photo.png', { type: 'image/png' });
        await sendAttachmentMessage('chat1', 'sender-1', imageFile, 'nice pic', 'recipient-1');

        const batch = mocks.writeBatch.mock.results[0].value;
        const [, msgData] = batch.set.mock.calls[0];
        expect(msgData.text).toBe('nice pic');
        expect(msgData.attachment).toEqual({
            url: 'data:image/png;base64,QUFBQQ==',
            name: 'photo.png',
            type: 'image/png',
            size: 4,
        });

        const [, chatData] = batch.update.mock.calls[0];
        expect(chatData.lastMessage).toBe('📷 Photo');
        expect(chatData['unreadCounts.recipient-1']).toEqual({ __increment: 1 });
    });

    it('sends a non-image file under the cap: stores the raw file size and previews as "📎 <filename>"', async () => {
        mocks.writeBatch.mockImplementationOnce(() => makeBatch());
        const file = new File(['hello world'], 'notes.txt', { type: 'text/plain' });

        await sendAttachmentMessage('chat1', 'sender-1', file, 'see attached', 'recipient-1');

        const batch = mocks.writeBatch.mock.results[0].value;
        const [, msgData] = batch.set.mock.calls[0];
        expect(msgData.attachment.name).toBe('notes.txt');
        expect(msgData.attachment.type).toBe('text/plain');
        expect(msgData.attachment.size).toBe(file.size);
        expect(msgData.attachment.url).toMatch(/^data:text\/plain;base64,/);

        const [, chatData] = batch.update.mock.calls[0];
        expect(chatData.lastMessage).toBe('📎 notes.txt');
    });
});

describe('deleteMessage', () => {
    it('tombstones the message and updates lastMessage when it was the chat\'s latest message', async () => {
        mocks.writeBatch.mockImplementationOnce(() => makeBatch());
        mocks.getDocs.mockResolvedValueOnce({ docs: [{ id: 'msg-2' }] });

        await deleteMessage('chat1', 'msg-2');

        const batch = mocks.writeBatch.mock.results[0].value;
        expect(batch.update).toHaveBeenCalledTimes(2);

        const [, msgData] = batch.update.mock.calls[0];
        expect(msgData).toEqual({ deleted: true, text: '', attachment: null, updatedAt: 'SERVER_TIMESTAMP_SENTINEL' });

        const [, chatData] = batch.update.mock.calls[1];
        expect(chatData).toEqual({ lastMessage: 'This message was deleted' });

        expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it('tombstones the message but leaves lastMessage untouched when it was NOT the latest message', async () => {
        mocks.writeBatch.mockImplementationOnce(() => makeBatch());
        mocks.getDocs.mockResolvedValueOnce({ docs: [{ id: 'msg-3' }] }); // the latest is msg-3, we're deleting msg-1

        await deleteMessage('chat1', 'msg-1');

        const batch = mocks.writeBatch.mock.results[0].value;
        expect(batch.update).toHaveBeenCalledTimes(1); // only the message tombstone — no chat update
        const [, msgData] = batch.update.mock.calls[0];
        expect(msgData).toEqual({ deleted: true, text: '', attachment: null, updatedAt: 'SERVER_TIMESTAMP_SENTINEL' });
    });
});

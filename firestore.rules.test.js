// Security Rules tests, run against a real Firestore emulator (not mocked) —
// see the "test:rules" npm script, which boots the emulator via
// `firebase emulators:exec` and points it at the actual firestore.rules file
// on disk, so this validates the DEPLOYED rules logic, not a description of
// it. Requires a JRE on PATH (the Firestore emulator is a Java binary).
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, afterEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'webchat-rules-test';

let testEnv;

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: readFileSync('firestore.rules', 'utf8'),
            host: 'localhost',
            port: 8080,
        },
    });
});

afterEach(async () => {
    await testEnv.clearFirestore();
});

afterAll(async () => {
    await testEnv.cleanup();
});

// Seeds data bypassing Security Rules entirely — the only way to get a chat
// (or message) doc into a known state without the write itself having to
// satisfy the same rules the test is trying to exercise.
function seed(setupFn) {
    return testEnv.withSecurityRulesDisabled(setupFn);
}

function dbFor(uid) {
    return (uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()).firestore();
}

describe('users/{userId}', () => {
    it('lets any signed-in user read any profile, including one that does not exist yet', async () => {
        await seed(async (context) => {
            await setDoc(doc(context.firestore(), 'users/alice'), { name: 'Alice' });
        });

        const bob = dbFor('bob');
        await assertSucceeds(getDoc(doc(bob, 'users/alice')));
        await assertSucceeds(getDoc(doc(bob, 'users/does-not-exist')));
    });

    it('denies an unauthenticated read', async () => {
        await seed(async (context) => {
            await setDoc(doc(context.firestore(), 'users/alice'), { name: 'Alice' });
        });

        await assertFails(getDoc(doc(dbFor(null), 'users/alice')));
    });

    it('lets a user write only their own profile doc', async () => {
        await assertSucceeds(setDoc(doc(dbFor('alice'), 'users/alice'), { name: 'Alice' }));
    });

    it('denies a user writing someone else\'s profile doc', async () => {
        await assertFails(setDoc(doc(dbFor('bob'), 'users/alice'), { name: 'Hacked' }));
    });

    it('denies an unauthenticated write', async () => {
        await assertFails(setDoc(doc(dbFor(null), 'users/alice'), { name: 'Hacked' }));
    });
});

describe('chats/{chatId}', () => {
    async function seedChat(chatId, participants) {
        await seed(async (context) => {
            await setDoc(doc(context.firestore(), `chats/${chatId}`), {
                participants,
                lastMessage: '',
                updatedAt: serverTimestamp(),
            });
        });
    }

    it('lets a participant read the chat', async () => {
        await seedChat('chat1', ['alice', 'bob']);
        await assertSucceeds(getDoc(doc(dbFor('alice'), 'chats/chat1')));
    });

    it('denies a non-participant reading the chat', async () => {
        await seedChat('chat1', ['alice', 'bob']);
        await assertFails(getDoc(doc(dbFor('carol'), 'chats/chat1')));
    });

    it('lets a participant update the chat', async () => {
        await seedChat('chat1', ['alice', 'bob']);
        await assertSucceeds(updateDoc(doc(dbFor('bob'), 'chats/chat1'), { lastMessage: 'hi' }));
    });

    it('denies a non-participant updating the chat', async () => {
        await seedChat('chat1', ['alice', 'bob']);
        await assertFails(updateDoc(doc(dbFor('carol'), 'chats/chat1'), { lastMessage: 'hacked' }));
    });

    it('lets a participant delete the chat (whole-conversation delete)', async () => {
        await seedChat('chat1', ['alice', 'bob']);
        await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'chats/chat1')));
    });

    it('denies a non-participant deleting the chat', async () => {
        await seedChat('chat1', ['alice', 'bob']);
        await assertFails(deleteDoc(doc(dbFor('carol'), 'chats/chat1')));
    });

    it('lets a creator create a chat that includes themself as a participant', async () => {
        await assertSucceeds(
            setDoc(doc(dbFor('alice'), 'chats/alice_bob'), {
                participants: ['alice', 'bob'],
                lastMessage: '',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies creating a chat that does not include the creator as a participant', async () => {
        await assertFails(
            setDoc(doc(dbFor('carol'), 'chats/alice_bob'), {
                participants: ['alice', 'bob'],
                lastMessage: '',
                updatedAt: serverTimestamp(),
            })
        );
    });
});

describe('chats/{chatId}/messages/{messageId}', () => {
    async function seedChatAndMessage(chatId, participants, messageId, messageData) {
        await seed(async (context) => {
            await setDoc(doc(context.firestore(), `chats/${chatId}`), {
                participants,
                lastMessage: '',
                updatedAt: serverTimestamp(),
            });
            await setDoc(doc(context.firestore(), `chats/${chatId}/messages/${messageId}`), messageData);
        });
    }

    it('lets a participant read a message', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertSucceeds(getDoc(doc(dbFor('bob'), 'chats/chat1/messages/m1')));
    });

    it('denies a non-participant reading a message', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertFails(getDoc(doc(dbFor('carol'), 'chats/chat1/messages/m1')));
    });

    it('lets a participant create a message with their own senderId', async () => {
        await seed(async (context) => {
            await setDoc(doc(context.firestore(), 'chats/chat1'), {
                participants: ['alice', 'bob'],
                lastMessage: '',
                updatedAt: serverTimestamp(),
            });
        });

        await assertSucceeds(
            addDoc(collection(dbFor('alice'), 'chats/chat1/messages'), {
                senderId: 'alice',
                text: 'hi',
                createdAt: serverTimestamp(),
                status: 'sent',
            })
        );
    });

    it('denies a participant creating a message with a forged senderId (impersonating the other participant)', async () => {
        await seed(async (context) => {
            await setDoc(doc(context.firestore(), 'chats/chat1'), {
                participants: ['alice', 'bob'],
                lastMessage: '',
                updatedAt: serverTimestamp(),
            });
        });

        await assertFails(
            addDoc(collection(dbFor('bob'), 'chats/chat1/messages'), {
                senderId: 'alice',
                text: 'forged',
                createdAt: serverTimestamp(),
                status: 'sent',
            })
        );
    });

    it('denies a non-participant creating a message, even with a truthful senderId', async () => {
        await seed(async (context) => {
            await setDoc(doc(context.firestore(), 'chats/chat1'), {
                participants: ['alice', 'bob'],
                lastMessage: '',
                updatedAt: serverTimestamp(),
            });
        });

        await assertFails(
            addDoc(collection(dbFor('carol'), 'chats/chat1/messages'), {
                senderId: 'carol',
                text: 'butting in',
                createdAt: serverTimestamp(),
                status: 'sent',
            })
        );
    });

    it('lets any participant update only the status field (delivered/seen receipts)', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertSucceeds(updateDoc(doc(dbFor('bob'), 'chats/chat1/messages/m1'), { status: 'delivered' }));
    });

    it('denies a non-sender participant changing an arbitrary field like text', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertFails(updateDoc(doc(dbFor('bob'), 'chats/chat1/messages/m1'), { text: 'hacked' }));
    });

    it('lets the sender soft-delete (tombstone) their own message', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertSucceeds(
            updateDoc(doc(dbFor('alice'), 'chats/chat1/messages/m1'), {
                deleted: true,
                text: '',
                attachment: null,
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies a non-sender participant soft-deleting someone else\'s message', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertFails(
            updateDoc(doc(dbFor('bob'), 'chats/chat1/messages/m1'), {
                deleted: true,
                text: '',
                attachment: null,
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies the sender changing senderId itself via update (not in either allowed key set)', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertFails(updateDoc(doc(dbFor('alice'), 'chats/chat1/messages/m1'), { senderId: 'bob' }));
    });

    it('denies a non-participant updating a message at all', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertFails(updateDoc(doc(dbFor('carol'), 'chats/chat1/messages/m1'), { status: 'delivered' }));
    });

    it('lets a participant hard-delete a message (bulk conversation delete)', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertSucceeds(deleteDoc(doc(dbFor('bob'), 'chats/chat1/messages/m1')));
    });

    it('denies a non-participant hard-deleting a message', async () => {
        await seedChatAndMessage('chat1', ['alice', 'bob'], 'm1', {
            senderId: 'alice',
            text: 'hi',
            status: 'sent',
        });

        await assertFails(deleteDoc(doc(dbFor('carol'), 'chats/chat1/messages/m1')));
    });
});

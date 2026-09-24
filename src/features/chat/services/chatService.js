/*
 ? Chat Service (Firestore)

 * The only module that talks to the `chats/{chatId}` collection — 1:1
 * conversations between two users. Message documents live in the
 * `messages` subcollection of each chat; see messageService.js for those.
 * deleteConversation below is the one exception to "messages belong to
 * messageService.js" — see its own comment for why.

 * Document shape (chats/{chatId}):
   {
     participants: string[] (uids), lastMessage, lastMessageSenderId, updatedAt,
     unreadCounts?: { [uid]: number },   // written by messageService.sendMessage/sendAttachmentMessage, cleared by markChatRead
     typing?: { [uid]: Timestamp | null }, // written by setTyping below
   }
 * lastMessage/lastMessageSenderId start empty/undefined from
 * createOrGetChat below and are written by messageService.sendMessage.
*/

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    writeBatch,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase.js";

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";

// Firestore caps a single writeBatch at 500 operations — deleteConversation
// stays comfortably under that per batch.
const DELETE_BATCH_SIZE = 450;

// A 1:1 chat's id is the two uids sorted and joined — deterministic
// regardless of argument order, so createOrGetChat(a, b) and
// createOrGetChat(b, a) always resolve to the same doc without needing a
// query (Firestore can't query "participants contains both a AND b" with a
// single array-contains clause).
export function chatIdFor(uidA, uidB) {
    return [uidA, uidB].sort().join("_");
}

function toChat(snapshot) {
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Returns the existing 1:1 chat between two users, creating it (with an
 * empty lastMessage) if it doesn't exist yet.
 *
 * @param {string} uidA
 * @param {string} uidB
 * @returns {Promise<object>} the chat doc, including its id
 */
export async function createOrGetChat(uidA, uidB) {
    const chatId = chatIdFor(uidA, uidB);
    const ref = doc(db, CHATS_COLLECTION, chatId);
    const existing = await getDoc(ref);

    if (existing.exists()) {
        return toChat(existing);
    }

    const chatData = {
        participants: [uidA, uidB],
        lastMessage: "",
        updatedAt: serverTimestamp(),
    };
    await setDoc(ref, chatData);

    return { id: chatId, ...chatData };
}

/**
 * Subscribes to realtime updates for every chat a user is a participant
 * in, newest-updated first. Call the returned function to unsubscribe.
 *
 * @param {string} uid
 * @param {(chats: object[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToUserChats(uid, callback) {
    const chatsQuery = query(
        collection(db, CHATS_COLLECTION),
        where("participants", "array-contains", uid),
        orderBy("updatedAt", "desc")
    );

    return onSnapshot(chatsQuery, (snapshot) => {
        callback(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });
}

/**
 * Permanently deletes a conversation for both participants: every doc in
 * its `messages` subcollection, then the `chats/{chatId}` doc itself.
 * Firestore doesn't cascade-delete subcollections when a parent doc is
 * removed, so the messages have to go first — fetched and deleted in
 * batches of DELETE_BATCH_SIZE (a single writeBatch tops out at 500 ops),
 * looping until none remain.
 *
 * This is the one place outside messageService.js that touches the
 * `messages` subcollection directly — kept here (not split across both
 * service files) because the whole "delete a chat" operation is one
 * conceptual unit with a single call site (see ActiveConversationPanel's
 * delete-conversation confirm flow), and unlike every messageService
 * function, this doesn't care about a message's shape/content at all, just
 * that it exists.
 *
 * @param {string} chatId
 * @returns {Promise<void>}
 */
export async function deleteConversation(chatId) {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);

    let hasMore = true;
    while (hasMore) {
        const snapshot = await getDocs(query(messagesRef, limit(DELETE_BATCH_SIZE)));
        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
        await batch.commit();

        hasMore = snapshot.size === DELETE_BATCH_SIZE;
    }

    await deleteDoc(doc(db, CHATS_COLLECTION, chatId));
}

/**
 * Clears a user's unread count for a chat — call this when they open it
 * (see Chat.jsx's markMessagesSeen effect, which this rides alongside).
 * Dot-notation field path so this only ever touches this one map key,
 * never the other participant's count or anything else on the doc.
 *
 * @param {string} chatId
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function markChatRead(chatId, uid) {
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), { [`unreadCounts.${uid}`]: 0 });
}

/**
 * Sets (or clears) a user's typing state on the chat doc — the other
 * participant derives "is typing" from how fresh this timestamp is (see
 * utils/typing.js's isTypingRecent), not from the raw boolean, so an
 * abrupt tab close/crash while mid-type still resolves to "not typing"
 * once it goes stale, the same reasoning as presence's online derivation.
 *
 * @param {string} chatId
 * @param {string} uid
 * @param {boolean} isTyping
 * @returns {Promise<void>}
 */
export async function setTyping(chatId, uid, isTyping) {
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
        [`typing.${uid}`]: isTyping ? serverTimestamp() : null,
    });
}

/*
 ? Message Service (Firestore)

 * The only module that talks to the `chats/{chatId}/messages` subcollection.
 * Sending a message also updates the parent chat's lastMessage/
 * lastMessageSenderId/updatedAt/unreadCounts, in the same writeBatch, so the
 * conversation list and the open thread can never disagree about what the
 * last message was or who sent it. unreadCounts.{recipientId} is
 * incremented via increment(1) — see chatService.markChatRead for where it
 * gets zeroed back out, and chatService.js's own doc comment for the full
 * chats/{chatId} shape.

 * Document shape (chats/{chatId}/messages/{messageId}):
   {
     senderId, text, createdAt, status: 'sent' | 'delivered' | 'seen',
     attachment?: { url, name, type, size },   // present only on sendAttachmentMessage sends
     deleted?: true, updatedAt?,                // present only after deleteMessage (see below)
   }
 * Status semantics:
   - sent: written at send time.
   - delivered: the recipient's client received it while online, even if
     that chat isn't open (see markMessagesDelivered).
   - seen: the recipient has that chat open and the window is visible/
     focused (see markMessagesSeen). Can jump straight from sent -> seen
     (skipping delivered) if the recipient already has the chat open when
     the message arrives — that's correct, not a bug; the UI just renders
     whatever the current status is.

 * lastMessageSenderId, written on the parent chats/{chatId} doc alongside
 * lastMessage/updatedAt, isn't part of chatService.js's original documented
 * shape for that doc — added here so the conversation list can tell
 * whether its viewer or the other participant sent the last message
 * (needed to decide whether to show a status tick there at all).

 * Attachments (sendAttachmentMessage): a message can also carry an
 * `attachment: { url, name, type, size }` object — NO Firebase Storage
 * involved (deliberately: it was here originally, but the Storage
 * bucket's CORS requirements made it a dependency this app doesn't want).
 * `attachment.url` is instead a base64 data URL stored directly on the
 * message doc, the same technique userService.updateUserProfile already
 * uses for photoURL. `text` on an attachment message is just its optional
 * caption (possibly "").
 *
 * Firestore caps a document at ~1MiB, so the data URL has to stay small —
 * see sendAttachmentMessage's own comment for the exact caps enforced
 * (images are downscaled/compressed to fit via
 * utils/processAttachmentImage.js; non-image files are rejected outright
 * if they're too big raw, since there's no way to shrink an arbitrary file
 * the way a photo can be recompressed).
 *
 * Deletion (deleteMessage): a soft delete/tombstone, not a real Firestore
 * delete — the doc stays (so the thread's order/pagination never has a
 * hole in it), but its content is cleared and `deleted: true` is set.
 * MessageBubble renders that as "This message was deleted" instead of the
 * original text/attachment. Only the sender can do this — enforced by
 * firestore.rules (`request.auth.uid == resource.data.senderId`), not
 * re-checked here.
*/

import {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    getDocs,
    writeBatch,
    serverTimestamp,
    increment,
} from "firebase/firestore";
import { db } from "@/firebase/firebase.js";
import { processAttachmentImage } from "../utils/processAttachmentImage.js";

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";

// Non-image files aren't recompressed the way photos are, so this is
// checked against the raw file before even reading it. Images have the
// equivalent ~700KB target enforced inside utils/processAttachmentImage.js
// (its own MAX_DATA_URL_LENGTH) instead, since that's the number that
// actually matters for them — the resulting data URL size, not the
// original file's raw size.
const MAX_NON_IMAGE_RAW_BYTES = 700 * 1024;

// Final guard, checked on whatever data URL is about to be written,
// whether it came from image compression or a raw non-image read — stays
// well under Firestore's ~1MiB document limit (a message doc has a few
// other small fields alongside `attachment`, so this isn't cut exactly at
// 1MiB) even if something upstream let a larger string through.
const HARD_MAX_DATA_URL_LENGTH = 900_000;

const ATTACHMENT_TOO_LARGE_MESSAGE = "File too large — max ~700KB when stored this way.";

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Couldn't read that file."));
        reader.readAsDataURL(file);
    });
}

// Decoded byte size of a base64 data URL's payload — used for the
// attachment's stored `size` so the file card shows the ACTUAL size of
// what got saved (post-compression for images), not the original file's
// size, which would be misleading once an image has been recompressed
// smaller.
function dataUrlByteSize(dataUrl) {
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const paddingMatch = base64.match(/=+$/);
    const padding = paddingMatch ? paddingMatch[0].length : 0;
    return Math.max(0, Math.round((base64.length * 3) / 4) - padding);
}

/**
 * Sends a message in a chat: adds the message doc and updates the parent
 * chat's lastMessage/lastMessageSenderId/updatedAt/unreadCounts in one
 * atomic writeBatch.
 *
 * @param {string} chatId
 * @param {string} senderId
 * @param {string} text
 * @param {string} recipientId - the other participant, whose unreadCounts
 *   entry gets incremented; the caller already knows this (it's the open
 *   conversation's participant), so this avoids an extra read here just to
 *   derive it from the chat doc's participants array
 * @returns {Promise<string>} the new message's id
 */
export async function sendMessage(chatId, senderId, text, recipientId) {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const messageRef = doc(collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION));

    const batch = writeBatch(db);
    batch.set(messageRef, {
        senderId,
        text,
        createdAt: serverTimestamp(),
        status: "sent",
    });
    batch.update(chatRef, {
        lastMessage: text,
        lastMessageSenderId: senderId,
        updatedAt: serverTimestamp(),
        [`unreadCounts.${recipientId}`]: increment(1),
    });
    await batch.commit();

    return messageRef.id;
}

/**
 * Sends a file attachment message: converts the file to a base64 data URL
 * client-side (downscaling/compressing first if it's an image — see
 * utils/processAttachmentImage.js), then adds the message doc (with an
 * `attachment` object carrying that data URL as `url`, plus name/type/size)
 * and updates the parent chat's lastMessage/lastMessageSenderId/updatedAt,
 * same atomic writeBatch pattern as sendMessage.
 *
 * Size caps (see the constants above) — a non-image file over
 * MAX_NON_IMAGE_RAW_BYTES raw is rejected immediately (nothing shrinks it
 * the way an image can be recompressed); whatever data URL results is then
 * checked against HARD_MAX_DATA_URL_LENGTH as a final backstop before the
 * write, regardless of which path produced it. Both rejections throw a
 * plain Error with a user-facing message — MessageInput's caller is
 * expected to catch it and toast it, the same way it already does for any
 * other send failure.
 *
 * lastMessage is set to a short human preview — "📷 Photo" for an image,
 * "📎 <filename>" otherwise — so the conversation list shows a meaningful
 * hint without needing to know how to render an attachment itself.
 *
 * @param {string} chatId
 * @param {string} senderId
 * @param {File} file
 * @param {string} [caption]
 * @param {string} recipientId - see sendMessage's own doc comment
 * @returns {Promise<string>} the new message's id
 */
export async function sendAttachmentMessage(chatId, senderId, file, caption = "", recipientId) {
    const isImage = file.type.startsWith("image/");

    let dataUrl;
    if (isImage) {
        dataUrl = await processAttachmentImage(file);
    } else {
        if (file.size > MAX_NON_IMAGE_RAW_BYTES) {
            throw new Error(ATTACHMENT_TOO_LARGE_MESSAGE);
        }
        dataUrl = await fileToDataUrl(file);
    }

    if (dataUrl.length > HARD_MAX_DATA_URL_LENGTH) {
        throw new Error(ATTACHMENT_TOO_LARGE_MESSAGE);
    }

    const preview = isImage ? "📷 Photo" : `📎 ${file.name}`;

    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const messageRef = doc(collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION));

    const batch = writeBatch(db);
    batch.set(messageRef, {
        senderId,
        text: caption,
        createdAt: serverTimestamp(),
        status: "sent",
        attachment: {
            url: dataUrl,
            name: file.name,
            type: file.type,
            size: isImage ? dataUrlByteSize(dataUrl) : file.size,
        },
    });
    batch.update(chatRef, {
        lastMessage: preview,
        lastMessageSenderId: senderId,
        updatedAt: serverTimestamp(),
        [`unreadCounts.${recipientId}`]: increment(1),
    });
    await batch.commit();

    return messageRef.id;
}

/**
 * Soft-deletes a message (see the file header comment on why it's a
 * tombstone, not a real delete): clears its text/attachment and sets
 * deleted: true. If it was the chat's most recent message, also updates
 * the parent chat's lastMessage to a placeholder so the conversation
 * list's preview doesn't keep showing content that's now gone — deleting
 * an OLDER message deliberately leaves lastMessage alone, since the
 * conversation list should keep showing whatever the actual latest
 * message still is.
 *
 * Doesn't bump the chat's updatedAt — deleting your latest message
 * shouldn't reorder the conversation list the way sending a new one does.
 *
 * @param {string} chatId
 * @param {string} messageId
 * @returns {Promise<void>}
 */
export async function deleteMessage(chatId, messageId) {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);

    const batch = writeBatch(db);
    batch.update(messageRef, {
        deleted: true,
        text: "",
        attachment: null,
        updatedAt: serverTimestamp(),
    });

    const latestQuery = query(
        collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
        orderBy("createdAt", "desc"),
        limit(1)
    );
    const latestSnapshot = await getDocs(latestQuery);
    const isLatestMessage = latestSnapshot.docs[0]?.id === messageId;

    if (isLatestMessage) {
        batch.update(chatRef, { lastMessage: "This message was deleted" });
    }

    await batch.commit();
}

/**
 * Subscribes to realtime updates for a chat's messages, oldest first. Call
 * the returned function to unsubscribe.
 *
 * @param {string} chatId
 * @param {(messages: object[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToMessages(chatId, callback) {
    const messagesQuery = query(
        collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(messagesQuery, (snapshot) => {
        callback(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });
}

/**
 * Marks messages as seen: from an ALREADY-LOADED messages array (the
 * caller's own subscribeToMessages result — no separate Firestore query,
 * so no composite-index risk), finds messages sent by someone else that
 * aren't already 'seen', and batch-updates just those doc IDs. Doesn't
 * require a message to have passed through 'delivered' first — jumping
 * straight from 'sent' to 'seen' is valid (see the status semantics note
 * above). No-op (no Firestore write at all) if nothing matches, which is
 * what keeps repeated calls (e.g. from a snapshot the write itself causes)
 * from looping.
 *
 * @param {string} chatId
 * @param {string} currentUserId
 * @param {object[]} messages - each at least { id, senderId, status }
 * @returns {Promise<void>}
 */
export async function markMessagesSeen(chatId, currentUserId, messages) {
    const toUpdate = messages.filter((message) => message.senderId !== currentUserId && message.status !== "seen");
    if (toUpdate.length === 0) return;

    const batch = writeBatch(db);
    for (const message of toUpdate) {
        batch.update(doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, message.id), { status: "seen" });
    }
    await batch.commit();
}

/**
 * Marks messages as delivered: queries this chat's messages with a
 * SINGLE-field filter (status == 'sent' — no composite index needed),
 * filters out the current user's own messages client-side (can't do that
 * in the query without a second field), and batch-updates the rest to
 * 'delivered'. No-op if nothing matches. Safe to call repeatedly — this
 * doesn't touch the parent chat doc, so it can't retrigger the
 * subscribeToUserChats listener that typically calls it.
 *
 * @param {string} chatId
 * @param {string} currentUserId
 * @returns {Promise<void>}
 */
export async function markMessagesDelivered(chatId, currentUserId) {
    const sentQuery = query(
        collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
        where("status", "==", "sent")
    );
    const snapshot = await getDocs(sentQuery);
    const toUpdate = snapshot.docs.filter((docSnapshot) => docSnapshot.data().senderId !== currentUserId);
    if (toUpdate.length === 0) return;

    const batch = writeBatch(db);
    for (const docSnapshot of toUpdate) {
        batch.update(docSnapshot.ref, { status: "delivered" });
    }
    await batch.commit();
}

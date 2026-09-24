/*
 ? Typing-indicator derivation

 * Mirrors utils/presence.js's isUserOnline reasoning: chatService.setTyping
 * writes a raw timestamp (or null) to `chats/{chatId}.typing.{uid}`, and
 * "is typing" is DERIVED from how fresh that timestamp is, not read as a
 * raw boolean — so if a client closes/crashes mid-type without ever
 * writing typing:null, the indicator still clears itself once the
 * timestamp goes stale instead of getting stuck showing "typing…" forever.
*/

export const TYPING_STALE_MS = 5000;

/**
 * @param {{ toMillis: () => number } | null | undefined} typingTimestamp
 * @returns {boolean}
 */
export function isTypingRecent(typingTimestamp) {
    if (!typingTimestamp || typeof typingTimestamp.toMillis !== "function") return false;
    return Date.now() - typingTimestamp.toMillis() < TYPING_STALE_MS;
}

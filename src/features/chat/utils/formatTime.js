/*
 ? Time-formatting helpers for the chat UI

 * Small, dependency-free formatters built on the native Date/Intl APIs.
 * All four take an ISO timestamp string. Firestore itself hands back
 * Timestamp objects (not strings) from onSnapshot — toIsoString below is
 * the conversion point, called once at hydration time in Chat.jsx, so
 * every component downstream keeps dealing in plain ISO strings exactly
 * as it did with the old mock data.
*/

function isSameDay(a, b) {
    return a.toDateString() === b.toDateString();
}

function isYesterday(date, today) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return isSameDay(date, yesterday);
}

// Converts a Firestore Timestamp (or anything Date-parseable, or
// null/undefined) into an ISO string. serverTimestamp() fields can read
// back as null for a brief moment on the writer's own optimistic local
// snapshot, before the server value round-trips back — falls back to "now"
// in that case rather than crashing on null.toDate().
export function toIsoString(value) {
    if (!value) return new Date().toISOString();
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    return new Date(value).toISOString();
}

// "9:24 AM" — used for message bubble timestamps.
export function formatMessageTime(iso) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// "9:24 AM" today, "Yesterday" for the day before, otherwise "Aug 25" —
// used for the conversation list row timestamps.
export function formatConversationTimestamp(iso) {
    const date = new Date(iso);
    const now = new Date();

    if (isSameDay(date, now)) {
        return formatMessageTime(iso);
    }
    if (isYesterday(date, now)) {
        return "Yesterday";
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// "Today" / "Yesterday" / "August 25" — used for the centered date divider
// between groups of messages in the active conversation thread.
export function formatDateDivider(iso) {
    const date = new Date(iso);
    const now = new Date();

    if (isSameDay(date, now)) {
        return "Today";
    }
    if (isYesterday(date, now)) {
        return "Yesterday";
    }
    return date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

// Two messages fall in the same divider group if they were sent on the same
// calendar day.
export function isSameDayGroup(isoA, isoB) {
    return isSameDay(new Date(isoA), new Date(isoB));
}

// "last seen just now" / "5m ago" / "3h ago" / "2d ago" — for the chat
// header when a participant is offline. Takes a raw Firestore Timestamp
// (not an ISO string, unlike everything else in this file) since presence
// data is kept raw for isUserOnline's own Date.now() math — see
// src/features/chat/utils/presence.js. Returns null if there's nothing to
// show yet (no lastSeen recorded).
export function formatLastSeen(lastSeenTimestamp) {
    if (!lastSeenTimestamp || typeof lastSeenTimestamp.toMillis !== "function") return null;

    const diffMs = Date.now() - lastSeenTimestamp.toMillis();
    if (diffMs < 60000) return "last seen just now";

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `last seen ${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `last seen ${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `last seen ${days}d ago`;
}

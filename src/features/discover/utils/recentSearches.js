/*
 ? Recent Discover searches (localStorage)

 * A small per-device history of user uids this browser has opened a chat
 * with from the Discover page — most-recent-first, capped at MAX_RECENT.
 * Deliberately NOT synced anywhere (not Firestore, not cross-device); it's
 * just "who did this browser search for," rendered by re-fetching each uid
 * fresh via userService.getUser (see DiscoverPage.jsx) rather than trusting
 * whatever name/photo was true at the time it was added.

 * Every access is wrapped in try/catch — localStorage can throw (private
 * browsing, disabled storage, quota) or the stored value can be garbage
 * from an older shape; either way this degrades to "no recent history"
 * rather than breaking the page.
*/

const STORAGE_KEY = "webchat:recentSearches";
const MAX_RECENT = 10;

/**
 * @returns {string[]} uids, most-recent-first
 */
export function getRecentUids() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((uid) => typeof uid === "string") : [];
    } catch {
        return [];
    }
}

/**
 * Records a uid at the front of the recent list — dedupes (moves it to the
 * front if it's already present) and caps at MAX_RECENT.
 *
 * @param {string} uid
 */
export function addRecentUid(uid) {
    try {
        const existing = getRecentUids().filter((id) => id !== uid);
        const next = [uid, ...existing].slice(0, MAX_RECENT);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Best-effort — recent history is a nice-to-have, not a reason to
        // block starting a chat.
    }
}

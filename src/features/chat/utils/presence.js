/*
 ? Presence derivation

 * Firestore has no RTDB-style onDisconnect, so an abrupt tab close never
 * gets the chance to write `online: false` — the raw flag alone can lie.
 * isUserOnline treats `online` as advisory and cross-checks `lastSeen`
 * against a freshness threshold: stale-but-true resolves to offline.

 * THRESHOLD must exceed HEARTBEAT (see src/hooks/usePresence.js, which
 * heartbeats every HEARTBEAT ms) so an actively-open tab never flickers
 * offline between two heartbeats.
*/

export const PRESENCE_HEARTBEAT_MS = 30000;
export const PRESENCE_THRESHOLD_MS = 75000;

/**
 * Derives whether a user profile should be shown as online: the raw flag
 * must be true AND lastSeen must be within PRESENCE_THRESHOLD_MS of now.
 *
 * @param {{ online?: boolean, lastSeen?: { toMillis: () => number } } | null} profile
 * @returns {boolean}
 */
export function isUserOnline(profile) {
    if (!profile || profile.online !== true) return false;
    const lastSeen = profile.lastSeen;
    if (!lastSeen || typeof lastSeen.toMillis !== "function") return false;
    return Date.now() - lastSeen.toMillis() < PRESENCE_THRESHOLD_MS;
}

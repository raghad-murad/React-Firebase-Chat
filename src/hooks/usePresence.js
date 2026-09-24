import { useEffect } from "react";
import { setUserPresence } from "@/features/chat/services/userService.js";
import { PRESENCE_HEARTBEAT_MS } from "@/features/chat/utils/presence.js";

/*
 ? usePresence

 * Keeps the signed-in user's users/{uid} presence flag live while they're
 * signed in — mounted once from AuthProvider whenever there's a user, so it
 * runs for the whole authed session regardless of what page is showing.

 * Writes:
 *   - on mount: online: true
 *   - heartbeat, every PRESENCE_HEARTBEAT_MS, but only while the tab is
 *     actually visible (a backgrounded tab shouldn't keep claiming online)
 *   - visibilitychange: hidden -> false, visible -> true (immediate, not
 *     waiting for the next heartbeat tick)
 *   - pagehide/beforeunload: best-effort false — the write may not finish
 *     before the page is gone, which is fine, since the staleness check in
 *     utils/presence.js's isUserOnline covers that case once lastSeen ages
 *     out past PRESENCE_THRESHOLD_MS.

 * Deliberately does NOT write false on cleanup/unmount — unmount here means
 * the uid changed or the app tore down, and authService.signOutUser already
 * calls setUserOffline as part of signing out. Writing here too would just
 * be a redundant, possibly-racing second write.
*/
export function usePresence(uid) {
    useEffect(() => {
        if (!uid) return;

        const writePresence = (isOnline) => {
            setUserPresence(uid, isOnline).catch((error) => {
                console.error("Failed to update presence:", error);
            });
        };

        writePresence(true);

        const intervalId = setInterval(() => {
            if (document.visibilityState === "visible") {
                writePresence(true);
            }
        }, PRESENCE_HEARTBEAT_MS);

        const handleVisibilityChange = () => {
            writePresence(document.visibilityState === "visible");
        };

        const handleUnload = () => {
            writePresence(false);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handleUnload);
        window.addEventListener("beforeunload", handleUnload);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", handleUnload);
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, [uid]);
}

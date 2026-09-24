import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebase.js";
import { subscribeToUser } from "@/features/chat/services/userService.js";
import { usePresence } from "@/hooks/usePresence.js";
import { AuthContext } from "./AuthContext.js";

/*
 ? AuthProvider Component

 * Subscribes to Firebase's auth state exactly once and shares the result
 * ({ user, loading, refreshUser, profile, profileLoading }) with the
 * entire tree via AuthContext. This replaces every component
 * (ProtectedRoute, PublicRoute, ...) opening its own onAuthStateChanged
 * listener — one subscription, many consumers via useAuth().

 * Also subscribes to the signed-in user's Firestore profile doc
 * (users/{uid}) once they're verified, so Settings' "About Me" panel (its
 * setup-mode check) and anything else reading useAuth().profile all read
 * the same live profile instead of each fetching it separately.

 * Props:
   - children (ReactNode, required): the app tree that needs access to auth state
*/

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Firebase's auth.currentUser.reload() mutates the *existing* User
    // object in place and does NOT fire onAuthStateChanged — so calling
    // setUser(auth.currentUser) afterwards would pass the exact same
    // object reference back in, and React bails out of re-rendering on an
    // unchanged reference. Consumers (like the email-verification gate)
    // would silently keep reading the stale emailVerified value forever.
    // Spreading into a new plain object forces the reference to change so
    // useAuth() actually reflects the refreshed user.
    const refreshUser = useCallback(async () => {
        if (!auth.currentUser) return;
        await auth.currentUser.reload();
        setUser(auth.currentUser ? { ...auth.currentUser } : null);
    }, []);

    // Only start watching the Firestore profile once there's a verified
    // user — nothing reads it any earlier than that (Settings is behind
    // ProtectedRoute's own emailVerified gate). Keyed on the primitive uid/emailVerified
    // values (not the `user` object itself) so this effect doesn't tear
    // down and rebuild the onSnapshot listener every time refreshUser()
    // hands back a new `user` object reference (e.g. every few seconds
    // while VerifyEmail polls) when neither actually changed.
    const uid = user?.uid ?? null;
    const emailVerified = user?.emailVerified ?? false;

    // Live presence heartbeat for the signed-in user — runs for the whole
    // authed session, not gated on emailVerified/profileCompleted, since it
    // just keeps users/{uid}'s online flag + lastSeen fresh (see
    // src/hooks/usePresence.js).
    usePresence(uid);

    useEffect(() => {
        if (!uid || !emailVerified) {
            setProfile(null);
            setProfileLoading(false);
            return;
        }

        setProfileLoading(true);
        const unsubscribe = subscribeToUser(uid, (userProfile) => {
            setProfile(userProfile);
            setProfileLoading(false);
        });

        return () => unsubscribe();
    }, [uid, emailVerified]);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, profile, profileLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

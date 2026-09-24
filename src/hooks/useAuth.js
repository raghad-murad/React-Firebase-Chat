import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext.js";

/*
 ? useAuth Hook

 * Reads the current { user, loading, refreshUser, profile, profileLoading }
 * auth state from AuthContext. Must be called from within an
 * <AuthProvider> (see src/context/AuthProvider.jsx).

 * Returns:
   - user (import("firebase/auth").User | null): the signed-in user, or null
   - loading (boolean): true until the initial auth check resolves
   - refreshUser (() => Promise<void>): re-checks the current user against
     Firebase (e.g. after they click an email verification link, or after
     saving a profile change that updates displayName) and updates what
     useAuth() returns everywhere. See AuthProvider.jsx for why this needs
     to exist instead of just calling auth.currentUser.reload() directly.
   - profile (object | null): the signed-in, verified user's live
     users/{uid} Firestore doc (realtime — updates on its own when the doc
     changes). null if there's no user, the user isn't verified yet, or the
     doc doesn't exist.
   - profileLoading (boolean): true while that doc's first snapshot is
     still in flight. ProtectedRoute shows a Loader for this, the same way
     it does for the top-level `loading`.
*/

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}

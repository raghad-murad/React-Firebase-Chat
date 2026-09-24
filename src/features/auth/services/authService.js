/*
 ? Auth Service

 * The only module in the app that talks to firebase/auth directly for sign
 * in/up/out, email verification, and account deletion. Components call
 * these functions and never import the Firebase SDK themselves — that
 * keeps the SDK swappable and the error-message mapping in one place
 * instead of duplicated per form.

 * Also keeps each user's Firestore profile (users/{uid}) in sync via
 * userService: created with a display name, profileCompleted: false, and a
 * verification email sent on sign-up (username is deliberately left unset —
 * see signUp below); refreshed (online/lastSeen) on every sign-in; flipped
 * offline on sign-out; and torn down entirely on account deletion.
*/

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    sendEmailVerification,
    deleteUser,
} from "firebase/auth";
import { auth } from "@/firebase/firebase.js";
import {
    upsertUserProfile,
    setUserOffline,
    setProfileCompleted,
    deleteUserDoc,
} from "@/features/chat/services/userService.js";

// Maps Firebase Auth error codes to user-facing messages.
// Falls back to error.message for anything not listed here.
const FRIENDLY_ERRORS = {
    "auth/invalid-credential": "There is a problem with your email or password. Please check and try again.",
    "auth/email-already-in-use": "This email is already registered. Please log in or use another email.",
};

function toFriendlyError(error) {
    return FRIENDLY_ERRORS[error.code] ?? error.message;
}

export async function signIn(email, password) {
    try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        // Refreshes online/lastSeen on every login, and back-fills a
        // users/{uid} doc for accounts created before Firestore was wired up.
        // Deliberately does NOT touch profileCompleted — see upsertUserProfile.
        await upsertUserProfile(user);
        return user;
    } catch (error) {
        throw new Error(toFriendlyError(error));
    }
}

export async function signUp(name, email, password) {
    try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        await sendEmailVerification(user);
        // Runs after updateProfile so the Firestore doc gets the real name,
        // not an empty one — updateProfile mutates `user` in place.
        await upsertUserProfile(user);
        // A brand-new account hasn't filled in "About Me" yet — SignUpForm's
        // success handler navigates straight to Settings, which reads this
        // flag to open in setup mode. Separate call (not part of
        // upsertUserProfile) since that one also runs on every future login
        // and must never reset this back to false.
        //
        // username is deliberately left unset here (no default generated
        // anymore) — usernameValidation now requires a non-empty value, and
        // AboutMePanel's setup-mode save blocks on it, so a new user must
        // actually choose one during profile setup rather than getting a
        // generated placeholder they might never notice or change.
        await setProfileCompleted(user.uid, false);
        return user;
    } catch (error) {
        throw new Error(toFriendlyError(error));
    }
}

export async function signOutUser() {
    const currentUser = auth.currentUser;

    if (currentUser) {
        try {
            await setUserOffline(currentUser.uid);
        } catch {
            // Best-effort: presence is a nice-to-have, not a reason to strand
            // someone signed in because a Firestore write failed.
        }
    }

    return signOut(auth);
}

// Re-sends the verification email to whoever's currently signed in — used
// by the VerifyEmail gate's "Resend email" button.
export function resendVerificationEmail() {
    if (!auth.currentUser) {
        return Promise.reject(new Error("No signed-in user to verify."));
    }
    return sendEmailVerification(auth.currentUser);
}

/**
 * Permanently deletes the signed-in user's account: their Firestore
 * profile doc first, then the Firebase Auth account itself (which signs
 * them out as a side effect — there's no separate signOut call needed
 * after this succeeds).
 *
 * Order note: the Firestore doc is deleted first, per how this is
 * currently wired. If deleteUser() then fails (most likely
 * auth/requires-recent-login, handled below), the profile doc is already
 * gone but the Auth account still exists — an acceptable rough edge for
 * now since a full re-auth-and-retry flow isn't built yet, not a real
 * transaction.
 *
 * Known limitation (not built yet, same as userService.deleteUserDoc):
 * this doesn't clean up the user's chats or messages.
 *
 * @returns {Promise<void>}
 */
export async function deleteAccount() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("No signed-in user to delete.");
    }

    try {
        await deleteUserDoc(currentUser.uid);
        await deleteUser(currentUser);
    } catch (error) {
        if (error.code === "auth/requires-recent-login") {
            throw new Error(
                "For security, please log out and log in again, then retry deleting your account."
            );
        }
        throw new Error(toFriendlyError(error));
    }
}

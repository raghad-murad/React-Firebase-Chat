/*
 ? User Service (Firestore)

 * The only module that talks to the `users/{uid}` collection — the
 * denormalized profile doc (name, photo, online status, and now the
 * editable "About Me" fields) that the rest of the app reads instead of
 * hitting Firebase Auth directly. Components call these functions and
 * never import firebase/firestore themselves.

 * Document shape (users/{uid}), flat — no nesting:
   {
     uid, name, email, online, lastSeen,                  // set by upsertUserProfile (every sign-in/up)
     photoURL, firstName, lastName, phone, bio,            // set by updateUserProfile ("About Me" save)
     statusMessage, country, city, updatedAt,               // set by updateUserProfile
     profileCompleted,                                      // false on signUp, true on first successful save
     username,                                     // unset until the user sets one via updateUserProfile
   }

 * photoURL is owned exclusively by updateUserProfile — upsertUserProfile
 * (which runs on every sign-in) must never write it, or it clobbers the
 * saved avatar with Auth's always-empty photoURL on every login.

 * username is a separate, REQUIRED handle from `name` (the display name) —
 * lowercase letters/digits/`_`/`.`/`-` only, 3-20 chars (see
 * utils/validation.js's usernameValidation), NOT unique. Left unset at
 * sign-up on purpose (authService.signUp no longer generates a default) so
 * AboutMePanel's setup-mode save is forced to block until the user actually
 * chooses one. Same clobber risk as photoURL otherwise: it's edited via
 * updateUserProfile only; upsertUserProfile/setUserPresence/setUserOffline
 * must never write it, since any of those would clobber a since-changed
 * username on the next login or presence tick.

 * updateUserProfile is the one exception to "this file only touches
 * Firestore" — it also calls firebase/auth's updateProfile() to keep
 * auth.currentUser.displayName in sync with the Firestore name, per the
 * same reasoning VerifyEmail.jsx documents for reading auth.currentUser
 * directly: the two need to agree, and only the Auth SDK can update the
 * Auth side.
*/

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, orderBy, startAt, endAt, limit, getDocs } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "@/firebase/firebase.js";

const USERS_COLLECTION = "users";

function toUserProfile(snapshot) {
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Creates or updates the signed-in user's profile doc — call this right
 * after sign-in/sign-up. Takes a Firebase Auth User (or anything with the
 * same uid/displayName/email shape) and merges it in, marking the user
 * online with a fresh lastSeen. Uses setDoc with { merge: true } so it
 * never clobbers fields this function doesn't know about.
 *
 * Deliberately never touches `profileCompleted` — this runs on every
 * sign-in as well as sign-up, and a login must never reset that flag back
 * to false. See authService.signUp for where profileCompleted actually
 * gets initialized.
 *
 * Deliberately never touches `photoURL` either, including on first
 * creation. The avatar is owned by updateUserProfile and lives only in
 * Firestore, as a data URL — it's never pushed to Firebase Auth (see
 * updateUserProfile's own doc comment for why), so auth.currentUser.photoURL
 * is always empty. Writing it here, even as `?? null`, would merge that
 * emptiness over the real saved photo on every single login. Not having the
 * field yet is fine — Avatar falls back to initials until one is set.
 *
 * @param {{ uid: string, displayName?: string, email?: string }} user
 * @returns {Promise<void>}
 */
export async function upsertUserProfile(user) {
    const ref = doc(db, USERS_COLLECTION, user.uid);
    await setDoc(
        ref,
        {
            uid: user.uid,
            name: user.displayName ?? "",
            email: user.email ?? "",
            online: true,
            lastSeen: serverTimestamp(),
        },
        { merge: true }
    );
}

/**
 * One-off read of a user's profile doc.
 *
 * @param {string} uid
 * @returns {Promise<object | null>} the profile, or null if it doesn't exist
 */
export async function getUser(uid) {
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
    return toUserProfile(snapshot);
}

/**
 * Subscribes to realtime updates for one user's profile doc (e.g. to show
 * live online/offline status, or to drive AuthProvider's `profile`). Call
 * the returned function to unsubscribe.
 *
 * @param {string} uid
 * @param {(user: object | null) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToUser(uid, callback) {
    return onSnapshot(doc(db, USERS_COLLECTION, uid), (snapshot) => {
        callback(toUserProfile(snapshot));
    });
}

/**
 * Sets a user's raw presence flag + a fresh lastSeen. This is the RAW
 * flag only — components displaying someone else's presence should derive
 * "online" from it via src/features/chat/utils/presence.js's isUserOnline,
 * not read `online` directly, since a stale-but-still-true flag (e.g. an
 * abrupt tab close that never got a chance to write false) needs staleness
 * checking to resolve to offline. See src/hooks/usePresence.js for the
 * caller that keeps this fresh for the signed-in user while they're active.
 *
 * @param {string} uid
 * @param {boolean} isOnline
 * @returns {Promise<void>}
 */
export async function setUserPresence(uid, isOnline) {
    const ref = doc(db, USERS_COLLECTION, uid);
    await setDoc(ref, { online: isOnline, lastSeen: serverTimestamp() }, { merge: true });
}

/**
 * Marks a user offline with a fresh lastSeen — call this right before
 * signing out. Deliberately simple/throwing (not best-effort) here; it's
 * authService.signOutUser's job to decide that a failed write shouldn't
 * block logout, not this function's. A thin wrapper over setUserPresence.
 *
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function setUserOffline(uid) {
    return setUserPresence(uid, false);
}

/**
 * Sets the profileCompleted flag directly, with no other side effects.
 * Used once, by authService.signUp, to initialize a brand-new account to
 * profileCompleted: false. (updateUserProfile below sets it to true as
 * part of a real "About Me" save — this function exists so signUp doesn't
 * have to go through that whole save path just to set one flag.)
 *
 * @param {string} uid
 * @param {boolean} completed
 * @returns {Promise<void>}
 */
export async function setProfileCompleted(uid, completed) {
    const ref = doc(db, USERS_COLLECTION, uid);
    await setDoc(ref, { profileCompleted: completed }, { merge: true });
}

/**
 * Saves the "About Me" form: computes the canonical display `name` from
 * firstName/lastName (falling back to the current auth displayName if both
 * are empty), merges the given fields into users/{uid} along with that name
 * and profileCompleted: true, and keeps auth.currentUser.displayName in
 * sync. The caller is expected to call useAuth().refreshUser() afterwards
 * so components reading `user.displayName` see the update too (updateProfile
 * mutates auth.currentUser in place, same as the emailVerified case).
 *
 * photoURL, when included, is expected to be a small JPEG data URL (see
 * src/features/settings/utils/processAvatarImage.js) or null to remove the
 * photo — NOT passed to Firebase Auth's updateProfile below, deliberately:
 * only displayName goes there. Auth's photoURL field has a much shorter
 * length limit than a data URL and would reject it; the photo lives in
 * Firestore only, which is also why every Avatar in the app is expected to
 * read photoURL from useAuth().profile, not from the Auth user object.
 *
 * @param {string} uid
 * @param {{ firstName?: string, lastName?: string, phone?: string, bio?: string, statusMessage?: string, country?: string, city?: string, photoURL?: string | null }} fields
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, fields) {
    const firstName = fields.firstName ?? "";
    const lastName = fields.lastName ?? "";
    const computedName = `${firstName} ${lastName}`.trim();
    const name = computedName || auth.currentUser?.displayName || "";

    const ref = doc(db, USERS_COLLECTION, uid);
    await setDoc(
        ref,
        {
            ...fields,
            name,
            profileCompleted: true,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
    }
}

/**
 * Finds a user by exact email match — used by the "start a new
 * conversation" search in ConversationList. Exact match only for now; a
 * lowercased-email field for case-insensitive search can come later.
 *
 * @param {string} email
 * @returns {Promise<object | null>} the first matching user, or null
 */
export async function findUserByEmail(email) {
    const trimmedEmail = email.trim();
    const usersQuery = query(collection(db, USERS_COLLECTION), where("email", "==", trimmedEmail), limit(1));
    const snapshot = await getDocs(usersQuery);
    if (snapshot.empty) return null;

    const docSnapshot = snapshot.docs[0];
    return { id: docSnapshot.id, ...docSnapshot.data() };
}

/**
 * Searches users by username prefix — powers the Discover page's search
 * box. Case-insensitive: the prefix is lowercased before querying, matching
 * how usernames are always stored. A single-field range query (orderBy +
 * startAt/endAt on `username`), which Firestore indexes automatically —
 * no composite index needed. Always excludes the signed-in user.
 *
 * @param {string} prefix
 * @param {string} currentUid
 * @returns {Promise<object[]>}
 */
export async function searchUsersByUsername(prefix, currentUid) {
    const normalizedPrefix = prefix.trim().toLowerCase();
    const usersQuery = query(
        collection(db, USERS_COLLECTION),
        orderBy("username"),
        startAt(normalizedPrefix),
        endAt(normalizedPrefix + ""),
        limit(20)
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .filter((userDoc) => userDoc.id !== currentUid);
}

/**
 * Searches users by username prefix OR exact email — powers the Discover
 * page's search box. Runs a username-prefix search (via
 * searchUsersByUsername above) and an exact email search
 * (where('email', '==', ...), same shape as findUserByEmail but limit(20)
 * instead of limit(1)) in parallel — both single-field queries, no
 * composite index needed — merges the results, dedupes by uid, and always
 * excludes the signed-in user.
 *
 * Email matching is exact/case-sensitive as stored — no separate
 * lowercased-email field exists yet (same known limitation
 * findUserByEmail's doc comment already notes).
 *
 * @param {string} term
 * @param {string} currentUid
 * @returns {Promise<object[]>}
 */
export async function searchUsers(term, currentUid) {
    const trimmedTerm = term.trim();
    if (trimmedTerm === "") {
        return [];
    }

    const emailQuery = query(collection(db, USERS_COLLECTION), where("email", "==", trimmedTerm), limit(20));

    const [usernameResults, emailSnapshot] = await Promise.all([
        searchUsersByUsername(trimmedTerm, currentUid),
        getDocs(emailQuery),
    ]);

    const byId = new Map();
    for (const userDoc of usernameResults) {
        byId.set(userDoc.id, userDoc);
    }
    for (const docSnapshot of emailSnapshot.docs) {
        byId.set(docSnapshot.id, { id: docSnapshot.id, ...docSnapshot.data() });
    }
    byId.delete(currentUid);

    return Array.from(byId.values());
}

/**
 * Lists existing users for the Discover page's default (empty-search)
 * view. Always excludes the signed-in user.
 *
 * @param {string} currentUid
 * @param {number} [max=50]
 * @returns {Promise<object[]>}
 */
export async function listAllUsers(currentUid, max = 50) {
    const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("name"), limit(max));
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .filter((userDoc) => userDoc.id !== currentUid);
}

/**
 * Deletes a user's Firestore profile doc. Used by authService.deleteAccount.
 *
 * Known limitation (not built yet): this only removes the users/{uid} doc —
 * it does not clean up that user's chats or messages. Cleaning those up
 * (or reassigning/anonymizing them) is a later step.
 *
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deleteUserDoc(uid) {
    await deleteDoc(doc(db, USERS_COLLECTION, uid));
}

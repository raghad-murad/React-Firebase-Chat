/*
 ? Firebase Configuration Module

 * Initializes and exports the Firebase Authentication and Firestore
 * instances for the app. This module sets up the connection to the
 * Firebase project using the web SDK.

 * Configuration:
   - Values are read from environment variables (see .env.example) so each
     environment (dev/staging/prod) can point at its own Firebase project
     without editing source. Firestore reuses the same config — no separate
     env vars needed.
   - Services used:
       - Firebase Authentication (for user sign-up/sign-in)
       - Cloud Firestore (chats, messages, user profiles)

 * Exports:
   - auth: Configured Firebase Auth instance ready to use in the app
   - db: Configured Firestore instance ready to use in the app

 * No Cloud Storage instance here on purpose — message attachments and
 * profile photos are both stored as base64 data URLs directly in Firestore
 * fields (see messageService.sendAttachmentMessage / userService.
 * updateUserProfile) specifically to avoid a Storage dependency and its
 * CORS-configuration requirements.

 * Emulator mode: when VITE_USE_EMULATOR is exactly the string "true" (set
 * by playwright.config.js's webServer for the E2E suite only — see
 * e2e/README or playwright.config.js), auth/db are pointed at the local
 * Firebase Emulator Suite instead of the real project. Never set this in a
 * normal .env — normal `npm run dev`/build never define this var, so
 * import.meta.env.VITE_USE_EMULATOR is undefined and this block is skipped
 * entirely, leaving dev/prod behavior completely unchanged.
*/

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.VITE_USE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

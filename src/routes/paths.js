/*
 ? Route path constants

 * Single source of truth for every route in the app. Import ROUTES instead
 * of typing raw path strings so navigation, <Route> definitions, and links
 * can never drift out of sync (or disagree on casing) with each other.

 * chatThread(id) builds a link to a specific open conversation
 * (/chat/<id>) — the actual <Route> is registered as "/chat/:chatId?" in
 * App.jsx (an optional param, so bare /chat still matches with no
 * conversation open). chat itself stays "/chat" unchanged.
*/

export const ROUTES = {
    signIn: "/sign-in",
    signUp: "/sign-up",
    chat: "/chat",
    chatThread: (id) => `/chat/${id}`,
    settings: "/settings",
    discover: "/discover",
};

import { createContext } from "react";

/*
 ? AuthContext

 * The raw context object only — kept in its own file (no component, no hook)
 * so files that export a React component stay component-only, which is what
 * the react-refresh/only-export-components lint rule requires for Fast Refresh
 * to work reliably. See AuthProvider.jsx for the provider and
 * src/hooks/useAuth.js for the consuming hook.

 * Shape: {
 *   user: import("firebase/auth").User | null,
 *   loading: boolean,
 *   refreshUser: () => Promise<void>,
 *   profile: object | null,        // live users/{uid} doc, once the user is verified
 *   profileLoading: boolean,        // true while that doc's first snapshot is in flight
 * }
*/

export const AuthContext = createContext(undefined);

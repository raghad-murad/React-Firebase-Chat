import { useAuth } from "@/hooks/useAuth.js";
import Loader from "@/components/ui/Loader/Loader.jsx";
import Lockout from "@/pages/LockoutPage/Lockout.jsx";
import VerifyEmail from "@/features/auth/pages/VerifyEmailPage/VerifyEmail.jsx";

/*
 ? ProtectedRoute Component

 * A route guard that restricts access to authenticated-only routes.
 * Reads auth state from useAuth() instead of running its own Firebase listener.

 * Props:
   - children (ReactNode, required): The protected content or route to render if the user is authenticated

 * Returns:
   - (JSX.Element):
       - <Loader> during the initial authentication check
       - <Lockout> (which redirects to sign-in) if no user is found
       - <VerifyEmail> if the user is signed in but hasn't verified their email
       - `children` otherwise

 * Deliberately does NOT gate on profile.profileCompleted — whether a
 * brand-new user lands on Settings is decided once, per-action, by
 * SignUpForm's success handler (navigate to ROUTES.settings) and
 * SignInForm's (navigate to ROUTES.chat). A persistent gate here used to
 * force-redirect every existing/legacy account (profileCompleted !== true
 * for any account created before that field existed) to Settings on every
 * login and every reload — see AboutMePanel/SettingsPage for the
 * "setup mode" heading that still shows when profileCompleted isn't true,
 * without forcing navigation there.
*/

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader label="Authentication verification..." />;
    }

    if (!user) {
        return <Lockout duration={3000} />;
    }

    if (!user.emailVerified) {
        return <VerifyEmail />;
    }

    return children;
}

export default ProtectedRoute;

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import Loader from "@/components/ui/Loader/Loader.jsx";
import { ROUTES } from "@/routes/paths.js";

/*
 ? PublicRoute Component

 * The inverse of ProtectedRoute: guards routes that should only be visible to
 * signed-out visitors (sign-in, sign-up). An already-authenticated user is
 * redirected straight to the chat page instead of seeing the auth forms again.

 * Props:
   - children (ReactNode, required): the public-only content to render if no user is signed in

 * Returns:
   - (JSX.Element):
       - <Loader> during the initial authentication check
       - <Navigate> to the chat route if a user is already signed in
       - `children` if no user is signed in
*/

function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader label="Checking session..." />;
    }

    if (user) {
        return <Navigate to={ROUTES.chat} replace />;
    }

    return children;
}

export default PublicRoute;

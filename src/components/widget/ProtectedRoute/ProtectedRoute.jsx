import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { auth } from '../../../firebase/firebase.js';
import Loader from '../../ui/Loader/Loader.jsx'
import Lockout from '../../../pages/LockoutPage/Lockout.jsx'

/*
 ? ProtectedRoute Component
  
 * A route guard component that restricts access to certain routes based on user authentication state.
 * If the user is not logged in, they are redirected to the login page and shown an error toast.
   
 * Props:
   - children (ReactNode, required): The protected content or route to render if the user is authenticated
   
 * Returns:
   - (JSX.Element | null): 
       - <Loader> during authentication check
       - <Navigate> to "/SignIn" if user is not authenticated
       - `children` if user is authenticated
       - null during transitions (handled internally by Navigate)
   
 * Flow:
   1. On mount, subscribes to auth state changes
   2. Shows a loader while checking authentication
   3. If no user is found, shows an error toast and redirects to "/SignIn"
  4. If user exists, renders the protected `children`
*/

function ProtectedRoute({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loader loaderLabel="Authentication verification..." />;
    }

    if (!user) {
        return <Lockout duration={3000} />;
    }

    return children;
}

export default ProtectedRoute;
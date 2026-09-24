import './App.css'
import { Routes, Route } from "react-router-dom";
import SignIn from '../features/auth/pages/SignInPage.jsx';
import SignUp from '../features/auth/pages/SignUpPage.jsx';
import Chat from '../features/chat/pages/ChatPage/Chat.jsx'
import Settings from '../features/settings/pages/SettingsPage/SettingsPage.jsx'
import Discover from '../features/discover/pages/DiscoverPage/DiscoverPage.jsx'
import NotFound from '../pages/NotFound/NotFound.jsx'
import ProtectedRoute from '../routes/guards/ProtectedRoute.jsx';
import PublicRoute from '../routes/guards/PublicRoute.jsx';
import { ROUTES } from '../routes/paths.js';

/*
 ? Main App component

 * This component sets up the application's routing structure using React Router.
 * It defines the available routes and maps each route to a corresponding page component.

 * Routes:
   - "/"              → SignIn page (same as ROUTES.signIn, via PublicRoute)
   - ROUTES.signIn     → SignIn page (PublicRoute — redirects an already-signed-in user to chat)
   - ROUTES.signUp     → SignUp page (PublicRoute)
   - "/chat/:chatId?"  → Chat page (ProtectedRoute) — :chatId is an optional
                          param (React Router's "?" optional-segment syntax),
                          so bare ROUTES.chat ("/chat") still matches with no
                          conversation open; ROUTES.chatThread(id) builds the
                          deep link to a specific one. Chat.jsx reads it via
                          useParams().
   - ROUTES.settings    → Settings page (ProtectedRoute — post-login account settings)
   - ROUTES.discover    → Discover page (ProtectedRoute — browse/search other users, start a chat)
   - "*"               → NotFound page (catch-all for undefined routes)
*/

function App() {

    return (
        <Routes>
            <Route path="/" element={
                <PublicRoute>
                    <SignIn />
                </PublicRoute>
            }
            />
            <Route path={ROUTES.signIn} element={
                <PublicRoute>
                    <SignIn />
                </PublicRoute>
            }
            />
            <Route path={ROUTES.signUp} element={
                <PublicRoute>
                    <SignUp />
                </PublicRoute>
            }
            />
            <Route path={`${ROUTES.chat}/:chatId?`} element={
                <ProtectedRoute>
                    <Chat />
                </ProtectedRoute>
            }
            />
            <Route path={ROUTES.settings} element={
                <ProtectedRoute>
                    <Settings />
                </ProtectedRoute>
            }
            />
            <Route path={ROUTES.discover} element={
                <ProtectedRoute>
                    <Discover />
                </ProtectedRoute>
            }
            />
            <Route path="*" element={<NotFound />} />
        </Routes>
    )
}

export default App

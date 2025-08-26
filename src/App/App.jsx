import './App.css'
import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from '../pages/SignInPage/SignInPage.jsx';
import SignUp from '../pages/SignUpPage/SignUpPage.jsx';
import Chat from '../pages/ChatPage/Chat.jsx'
import NotFound from '../pages/NotFound/NotFound.jsx'
import ProtectedRoute from '../components/widget/ProtectedRoute/ProtectedRoute.jsx';

/*
 ? Main App component
 
 * This component sets up the application's routing structure using React Router. 
 * It defines the available routes and maps each route to a corresponding page component.

 * Routes:
   - "/"           → SignIn page (also serves as the landing page)
   - "/SignIn"     → SignIn page
   - "/SignUp"     → SignUp page
   - "/Chats"      → Chat page (main application view after login)
   - "*"           → NotFound page (catch-all for undefined routes)
*/

function App() {

    return (
        <Routes>
            <Route path="/" element={<SignIn />} />
            <Route path="/SignIn" element={<SignIn />} />
            <Route path="/SignUp" element={<SignUp />} />
            <Route path="/Chats" element={
                <ProtectedRoute>
                    <Chat />
                </ProtectedRoute>
            }
            />
            <Route path="*" element={<NotFound />} />
        </Routes>
    )
}

export default App
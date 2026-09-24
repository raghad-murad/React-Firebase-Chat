import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell/AppShell.jsx";
import SettingsSubNav from "../../components/SettingsSubNav/SettingsSubNav.jsx";
import AboutMePanel from "../../components/AboutMePanel/AboutMePanel.jsx";
import DeleteAccountPanel from "../../components/DeleteAccountPanel/DeleteAccountPanel.jsx";
import { signOutUser } from "@/features/auth/services/authService.js";
import { ROUTES } from "@/routes/paths.js";
import "./SettingsPage.css";

/*
 ? Settings Page

 * Reached via the gear icon in the icon rail, or automatically right after
 * creating a brand-new account (see SignUpForm's success handler, which
 * navigates here — not an ongoing route gate; ProtectedRoute no longer
 * redirects based on profileCompleted). Two-column layout inside AppShell:
 * a left sub-nav (About Me / Delete Account + a Log out footer action) and
 * whichever panel is active on the right. Purely a tab switcher — no new
 * routes, just local state.
*/

function SettingsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("about");

    const handleLogout = async () => {
        await signOutUser();
        navigate(ROUTES.signIn, { replace: true });
    };

    return (
        <AppShell>
            <div className="settings-page">
                <div className="settings-layout">
                    <SettingsSubNav activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
                    <div className="settings-content">
                        {activeTab === "about" ? <AboutMePanel /> : <DeleteAccountPanel />}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

export default SettingsPage;

import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes/paths.js";
import { useAuth } from "@/hooks/useAuth.js";
import { signOutUser } from "@/features/auth/services/authService.js";
import Avatar from "@/components/ui/Avatar/Avatar.jsx";
import {
    GlobeIcon,
    ChatIcon,
    VideoIcon,
    MusicIcon,
    CalendarIcon,
    SettingsIcon,
    LogoutIcon,
} from "@/components/ui/icons/index.jsx";
import logo from "@/assets/icon.svg";
import "./IconRail.css";

/*
 ? IconRail Component

 * The persistent left-most navigation rail shared by every post-login
 * screen. Shows the brand mark, the current user's avatar, primary
 * navigation, and account actions (settings, log out).

 * "Chats", "Settings", and "Discover" are wired to real routes — Calls and
 * Music/Calendar are structural placeholders for features that don't exist
 * yet, so they're rendered disabled rather than pretending to navigate
 * somewhere.
*/

const NAV_ITEMS = [
    { key: "discover", label: "Discover", Icon: GlobeIcon, to: ROUTES.discover },
    { key: "chats", label: "Chats", Icon: ChatIcon, to: ROUTES.chat },
    { key: "calls", label: "Calls", Icon: VideoIcon },
    { key: "music", label: "Music", Icon: MusicIcon },
    { key: "calendar", label: "Calendar", Icon: CalendarIcon },
];

function IconRail() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOutUser();
        navigate(ROUTES.signIn);
    };

    return (
        <nav className="icon-rail" aria-label="Main">
            <div className="icon-rail-top">
                <img className="icon-rail-logo" src={logo} alt="WebChat" />
                {/* Reads photoURL from the Firestore profile, not the Auth
                    user — Auth's photoURL never receives the uploaded photo
                    (see userService.updateUserProfile's comment for why). */}
                <Avatar
                    src={profile?.photoURL}
                    alt={profile?.name || user?.displayName || "Your profile"}
                    size="sm"
                />
            </div>

            <hr className="icon-rail-divider" />

            <div className="icon-rail-nav">
                {NAV_ITEMS.map((item) => {
                    const ItemIcon = item.Icon;

                    if (item.to) {
                        return (
                            <NavLink
                                key={item.key}
                                to={item.to}
                                className={({ isActive }) => `rail-icon${isActive ? " rail-icon-active" : ""}`}
                                title={item.label}
                            >
                                <ItemIcon />
                            </NavLink>
                        );
                    }

                    return (
                        <button
                            key={item.key}
                            type="button"
                            className="rail-icon"
                            title={`${item.label} — coming soon`}
                            disabled
                        >
                            <ItemIcon />
                        </button>
                    );
                })}
            </div>

            <div className="icon-rail-bottom">
                <NavLink
                    to={ROUTES.settings}
                    className={({ isActive }) => `rail-icon rail-icon-settings${isActive ? " rail-icon-active" : ""}`}
                    title="Settings"
                >
                    <SettingsIcon />
                </NavLink>
                <button type="button" className="rail-icon rail-icon-logout" title="Log out" onClick={handleLogout}>
                    <LogoutIcon />
                </button>
            </div>
        </nav>
    );
}

export default IconRail;

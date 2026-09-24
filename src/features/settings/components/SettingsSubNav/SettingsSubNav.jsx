import { LogoutIcon } from "@/components/ui/icons/index.jsx";
import "./SettingsSubNav.css";

/*
 ? SettingsSubNav Component

 * The left-hand sub-navigation on the Settings page: exactly two tabs
 * ("About Me", "Delete Account") plus a visually separated "Log out"
 * action pinned at the bottom — not a third tab. Local tab state lives in
 * the parent (SettingsPage); this component is purely presentational.

 * Log out lives here (not just in the icon rail) because the mobile
 * bottom tab bar has no logout icon of its own — Settings is its only
 * other reachable entry point on mobile.

 * Props:
   - activeTab ("about" | "delete", required)
   - onTabChange ((tab: "about" | "delete") => void, required)
   - onLogout (() => void, required)
*/

function SettingsSubNav({ activeTab, onTabChange, onLogout }) {
    return (
        <nav className="settings-subnav" aria-label="Settings">
            <button
                type="button"
                className={`settings-subnav-item${activeTab === "about" ? " settings-subnav-item-active" : ""}`}
                onClick={() => onTabChange("about")}
            >
                About Me
            </button>
            <button
                type="button"
                className={`settings-subnav-item settings-subnav-item-danger${activeTab === "delete" ? " settings-subnav-item-active" : ""}`}
                onClick={() => onTabChange("delete")}
            >
                Delete Account
            </button>

            <div className="settings-subnav-footer">
                <button type="button" className="settings-subnav-logout" onClick={onLogout}>
                    <LogoutIcon />
                    <span>Log out</span>
                </button>
            </div>
        </nav>
    );
}

export default SettingsSubNav;

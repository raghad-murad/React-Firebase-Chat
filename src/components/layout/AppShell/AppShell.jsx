import IconRail from '../IconRail/IconRail.jsx'
import './AppShell.css'

/*
 ? AppShell Component

 * The persistent post-login layout: the icon rail on the left, plus whatever
 * page content is passed as children. Shared by every authenticated screen
 * (chat, settings, and future feature pages) so the rail is only built once
 * and every screen gets the same look and feel around it.

 * On desktop the rail is a permanent vertical sidebar. Below the mobile
 * breakpoint it becomes a fixed bottom tab bar instead (see IconRail.css),
 * staying reachable everywhere — including inside a full-screen mobile view
 * like an open conversation in chat. hideRailOnMobile exists as an escape
 * hatch for a future screen that genuinely needs the whole viewport, but
 * nothing uses it today.

 * Props:
   - children (ReactNode, required): the page content to render next to the rail
   - hideRailOnMobile (boolean, optional): hides the bottom bar below the mobile breakpoint
*/

function AppShell({ children, hideRailOnMobile = false }) {
    return (
        <div className={`app-shell${hideRailOnMobile ? " app-shell-rail-hidden-mobile" : ""}`}>
            <IconRail />
            <div className="app-shell-content">
                {children}
            </div>
        </div>
    );
}

export default AppShell;

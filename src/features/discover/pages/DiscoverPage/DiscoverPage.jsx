import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell/AppShell.jsx";
import Avatar from "@/components/ui/Avatar/Avatar.jsx";
import { SearchIcon } from "@/components/ui/icons/index.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { useToast } from "@/hooks/useToast.jsx";
import { getUser, searchUsers } from "@/features/chat/services/userService.js";
import { createOrGetChat } from "@/features/chat/services/chatService.js";
import { ROUTES } from "@/routes/paths.js";
import { getRecentUids, addRecentUid } from "../../utils/recentSearches.js";
import "./DiscoverPage.css";

/*
 ? Discover Page

 * Search for other users and start a chat with one — reached via the globe
 * icon in the icon rail (see IconRail.jsx).

 * No default full-user-list: an empty search box shows "Recent" instead —
 * up to 10 people this device has opened a chat with from this page before
 * (see utils/recentSearches.js, a small localStorage-backed uid history),
 * each re-fetched fresh via userService.getUser so name/username/photo are
 * current even if the history entry is old. Typing switches to live
 * userService.searchUsers(term, currentUid) results (username prefix or
 * exact email), debounced ~300ms. Both always exclude the signed-in user.

 * This is a DIFFERENT search from ConversationList's "start a chat by
 * email" box in the Chat page — that one is exact-email-only; this one
 * additionally matches by username prefix. Deliberately left as two
 * separate features rather than merged, per the task that added this page.

 * Clicking a card starts (or reopens) a 1:1 chat via
 * chatService.createOrGetChat, records that uid at the front of the
 * recent-searches history, and navigates straight to the chat.
*/

function UserCard({ userDoc, onClick, isStarting }) {
    const name = userDoc.name || userDoc.email || "Unknown";

    return (
        <button
            type="button"
            className="discover-user-card"
            onClick={() => onClick(userDoc)}
            disabled={isStarting}
        >
            <Avatar src={userDoc.photoURL} alt={name} size="md" />
            <span className="discover-user-card-body">
                <span className="discover-user-card-name">{name}</span>
                {userDoc.username && <span className="discover-user-card-username">@{userDoc.username}</span>}
            </span>
        </button>
    );
}

function DiscoverPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [recentUsers, setRecentUsers] = useState([]);
    const [isLoadingRecent, setIsLoadingRecent] = useState(true);
    // Bumped after a click adds to the recent history, to re-run the
    // load-recent effect below without needing recentUids itself in state.
    const [recentVersion, setRecentVersion] = useState(0);

    const [startingChatUid, setStartingChatUid] = useState(null);

    const isSearchActive = searchTerm.trim() !== "";

    // Debounced live search — only runs while the box has something typed;
    // an empty box just clears any stale results (the Recent list below is
    // what renders instead). Keyed on primitive searchTerm/user.uid only.
    useEffect(() => {
        const trimmed = searchTerm.trim();
        if (!trimmed) {
            setSearchResults([]);
            return;
        }

        let cancelled = false;
        setIsSearching(true);
        const timeoutId = setTimeout(() => {
            searchUsers(trimmed, user.uid)
                .then((results) => {
                    if (!cancelled) setSearchResults(results);
                })
                .catch((error) => {
                    console.error("Failed to search users:", error);
                })
                .finally(() => {
                    if (!cancelled) setIsSearching(false);
                });
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [searchTerm, user.uid]);

    // Recent list — loaded on mount and reloaded whenever a click adds to
    // the history (recentVersion bump). Every uid is re-fetched via getUser
    // rather than trusting a cached snapshot, so a stale/deleted entry
    // either shows current data or quietly drops out (see the .catch).
    useEffect(() => {
        let cancelled = false;
        setIsLoadingRecent(true);

        const uids = getRecentUids().filter((uid) => uid !== user.uid);
        Promise.all(uids.map((uid) => getUser(uid).catch(() => null)))
            .then((profiles) => {
                if (!cancelled) setRecentUsers(profiles.filter(Boolean));
            })
            .finally(() => {
                if (!cancelled) setIsLoadingRecent(false);
            });

        return () => {
            cancelled = true;
        };
    }, [user.uid, recentVersion]);

    const handleUserClick = async (userDoc) => {
        const otherUid = userDoc.uid ?? userDoc.id;
        setStartingChatUid(otherUid);
        try {
            const chat = await createOrGetChat(user.uid, otherUid);
            addRecentUid(otherUid);
            setRecentVersion((v) => v + 1);
            navigate(ROUTES.chatThread(chat.id));
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setStartingChatUid(null);
        }
    };

    const displayedUsers = isSearchActive ? searchResults : recentUsers;
    const isLoading = isSearchActive ? isSearching : isLoadingRecent;

    let emptyMessage = null;
    if (!isLoading && displayedUsers.length === 0) {
        emptyMessage = isSearchActive
            ? "No users found for that username or email."
            : "Search for people by username or email to start a conversation.";
    }

    return (
        <AppShell>
            <div className="discover-page">
                <header className="discover-header">
                    <h1 className="discover-title">Discover</h1>
                    <label className="discover-search">
                        <SearchIcon className="discover-search-icon" />
                        <input
                            type="search"
                            placeholder="Search by username or email"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </label>
                </header>

                <div className="discover-list">
                    {!isSearchActive && !isLoading && displayedUsers.length > 0 && (
                        <h2 className="discover-section-title">Recent</h2>
                    )}

                    {isLoading ? (
                        <p className="discover-empty">{isSearchActive ? "Searching..." : "Loading..."}</p>
                    ) : emptyMessage ? (
                        <p className="discover-empty">{emptyMessage}</p>
                    ) : (
                        displayedUsers.map((userDoc) => (
                            <UserCard
                                key={userDoc.id}
                                userDoc={userDoc}
                                onClick={handleUserClick}
                                isStarting={startingChatUid === (userDoc.uid ?? userDoc.id)}
                            />
                        ))
                    )}
                </div>

                <ToastContainer />
            </div>
        </AppShell>
    );
}

export default DiscoverPage;

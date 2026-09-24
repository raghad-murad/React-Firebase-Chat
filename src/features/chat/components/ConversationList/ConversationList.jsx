import { useState } from "react";
import { SearchIcon, ChevronDownIcon } from "@/components/ui/icons/index.jsx";
import { useToast } from "@/hooks/useToast.jsx";
import ConversationListItem from "../ConversationListItem/ConversationListItem.jsx";
import "./ConversationList.css";

/*
 ? ConversationList Component

 * The left-hand panel of the chat page: the "Messages" header, a search
 * input that doubles as "start a new conversation by email", a sort
 * control, and the scrollable list of conversations.

 * The sort control is still a structural placeholder — the chats query is
 * already ordered by updatedAt desc, so "Newest" is the natural default and
 * there's nothing to wire yet. The search input IS wired: submitting it
 * (Enter, or the implicit form submit) calls onStartChat(email), which the
 * parent resolves via userService.findUserByEmail + chatService.createOrGetChat.
 * It doesn't filter the list as you type — only submit does anything.

 * Props:
   - conversations (array, required): hydrated conversations from ChatPage
   - activeConversationId (string | null): id of the currently open conversation
   - onSelect (function): called with a conversation id when a row is clicked
   - isHidden (boolean, optional): hides the whole panel on mobile (see ChatPage)
   - currentUserId (string, required): forwarded to each ConversationListItem
   - onStartChat ((email: string) => Promise<void>, required): starts (or
     opens) a chat with the user at that email; rejects with a friendly
     Error message on failure (no such user, or it's your own email), which
     this component catches and toasts
*/

function ConversationList({ conversations, activeConversationId, onSelect, isHidden = false, currentUserId, onStartChat }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isStarting, setIsStarting] = useState(false);
    const { showToast, ToastContainer } = useToast();

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        const email = searchTerm.trim();
        if (!email || isStarting) return;

        setIsStarting(true);
        try {
            await onStartChat(email);
            setSearchTerm("");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <section
            className={`conversation-list-panel${isHidden ? " conversation-list-panel-hidden-mobile" : ""}`}
            aria-label="Conversations"
        >
            <header className="conversation-list-header">
                <h1 className="conversation-list-title">Messages</h1>

                <form onSubmit={handleSearchSubmit}>
                    <label className="conversation-search">
                        <SearchIcon className="conversation-search-icon" />
                        <input
                            type="search"
                            placeholder="Search by email to start a chat"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isStarting}
                        />
                    </label>
                </form>

                <button type="button" className="conversation-sort">
                    Sort by
                    <span className="conversation-sort-value">
                        Newest
                        <ChevronDownIcon />
                    </span>
                </button>
            </header>

            <div className="conversation-list-scroll">
                {conversations.length === 0 ? (
                    <div className="conversation-list-empty">
                        <p>No conversations yet — search an email above to start chatting.</p>
                    </div>
                ) : (
                    conversations.map((conversation) => (
                        <ConversationListItem
                            key={conversation.id}
                            conversation={conversation}
                            isActive={conversation.id === activeConversationId}
                            onClick={onSelect}
                            currentUserId={currentUserId}
                        />
                    ))
                )}
            </div>

            <ToastContainer />
        </section>
    );
}

export default ConversationList;

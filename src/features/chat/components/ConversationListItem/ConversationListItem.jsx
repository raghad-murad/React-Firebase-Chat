import Avatar from "@/components/ui/Avatar/Avatar.jsx";
import { CheckIcon, DoubleCheckIcon } from "@/components/ui/icons/index.jsx";
import { formatConversationTimestamp } from "../../utils/formatTime.js";
import "./ConversationListItem.css";

/*
 ? ConversationListItem Component

 * A single row in the conversation list: avatar (with an online ring),
 * name, a preview of the last message (or a "is typing…" state), a
 * timestamp, and a trailing indicator that's one of three things —
 * an unread-count badge, or a sent/delivered/seen status tick for the
 * last message the current user sent.

 * Props:
   - conversation (object, required): a hydrated conversation from ChatPage
   - isActive (boolean): highlights the row when its conversation is open
   - onClick (function): called with the conversation id when the row is clicked
   - currentUserId (string, required): the signed-in user's uid — used to
     tell whether the last message was theirs (shows a status tick) or the
     other participant's (shows nothing extra)
*/

function StatusTick({ status }) {
    if (status === "sent") {
        return <CheckIcon className="status-tick status-tick-sent" />;
    }
    if (status === "delivered") {
        return <DoubleCheckIcon className="status-tick status-tick-delivered" />;
    }
    if (status === "seen") {
        return <DoubleCheckIcon className="status-tick status-tick-seen" />;
    }
    return null;
}

function ConversationListItem({ conversation, isActive, onClick, currentUserId }) {
    const { id, participant, lastMessage, isTyping, unreadCount, updatedAt } = conversation;
    const ownLastMessage = lastMessage?.senderId === currentUserId;

    return (
        <button
            type="button"
            className={`conversation-item${isActive ? " conversation-item-active" : ""}`}
            onClick={() => onClick(id)}
        >
            <Avatar src={participant.avatarUrl} alt={participant.name} online={participant.online} />

            <span className="conversation-item-body">
                <span className="conversation-item-top">
                    <span className="conversation-item-name">{participant.name}</span>
                    <span className="conversation-item-time">{formatConversationTimestamp(updatedAt)}</span>
                </span>
                <span className="conversation-item-bottom">
                    {isTyping ? (
                        <span className="conversation-item-typing">is typing…</span>
                    ) : (
                        <span className="conversation-item-preview">{lastMessage?.text}</span>
                    )}

                    {unreadCount > 0 ? (
                        <span className="unread-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                    ) : (
                        ownLastMessage && <StatusTick status={lastMessage.status} />
                    )}
                </span>
            </span>
        </button>
    );
}

export default ConversationListItem;

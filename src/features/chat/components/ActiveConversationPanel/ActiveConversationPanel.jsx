import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar/Avatar.jsx";
import Modal from "@/components/ui/Modal/Modal.jsx";
import { VideoIcon, InfoIcon, ArrowLeftIcon } from "@/components/ui/icons/index.jsx";
import { useToast } from "@/hooks/useToast.jsx";
import MessageBubble from "../MessageBubble/MessageBubble.jsx";
import MessageInput from "../MessageInput/MessageInput.jsx";
import { formatDateDivider, isSameDayGroup, formatLastSeen } from "../../utils/formatTime.js";
import "./ActiveConversationPanel.css";

// Auto-scroll only kicks in when the user is already within this many
// pixels of the bottom — otherwise a new message while reading history
// would yank the view down instead of just showing the "new messages"
// button (see NEAR_BOTTOM_THRESHOLD_PX's use in handleThreadScroll below).
const NEAR_BOTTOM_THRESHOLD_PX = 120;

/*
 ? ActiveConversationPanel Component

 * The right-hand panel of the chat page: the open conversation's header
 * (avatar, name, online/typing status, video/info actions — the latter now
 * a real dropdown with "Delete conversation"), the scrollable message
 * thread grouped under date dividers, and the message composer.

 * Video calling is still a structural placeholder — clicking it surfaces a
 * small "Coming soon" note instead of starting a real call.

 * Scroll behavior: opening a conversation (or switching to a different
 * one) always lands scrolled to the newest message. After that, a new
 * message only auto-scrolls the view if the reader was already within
 * NEAR_BOTTOM_THRESHOLD_PX of the bottom — otherwise scrolling up to read
 * history is never interrupted by incoming messages, and a small "↓ new
 * messages" button appears instead (see showJumpToLatest below), which
 * both jumps to the bottom and dismisses itself, same as scrolling back
 * down manually. The container itself (.active-conversation-thread) is a
 * bounded flex child with min-height: 0 + overflow-y: auto (see its own
 * CSS) — that's what makes it a real scrollable region instead of growing
 * to fit its content.
 *
 * "Lands on the newest message" used to be unreliable for two compounding
 * reasons:
 *   1. scrollTop = scrollHeight was computed the instant messages
 *      rendered — before an <img> attachment had actually decoded and
 *      taken its real height, so the "bottom" scrolled to was a moment
 *      stale, landing short of the true newest message once the image
 *      grew the thread underneath the viewport.
 *   2. ChatPage's messages subscription doesn't clear `messages` when
 *      chatId changes, so for one render after switching chats, THIS
 *      component is still showing the outgoing chat's messages against the
 *      incoming chat's id. The old version re-derived "near bottom" from
 *      scrollTop on every messages.length change (including that one) —
 *      measuring old content against a scrollTop that was about to belong
 *      to entirely different content — which could easily read as "not
 *      near bottom" and silently unpin, popping the "New messages" button
 *      right on open.
 *
 * Fixed with stickToBottomRef: chat changed -> force pinned + scrolled,
 * unconditionally, regardless of whatever content happens to be rendered
 * at that exact moment. A new message arriving in the SAME chat only ever
 * checks the ref, never re-derives "near bottom" from scrollTop — that
 * derivation happens in exactly one place, handleThreadScroll, driven by a
 * genuine user scroll gesture. A ResizeObserver on .thread-content (the
 * actual message stack, not the scroll container itself, which never
 * resizes) re-scrolls to the new bottom on every height change (image
 * decode, file card layout, anything) for as long as the pin holds, backed
 * up by each attachment <img>'s own onLoad/onError (see MessageBubble's
 * onAttachmentLoad). The pin only releases when the reader genuinely
 * scrolls away from the bottom themselves.

 * Props:
   - conversation (object | null): the open conversation, or null if none is selected
   - messages (array, required): messages for the open conversation, oldest first
   - onSend (function, required): forwarded to MessageInput
   - onSendAttachment (function, required): forwarded to MessageInput — see
     its own doc comment for the (file, caption) => Promise signature
   - onDeleteMessage ((messageId: string) => Promise, required): forwarded
     to each MessageBubble as onDelete
   - onDeleteConversation (() => Promise, required): called after the
     "Delete conversation" confirm; this component shows the confirm modal
     and toasts a failure, the caller (ChatPage) owns navigating away on success
   - onTyping ((isTyping: boolean) => void, required): forwarded to MessageInput
   - onBack (function, optional): shown as a back button in the header, mobile-only
   - isHidden (boolean, optional): hides the whole panel on mobile (see ChatPage)
   - currentUserId (string, required): the signed-in user's uid — used to
     tell which messages are "own" (right-aligned) vs. the other participant's
   - emptyMessage (string, optional): overrides the default "Select a
     conversation..." text when conversation is null — ChatPage uses this to
     distinguish "no chat open" from "chatId in the URL is still loading" or
     "chatId in the URL doesn't resolve to one of this user's conversations"
*/

function groupMessagesByDay(messages) {
    const groups = [];
    for (const message of messages) {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && isSameDayGroup(lastGroup.dateKey, message.createdAt)) {
            lastGroup.messages.push(message);
        } else {
            groups.push({ dateKey: message.createdAt, messages: [message] });
        }
    }
    return groups;
}

function ActiveConversationPanel({
    conversation,
    messages,
    onSend,
    onSendAttachment,
    onDeleteMessage,
    onDeleteConversation,
    onTyping,
    onBack,
    isHidden = false,
    currentUserId,
    emptyMessage = "Select a conversation to start chatting.",
}) {
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [showJumpToLatest, setShowJumpToLatest] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingConversation, setIsDeletingConversation] = useState(false);
    // The actual overflow-y: auto scrollable element (.active-conversation-thread).
    const threadRef = useRef(null);
    // The inner content wrapper (.thread-content) — the thing that actually
    // GROWS as messages/attachments render, unlike threadRef's own box,
    // which never resizes (that's the point of overflow-y: auto). This is
    // what the ResizeObserver below watches.
    const threadContentRef = useRef(null);
    // Starts genuinely empty (not conversation?.id) so the very first
    // render — even when a conversation is already open on mount, e.g.
    // navigating straight to a /chat/:chatId URL — is correctly treated as
    // a "conversation changed" transition below, landing at the bottom
    // instead of wherever the freshly-rendered thread happens to start
    // scrolled to.
    const previousConversationIdRef = useRef(undefined);
    // Whether the view should keep following the bottom as content grows.
    // Ref, not state, since it's read/written from a scroll handler, a
    // ResizeObserver callback, and an <img> load event — none of which
    // should cause their own re-render.
    const stickToBottomRef = useRef(true);
    const { showToast, ToastContainer } = useToast();

    const scrollToBottom = () => {
        const el = threadRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    };

    // useLayoutEffect (not useEffect) so this runs before the browser paints —
    // otherwise the top of the conversation could flash on screen for a frame
    // before jumping to the bottom.
    //
    // Deliberately does NOT re-derive "near bottom" from scrollTop when a
    // new message arrives (only handleThreadScroll, driven by a genuine
    // user scroll event, does that) — it just trusts stickToBottomRef.
    // This matters more than it looks: ChatPage's messages subscription
    // doesn't clear `messages` when chatId changes, so for one render after
    // switching chats, this component is still showing the OUTGOING chat's
    // messages against the INCOMING chat's id. Re-deriving "near bottom"
    // from scrollTop on THAT render (measuring old content against a
    // scrollTop that's about to belong to completely different content)
    // was exactly what made this unreliable before — a stale scrollTop
    // could easily read as "not near bottom" the instant the real messages
    // swapped in, silently unpinning and popping the "New messages" button
    // on open. Trusting the ref instead means: chat changed -> force
    // pinned+scrolled; still pinned once the real messages replace the
    // stale ones -> scroll again, now against the correct content. Only an
    // actual user scroll gesture can turn the pin off.
    useLayoutEffect(() => {
        const conversationChanged = previousConversationIdRef.current !== conversation?.id;
        previousConversationIdRef.current = conversation?.id;

        if (conversationChanged) {
            stickToBottomRef.current = true;
            scrollToBottom();
            setShowJumpToLatest(false);
            return;
        }

        if (stickToBottomRef.current) {
            scrollToBottom();
            setShowJumpToLatest(false);
        } else {
            setShowJumpToLatest(true);
        }
    }, [conversation?.id, messages.length]);

    // Keeps the view pinned to the true bottom as attachments finish laying
    // out — an <img> has no real height until it decodes, which grows
    // .thread-content a moment after the message first renders. This is
    // the key fix: without it, the layout effect above scrolls to
    // "scrollHeight" the instant messages render, before any image has
    // actually taken its real height, landing short of the true bottom.
    // Only re-scrolls while stickToBottomRef is true, so this never yanks a
    // reader who's deliberately scrolled up to look at older, still-loading
    // images further up the thread. Re-attached whenever the open chat
    // changes, or whenever .thread-content itself starts existing (it isn't
    // rendered at all while the chat has zero messages — see the "messages
    // === 0" JSX branch below — so a brand-new, still-empty chat needs the
    // observer re-attached once its first message actually mounts the node).
    const hasNoMessages = messages.length === 0;
    useEffect(() => {
        const contentEl = threadContentRef.current;
        if (!contentEl || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(() => {
            if (stickToBottomRef.current) {
                scrollToBottom();
            }
        });
        observer.observe(contentEl);

        return () => observer.disconnect();
    }, [conversation?.id, hasNoMessages]);

    // The one place "near bottom" gets computed from actual scroll
    // position — a genuine user scroll gesture, and nothing else.
    const handleThreadScroll = () => {
        const el = threadRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;
        stickToBottomRef.current = nearBottom;
        if (nearBottom) {
            setShowJumpToLatest(false);
        }
    };

    // Belt-and-suspenders alongside the ResizeObserver — fires directly off
    // an attachment <img>'s load/error event (see MessageBubble's
    // onAttachmentLoad prop), so re-pinning doesn't depend on
    // ResizeObserver support/timing at all for the most common case.
    const handleAttachmentLoad = () => {
        if (stickToBottomRef.current) {
            scrollToBottom();
        }
    };

    const handleJumpToLatest = () => {
        scrollToBottom();
        stickToBottomRef.current = true;
        setShowJumpToLatest(false);
    };

    const handleConfirmDeleteConversation = async () => {
        setIsDeletingConversation(true);
        try {
            await onDeleteConversation();
            // On success ChatPage navigates away immediately, unmounting
            // this component — no need to close the modal/reset state here.
        } catch (error) {
            showToast(error.message || "Failed to delete conversation.", "error");
            setIsDeletingConversation(false);
        }
    };

    useEffect(() => {
        if (!showComingSoon) return;
        const timer = setTimeout(() => setShowComingSoon(false), 2000);
        return () => clearTimeout(timer);
    }, [showComingSoon]);

    if (!conversation) {
        return (
            <section
                className={`active-conversation-panel active-conversation-empty${isHidden ? " active-conversation-panel-hidden-mobile" : ""}`}
            >
                <p>{emptyMessage}</p>
            </section>
        );
    }

    const { participant } = conversation;
    const groups = groupMessagesByDay(messages);

    return (
        <section
            className={`active-conversation-panel${isHidden ? " active-conversation-panel-hidden-mobile" : ""}`}
            aria-label={`Conversation with ${participant.name}`}
        >
            <header className="active-conversation-header">
                <div className="active-conversation-identity">
                    <button
                        type="button"
                        className="active-conversation-back-button"
                        title="Back to conversations"
                        onClick={onBack}
                    >
                        <ArrowLeftIcon />
                    </button>
                    <Avatar src={participant.avatarUrl} alt={participant.name} online={participant.online} />
                    <div>
                        <p className="active-conversation-name">{participant.name}</p>
                        <p className={`active-conversation-status${participant.online ? " is-online" : ""}`}>
                            {conversation.isTyping
                                ? "typing…"
                                : participant.online
                                  ? "Online"
                                  : (formatLastSeen(participant.lastSeen) ?? "Offline")}
                        </p>
                    </div>
                </div>

                <div className="active-conversation-actions">
                    <div className="video-action-wrapper">
                        <button
                            type="button"
                            className="active-conversation-action-button active-conversation-action-video"
                            title="Start a video call — coming soon"
                            onClick={() => setShowComingSoon(true)}
                        >
                            <VideoIcon />
                        </button>
                        {showComingSoon && <span className="coming-soon-note">Coming soon</span>}
                    </div>
                    <div className="conversation-menu-wrapper">
                        <button
                            type="button"
                            className="active-conversation-action-button"
                            title="Conversation info"
                            onClick={() => setShowMenu((open) => !open)}
                        >
                            <InfoIcon />
                        </button>
                        {showMenu && (
                            <>
                                {/* Full-screen click-catcher to close the menu on an
                                    outside click — simpler than a document-level
                                    listener, and matches this file's existing
                                    absolute-popover pattern (see coming-soon-note). */}
                                <div className="conversation-menu-backdrop" onClick={() => setShowMenu(false)} />
                                <div className="conversation-menu">
                                    <button
                                        type="button"
                                        className="conversation-menu-item conversation-menu-item-danger"
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                    >
                                        Delete conversation
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="active-conversation-thread" ref={threadRef} onScroll={handleThreadScroll}>
                {messages.length === 0 ? (
                    <div className="active-conversation-thread-empty">
                        <p>No messages yet — say hi!</p>
                    </div>
                ) : (
                    <div className="thread-content" ref={threadContentRef}>
                        {groups.map((group) => (
                            <div className="message-day-group" key={group.dateKey}>
                                <div className="date-divider">
                                    <span>{formatDateDivider(group.dateKey)}</span>
                                </div>
                                {group.messages.map((message) => (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        isOwn={message.senderId === currentUserId}
                                        senderAvatarUrl={participant.avatarUrl}
                                        senderName={participant.name}
                                        onDelete={onDeleteMessage}
                                        onAttachmentLoad={handleAttachmentLoad}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showJumpToLatest && (
                <button type="button" className="jump-to-latest-button" onClick={handleJumpToLatest}>
                    ↓ New messages
                </button>
            )}

            <MessageInput onSend={onSend} onSendAttachment={onSendAttachment} onTyping={onTyping} />

            {showDeleteConfirm && (
                <Modal isOpen onClose={() => setShowDeleteConfirm(false)} className="delete-confirm-modal-content">
                    <p className="delete-confirm-title">Delete this conversation?</p>
                    <p className="delete-confirm-body">
                        This permanently removes the conversation and all its messages for both you and{" "}
                        {participant.name} — it can't be undone.
                    </p>
                    <div className="delete-confirm-actions">
                        <button
                            type="button"
                            className="delete-confirm-cancel"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeletingConversation}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="delete-confirm-delete"
                            onClick={handleConfirmDeleteConversation}
                            disabled={isDeletingConversation}
                        >
                            {isDeletingConversation ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </Modal>
            )}

            <ToastContainer />
        </section>
    );
}

export default ActiveConversationPanel;

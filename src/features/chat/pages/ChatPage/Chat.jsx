import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell/AppShell.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { ROUTES } from "@/routes/paths.js";
import ConversationList from "../../components/ConversationList/ConversationList.jsx";
import ActiveConversationPanel from "../../components/ActiveConversationPanel/ActiveConversationPanel.jsx";
import {
    subscribeToUserChats,
    createOrGetChat,
    deleteConversation,
    markChatRead,
    setTyping,
} from "../../services/chatService.js";
import {
    subscribeToMessages,
    sendMessage,
    sendAttachmentMessage,
    deleteMessage,
    markMessagesSeen,
    markMessagesDelivered,
} from "../../services/messageService.js";
import { subscribeToUser, findUserByEmail } from "../../services/userService.js";
import { isUserOnline } from "../../utils/presence.js";
import { isTypingRecent } from "../../utils/typing.js";
import { toIsoString } from "../../utils/formatTime.js";

/*
 ? Chat Page

 * Assembles the chat feature: the icon rail (via AppShell), the
 * conversation list, and the active conversation panel — all backed by
 * Firestore via chatService/messageService/userService.

 * The open conversation lives in the URL, not local state — the route is
 * "/chat/:chatId?" (an optional param; see App.jsx), so `chatId` from
 * useParams() is the single source of truth. Selecting a conversation
 * navigates to ROUTES.chatThread(id) rather than calling a setter; the
 * mobile list/thread view is derived from whether chatId is present at
 * all, not tracked separately. This is what makes chat deep-linkable,
 * refresh-safe, and correct with the browser's back/forward buttons for
 * free — no extra code needed for any of that.

 * Two realtime subscriptions, plus a third kind fanned out per participant:
   - subscribeToUserChats(currentUserId, ...) — the whole conversation list,
     re-subscribed only if currentUserId itself changes (i.e. never, in
     practice, since ProtectedRoute guarantees a signed-in user by the time
     this renders).
   - subscribeToMessages(chatId, ...) — just the open conversation's
     messages, re-subscribed every time chatId changes, with the previous
     one torn down first.
   - subscribeToUser(otherUid, ...) — one per distinct "other participant"
     across every conversation in the list (including whichever one is
     currently open), kept in sync with the chat list by the profile-sync
     effect below. This is what makes name/photo/online status update live
     with no refresh, instead of the one-off getUser() snapshot this used to
     be. A small app, so subscribing per row is fine; if this ever needs to
     scale down, the header's subscription (via the open chat's participant)
     is the one to keep and the list rows are the one to cut.

 * conversationsLoaded distinguishes "haven't heard from Firestore yet" from
 * "heard from Firestore, and this chatId genuinely isn't in the result" —
 * see the empty-state message logic below for why that distinction matters
 * (avoids flashing "not found" while the real answer is still in flight).
 * It's set as soon as the raw chats snapshot arrives — hydration into
 * `conversations` is now synchronous (profiles come from state, not an
 * async fetch), so there's no separate "hydrating" phase to wait on anymore.

 * Online status is DERIVED, not read straight off the profile doc — see
 * isUserOnline in utils/presence.js for why (an abrupt tab close never gets
 * to write online:false). Since that derivation depends on Date.now(), a
 * profile that stops getting new snapshots (the other user's heartbeat
 * effectively stalled) would otherwise show "online" forever once stale —
 * the tick state below just forces a re-render periodically so staleness
 * gets picked up even without a new snapshot triggering one.

 * Delivery/read receipts: markMessagesDelivered runs opportunistically off
 * the conversation-list subscription (being subscribed at all means this
 * client is online), and markMessagesSeen runs off the open chat's messages
 * plus window focus/visibility — see each effect below and
 * messageService.js for the exact semantics. Known gap: ConversationList's
 * per-row tick (see buildConversation below) always shows "sent" for now,
 * since the parent chats/{chatId} doc doesn't track the last message's
 * live status — only the open thread's ticks (MessageBubble) are accurate.
 * Wiring the list to be accurate too would mean also writing a
 * lastMessageStatus-style field, which wasn't part of this pass.

 * Unread counts and typing both ride the same chats/{chatId} doc that's
 * already streamed by subscribeToUserChats above — no separate
 * subscription needed for either. unreadCounts.{uid} is incremented by
 * messageService.sendMessage/sendAttachmentMessage and zeroed by
 * chatService.markChatRead (called from the same markMessagesSeen effect
 * below, since "I've read this" and "I've seen these messages" are the
 * same moment). typing.{uid} is a raw timestamp written by
 * chatService.setTyping and DERIVED into a boolean via isTypingRecent
 * (utils/typing.js) — same staleness-derivation reasoning as presence.
 * buildConversation forces unreadCount to 0 for whichever chat is
 * currently open, since the badge shouldn't show for a conversation the
 * user is already looking at (the real Firestore value only catches up a
 * moment later, once markChatRead's write round-trips back down).
*/

// Turns one raw chats/{chatId} doc (participants, lastMessage,
// lastMessageSenderId, updatedAt, unreadCounts, typing) plus the live
// participantProfiles map into the shape ConversationList /
// ConversationListItem / ActiveConversationPanel actually render.
// Synchronous — profiles come from state kept fresh by the profile-sync
// effect below, not fetched here.
function buildConversation(chat, currentUserId, participantProfiles, activeChatId) {
    const otherUid = chat.participants?.find((id) => id !== currentUserId);
    if (!otherUid) return null;

    const participantProfile = participantProfiles[otherUid] ?? null;
    const isActiveChat = chat.id === activeChatId;

    return {
        id: chat.id,
        participant: {
            id: otherUid,
            name: participantProfile?.name || participantProfile?.email || "Unknown",
            avatarUrl: participantProfile?.photoURL ?? null,
            online: isUserOnline(participantProfile),
            lastSeen: participantProfile?.lastSeen ?? null,
        },
        // lastMessage is a plain string on the Firestore doc; lastMessageSenderId
        // (written alongside it by messageService.sendMessage) is what lets
        // ConversationListItem decide whether to show a status tick at all.
        // status is hardcoded "sent" — that's the only value ever written
        // right now (see messageService.js).
        lastMessage: chat.lastMessage
            ? { senderId: chat.lastMessageSenderId ?? null, text: chat.lastMessage, status: "sent" }
            : null,
        isTyping: isTypingRecent(chat.typing?.[otherUid]),
        // Forced to 0 while this chat is the open one — see the file
        // header comment above for why.
        unreadCount: isActiveChat ? 0 : (chat.unreadCounts?.[currentUserId] ?? 0),
        updatedAt: toIsoString(chat.updatedAt),
    };
}

function Chat() {
    const { user } = useAuth();
    const currentUserId = user.uid;
    const { chatId } = useParams();
    const navigate = useNavigate();

    const [chats, setChats] = useState([]);
    const [conversationsLoaded, setConversationsLoaded] = useState(false);
    const [messages, setMessages] = useState([]);
    const [participantProfiles, setParticipantProfiles] = useState({});
    const [, setTick] = useState(0);

    const profileSubscriptionsRef = useRef(new Map());

    // Conversation list — one subscription for as long as this page is up.
    useEffect(() => {
        const unsubscribe = subscribeToUserChats(currentUserId, (nextChats) => {
            // Best-effort, fire-and-forget: this callback firing means this
            // client is online and knows about these chats, which is exactly
            // "delivered". Runs on every snapshot, not just the first — cheap
            // after the first pass since the query it's built on (status ==
            // 'sent') naturally comes back empty once nothing's left to flip,
            // and it doesn't touch the parent chat doc, so it can't retrigger
            // this same subscription itself.
            nextChats.forEach((chat) => {
                markMessagesDelivered(chat.id, currentUserId).catch((error) => {
                    console.error("Failed to mark messages delivered:", error);
                });
            });

            setChats(nextChats);
            setConversationsLoaded(true);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // Keeps one subscribeToUser listener per distinct "other participant"
    // across the current chat list — added when a new chat introduces a
    // participant not already subscribed to, torn down when a chat (and no
    // other chat) needs that participant anymore. This is the live-presence
    // fix: participantProfiles stays fresh via onSnapshot instead of a
    // one-off read, so name/photo/online/lastSeen update with no refresh.
    useEffect(() => {
        const neededUids = new Set(
            chats.map((chat) => chat.participants?.find((id) => id !== currentUserId)).filter(Boolean)
        );
        const subscriptions = profileSubscriptionsRef.current;

        neededUids.forEach((uid) => {
            if (subscriptions.has(uid)) return;
            const unsubscribe = subscribeToUser(uid, (profile) => {
                setParticipantProfiles((prev) => ({ ...prev, [uid]: profile }));
            });
            subscriptions.set(uid, unsubscribe);
        });

        subscriptions.forEach((unsubscribe, uid) => {
            if (neededUids.has(uid)) return;
            unsubscribe();
            subscriptions.delete(uid);
            setParticipantProfiles((prev) => {
                if (!(uid in prev)) return prev;
                const next = { ...prev };
                delete next[uid];
                return next;
            });
        });
    }, [chats, currentUserId]);

    // Tears down every remaining per-participant subscription when the page
    // itself unmounts (the effect above only cleans up ones that fall out of
    // the chat list while the page stays up).
    useEffect(() => {
        const subscriptions = profileSubscriptionsRef.current;
        return () => {
            subscriptions.forEach((unsubscribe) => unsubscribe());
            subscriptions.clear();
        };
    }, []);

    // Forces a periodic re-render so two DERIVED-from-a-timestamp values
    // flip back to their "stale" state even without a new snapshot
    // triggering one: a participant's online status (isUserOnline, 75s
    // threshold) and the typing indicator (isTypingRecent, 5s threshold —
    // the tighter of the two, so this ticks every 3s rather than the 25s
    // a presence-only tick would need, to keep "typing…" disappearing
    // promptly once it goes stale).
    useEffect(() => {
        const intervalId = setInterval(() => setTick((t) => t + 1), 3000);
        return () => clearInterval(intervalId);
    }, []);

    const conversations = chats
        .map((chat) => buildConversation(chat, currentUserId, participantProfiles, chatId))
        .filter(Boolean);

    // Active conversation's messages — re-subscribed whenever the URL's
    // chatId changes; torn down on switch or unmount. Deliberately doesn't
    // wait on conversationsLoaded/participant-membership first — a chat
    // just created via handleStartChat is valid (createOrGetChat already
    // confirmed the current user is a participant) even before the list
    // subscription above has caught up to include it, and messages should
    // load immediately in that case rather than waiting on it.
    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }

        const unsubscribe = subscribeToMessages(chatId, (rawMessages) => {
            setMessages(rawMessages.map((message) => ({ ...message, createdAt: toIsoString(message.createdAt) })));
        });

        return () => unsubscribe();
    }, [chatId]);

    // Mark messages seen: whenever this chat's messages update while the
    // window is visible/focused, and again if the window regains focus or
    // the tab becomes visible without the messages themselves changing (the
    // common case: the other person sent something while this tab was
    // backgrounded, and the recipient just switched back to it). Reads
    // document.visibilityState fresh on every call rather than caching it,
    // so it's correct however it gets triggered. markMessagesSeen no-ops
    // when there's nothing left to flip, which is what stops this from
    // looping against its own writes (see messageService.js).
    //
    // markChatRead rides along here on purpose — "I've read this chat"
    // (unreadCounts) and "I've seen these messages" (per-message status)
    // are the same real-world moment, so there's no reason to track them
    // with two separate effects.
    useEffect(() => {
        if (!chatId) return;

        const checkSeen = () => {
            if (document.visibilityState === "visible") {
                markMessagesSeen(chatId, currentUserId, messages).catch((error) => {
                    console.error("Failed to mark messages seen:", error);
                });
                markChatRead(chatId, currentUserId).catch((error) => {
                    console.error("Failed to mark chat read:", error);
                });
            }
        };

        checkSeen();

        window.addEventListener("focus", checkSeen);
        document.addEventListener("visibilitychange", checkSeen);

        return () => {
            window.removeEventListener("focus", checkSeen);
            document.removeEventListener("visibilitychange", checkSeen);
        };
    }, [chatId, messages, currentUserId]);

    const activeConversation = chatId ? conversations.find((c) => c.id === chatId) ?? null : null;

    // Only meaningful once conversationsLoaded is true — subscribeToUserChats
    // is itself scoped (via its Firestore query) to chats currentUserId is a
    // participant in, so "loaded, and still not in the list" conclusively
    // means this chatId isn't theirs or doesn't exist, no separate
    // membership check needed.
    let emptyMessage;
    if (chatId && !conversationsLoaded) {
        emptyMessage = "Loading conversation...";
    } else if (chatId && conversationsLoaded && !activeConversation) {
        emptyMessage = "Conversation not found.";
    }

    const mobileView = chatId ? "conversation" : "list";

    const handleSelectConversation = (id) => {
        navigate(ROUTES.chatThread(id));
    };

    const handleBack = () => navigate(ROUTES.chat);

    const handleSend = async (text) => {
        if (!chatId || !activeConversation) return;
        try {
            await sendMessage(chatId, currentUserId, text, activeConversation.participant.id);
        } catch (error) {
            // MessageInput clears its input optimistically regardless — a
            // failed send just means the message never shows up via the
            // realtime listener. Logged rather than silently swallowed;
            // a toast here is a reasonable follow-up if this turns out to
            // matter in practice.
            console.error("Failed to send message:", error);
        }
    };

    // Attachment send — unlike handleSend above, errors are deliberately
    // NOT swallowed here: MessageInput awaits this directly so it can keep
    // the picked file (instead of clearing it) and show a toast on
    // failure, since re-picking + re-uploading a file is a worse retry
    // experience than a failed text send just silently not appearing.
    const handleSendAttachment = (file, caption) => {
        if (!chatId || !activeConversation) return Promise.resolve();
        return sendAttachmentMessage(chatId, currentUserId, file, caption, activeConversation.participant.id);
    };

    // Same "let errors propagate" reasoning as handleSendAttachment above —
    // MessageBubble awaits this directly and toasts a failure itself.
    const handleDeleteMessage = (messageId) => {
        if (!chatId) return Promise.resolve();
        return deleteMessage(chatId, messageId);
    };

    // ActiveConversationPanel awaits this directly and toasts a failure
    // itself (same "let errors propagate" pattern as above); navigating
    // back to the empty /chat state only happens here, after a successful
    // delete — if deleteConversation throws, the await below never
    // resolves and navigate is never called, leaving the user right where
    // they were (with the panel's own toast telling them what went wrong).
    const handleDeleteConversation = async () => {
        if (!chatId) return;
        await deleteConversation(chatId);
        navigate(ROUTES.chat);
    };

    // Wrapped in useCallback, keyed on [chatId, currentUserId], so the
    // reference MessageInput receives only changes when the open chat
    // actually changes — MessageInput's own typing-cleanup effect depends
    // on that stability (see its doc comment) to correctly fire a "stopped
    // typing" write for the OLD chat when switching to a new one, without
    // also firing spuriously on every one of Chat.jsx's own frequent
    // re-renders (this page re-renders often, off the various Firestore
    // subscriptions above).
    const handleTyping = useCallback(
        (isTyping) => {
            if (!chatId) return;
            setTyping(chatId, currentUserId, isTyping).catch((error) => {
                console.error("Failed to update typing status:", error);
            });
        },
        [chatId, currentUserId]
    );

    // "Start a new conversation" — the search box in ConversationList calls
    // this on submit. Throws friendly Error messages that ConversationList
    // catches and toasts; resolves (no return value) on success, after
    // navigating to the resulting chat.
    const handleStartChat = async (email) => {
        if (user.email && email.toLowerCase() === user.email.toLowerCase()) {
            throw new Error("You can't start a chat with yourself.");
        }

        const foundUser = await findUserByEmail(email);
        if (!foundUser) {
            throw new Error("No user with that email");
        }

        const otherUid = foundUser.uid ?? foundUser.id;
        const chat = await createOrGetChat(currentUserId, otherUid);

        navigate(ROUTES.chatThread(chat.id));
    };

    return (
        <AppShell>
            <ConversationList
                conversations={conversations}
                activeConversationId={chatId ?? null}
                onSelect={handleSelectConversation}
                isHidden={mobileView === "conversation"}
                currentUserId={currentUserId}
                onStartChat={handleStartChat}
            />
            <ActiveConversationPanel
                conversation={activeConversation}
                messages={messages}
                onSend={handleSend}
                onSendAttachment={handleSendAttachment}
                onDeleteMessage={handleDeleteMessage}
                onDeleteConversation={handleDeleteConversation}
                onTyping={handleTyping}
                onBack={handleBack}
                isHidden={mobileView === "list"}
                currentUserId={currentUserId}
                emptyMessage={emptyMessage}
            />
        </AppShell>
    );
}

export default Chat;

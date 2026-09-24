import { useState } from "react";
import Avatar from "@/components/ui/Avatar/Avatar.jsx";
import Modal from "@/components/ui/Modal/Modal.jsx";
import { CheckIcon, DoubleCheckIcon, FileIcon, TrashIcon } from "@/components/ui/icons/index.jsx";
import { useToast } from "@/hooks/useToast.jsx";
import LinkPreviewCard from "../LinkPreviewCard/LinkPreviewCard.jsx";
import { formatMessageTime } from "../../utils/formatTime.js";
import { formatFileSize } from "../../utils/formatFileSize.js";
import "./MessageBubble.css";

/*
 ? MessageBubble Component

 * Renders one message in the active conversation thread. Supports these
 * message shapes:
   - "text" bubbles, with a bare URL inside the text auto-linkified
   - "link" bubbles, a rich shared-link card (image/title/subtitle)
   - attachment messages (message.attachment set — see
     messageService.sendAttachmentMessage): a clickable image thumbnail or
     file card that opens a full preview in a Modal (see AttachmentPreview
     below), with the message's `text` shown underneath as an optional
     caption
   - deleted messages (message.deleted === true — see
     messageService.deleteMessage): an italic muted "This message was
     deleted" placeholder instead of any of the above; no attachment, no
     delete button (it's already gone)

 * Received messages are left-aligned with the sender's avatar; sent
 * messages are right-aligned with a delivery/read tick + timestamp instead,
 * plus (only for the current user's own, non-deleted messages) a delete
 * button — revealed on hover on desktop, always visible on mobile (see
 * MessageBubble.css's media query), confirmed via a small Modal before
 * actually calling onDelete.

 * Props:
   - message (object, required): one hydrated message from ChatPage
     (createdAt as an ISO string; attachment, if present, is
     { url, name, type, size } — see messageService.js's doc shape)
   - isOwn (boolean, required): true when the current user sent it
   - senderAvatarUrl (string, optional): shown next to received messages only
   - senderName (string, optional): drives the avatar's initials/color fallback
   - onDelete ((messageId: string) => Promise, required): called after the
     user confirms deletion — the delete button/confirm flow only ever
     renders for own, non-deleted messages, so this is only actually
     invoked in that case
   - onAttachmentLoad (function, optional): forwarded to the attachment
     image's onLoad/onError (see AttachmentThumbnail) — lets
     ActiveConversationPanel re-check its scroll-to-bottom pin the instant
     an image attachment finishes decoding, not just via its ResizeObserver
*/

// attachment.url is a base64 data URL (see messageService.
// sendAttachmentMessage) — not a Firebase Storage URL, so there's no CORS
// concern here at all; a plain <img src> / <a href download> is really all
// this needs. download={attachment.name} works reliably for data URLs
// (unlike a cross-origin Storage URL, where the browser mostly ignores
// that attribute) — this is the standard no-server-involved way to trigger
// a named file download client-side.
function AttachmentThumbnail({ attachment, onOpenPreview, onLoad }) {
    if (attachment.type?.startsWith("image/")) {
        return (
            <button
                type="button"
                className="message-attachment-image-button"
                onClick={onOpenPreview}
                title="View image"
            >
                {/* onLoad/onError: belt-and-suspenders alongside
                    ActiveConversationPanel's ResizeObserver — an <img> has
                    no real height until it decodes, which grows the thread
                    a moment after this message first renders. The
                    ResizeObserver already catches that height change on its
                    own, but firing the same re-pin check directly off the
                    image's own load/error event means there's no dependency
                    on ResizeObserver support/timing at all for this specific,
                    most-common case. */}
                <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="message-attachment-image"
                    onLoad={onLoad}
                    onError={onLoad}
                />
            </button>
        );
    }

    return (
        <button type="button" className="message-attachment-file" onClick={onOpenPreview}>
            <FileIcon className="message-attachment-file-icon" />
            <span className="message-attachment-file-body">
                <span className="message-attachment-file-name">{attachment.name}</span>
                <span className="message-attachment-file-size">{formatFileSize(attachment.size)}</span>
            </span>
        </button>
    );
}

// The popup a thumbnail/file-card click opens. Images show full-size;
// PDFs embed inline via an <iframe> (still reading straight off the same
// base64 data URL — no separate fetch); anything else falls back to a
// file-icon/name/size summary. A Download action is always present for
// non-image files, per the task that added this — images are just shown
// big, no separate download button (click-to-view is the whole point).
function AttachmentPreviewModal({ attachment, onClose }) {
    const isImage = attachment.type?.startsWith("image/");
    const isPdf = attachment.type === "application/pdf";

    if (isImage) {
        return (
            <Modal isOpen onClose={onClose} className="attachment-preview-modal-content attachment-preview-modal-image">
                <img src={attachment.url} alt={attachment.name} className="attachment-preview-image" />
            </Modal>
        );
    }

    return (
        <Modal isOpen onClose={onClose} className="attachment-preview-modal-content">
            <div className="attachment-preview-file">
                {isPdf ? (
                    <iframe src={attachment.url} title={attachment.name} className="attachment-preview-pdf" />
                ) : (
                    <FileIcon className="attachment-preview-file-icon" />
                )}
                <p className="attachment-preview-file-name">{attachment.name}</p>
                <p className="attachment-preview-file-size">{formatFileSize(attachment.size)}</p>
                <a href={attachment.url} download={attachment.name} className="attachment-preview-download-button">
                    Download
                </a>
            </div>
        </Modal>
    );
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }) {
    // Splitting on a capturing regex keeps the URLs themselves in the
    // resulting array, interleaved with the surrounding plain-text parts.
    const parts = text.split(URL_PATTERN);
    return parts.map((part, index) =>
        part.match(URL_PATTERN) ? (
            <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">
                {part}
            </a>
        ) : (
            <span key={`${part}-${index}`}>{part}</span>
        )
    );
}

function StatusTick({ status }) {
    if (status === "sent") return <CheckIcon className="bubble-tick bubble-tick-sent" />;
    if (status === "delivered") return <DoubleCheckIcon className="bubble-tick bubble-tick-delivered" />;
    if (status === "seen") return <DoubleCheckIcon className="bubble-tick bubble-tick-seen" />;
    return null;
}

function MessageBubble({ message, isOwn, senderAvatarUrl, senderName, onDelete, onAttachmentLoad }) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showToast, ToastContainer } = useToast();

    const isDeleted = message.deleted === true;
    const hasAttachment = !isDeleted && Boolean(message.attachment);
    const hasCaption = hasAttachment && message.text?.trim();

    const bubbleClassName = [
        "message-bubble",
        isDeleted && "message-bubble-deleted",
        !isDeleted && message.kind === "link" && "message-bubble-link",
        hasAttachment && "message-bubble-attachment",
    ]
        .filter(Boolean)
        .join(" ");

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(message.id);
            setIsConfirmingDelete(false);
        } catch (error) {
            showToast(error.message || "Failed to delete message.", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={`message-row${isOwn ? " message-row-own" : ""}`}>
            {!isOwn && <Avatar src={senderAvatarUrl} alt={senderName} size="sm" className="message-avatar" />}

            <div className="message-stack">
                <div className={bubbleClassName}>
                    {isDeleted ? (
                        <span className="message-text message-deleted-text">This message was deleted</span>
                    ) : hasAttachment ? (
                        <>
                            <AttachmentThumbnail
                                attachment={message.attachment}
                                onOpenPreview={() => setIsPreviewOpen(true)}
                                onLoad={onAttachmentLoad}
                            />
                            {hasCaption && (
                                <span className="message-text message-attachment-caption">
                                    <Linkified text={message.text} />
                                </span>
                            )}
                        </>
                    ) : message.kind === "link" ? (
                        <LinkPreviewCard
                            url={message.url}
                            title={message.title}
                            subtitle={message.subtitle}
                            imageUrl={message.imageUrl}
                        />
                    ) : (
                        <span className="message-text">
                            <Linkified text={message.text} />
                        </span>
                    )}
                </div>

                {isOwn && (
                    <div className="message-meta">
                        <span className="message-time">{formatMessageTime(message.createdAt)}</span>
                        <StatusTick status={message.status} />
                    </div>
                )}
            </div>

            {/* DOM order matters: .message-row-own is flex-direction:
                row-reverse, so this needs to come AFTER .message-stack for
                the button to land visually to its LEFT (outside the
                bubble) — before it would put the button on the right,
                past the row's own right edge, off in open space instead of
                snug against the bubble. */}
            {isOwn && !isDeleted && (
                <button
                    type="button"
                    className="message-delete-button"
                    onClick={() => setIsConfirmingDelete(true)}
                    title="Delete message"
                    aria-label="Delete message"
                >
                    <TrashIcon />
                </button>
            )}

            {hasAttachment && isPreviewOpen && (
                <AttachmentPreviewModal attachment={message.attachment} onClose={() => setIsPreviewOpen(false)} />
            )}

            {isConfirmingDelete && (
                <Modal isOpen onClose={() => setIsConfirmingDelete(false)} className="delete-confirm-modal-content">
                    <p className="delete-confirm-title">Delete this message?</p>
                    <p className="delete-confirm-body">This can't be undone.</p>
                    <div className="delete-confirm-actions">
                        <button
                            type="button"
                            className="delete-confirm-cancel"
                            onClick={() => setIsConfirmingDelete(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="delete-confirm-delete"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </Modal>
            )}

            <ToastContainer />
        </div>
    );
}

export default MessageBubble;

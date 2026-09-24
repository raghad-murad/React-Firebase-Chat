import { useEffect, useRef, useState } from "react";
import { PaperclipIcon, FileIcon } from "@/components/ui/icons/index.jsx";
import { useToast } from "@/hooks/useToast.jsx";
import "./MessageInput.css";

// How often a "still typing" write can go out at most — chatService.setTyping
// just refreshes a timestamp, so there's no point writing on every
// keystroke; this keeps it to roughly once every TYPING_THROTTLE_MS while
// the user keeps typing.
const TYPING_THROTTLE_MS = 2500;
// How long to wait after the last keystroke before writing "stopped
// typing" — comfortably under utils/typing.js's own TYPING_STALE_MS (5s)
// staleness window, so the other side normally sees an explicit "stopped"
// rather than waiting for the timestamp to just go stale.
const TYPING_STOP_DELAY_MS = 3000;

// Non-image files are stored as-is (base64, no compression) in the
// message doc — see messageService.sendAttachmentMessage's own
// MAX_NON_IMAGE_RAW_BYTES, which enforces the same ~700KB cap
// authoritatively at send time. This is just an early, pick-time check so
// an obviously-too-big non-image file gets rejected before the user even
// tries to send it, instead of only failing at Send.
//
// Images are NOT checked here — they get downscaled/compressed at send
// time (processAttachmentImage.js) and most normal photos end up well
// under the cap regardless of their original size, so rejecting a large
// original at pick time would be wrong.
const MAX_NON_IMAGE_ATTACHMENT_BYTES = 700 * 1024;

/*
 ? MessageInput Component

 * The composer footer of the active conversation panel: an attach button
 * wired to a hidden file input, the text input (doubling as a caption when
 * a file is picked), and a "Send message" action.

 * Picking a file doesn't send it right away — it shows a pending-attachment
 * chip above the input (an image thumbnail via a local blob: URL, or a
 * filename chip for anything else) with a cancel (×) button. Sending calls
 * onSendAttachment(file, caption) instead of onSend(text) whenever a file
 * is pending; the text box's value becomes that caption (may be empty).
 * Text-only sends (no pending file) still go through onSend, unchanged.

 * onSendAttachment is awaited directly (unlike onSend, which ChatPage
 * fire-and-forgets) so this component can show a "Sending…" disabled
 * state while the file is converted/compressed and written, and on
 * failure (e.g. still too large after compression — see
 * messageService.sendAttachmentMessage) keep the picked file/caption in
 * place instead of clearing them, so the user isn't forced to re-pick.

 * Typing indicator: onTyping(true) fires (throttled to at most once every
 * TYPING_THROTTLE_MS) on every keystroke, and onTyping(false) fires
 * TYPING_STOP_DELAY_MS after the last one, on send, and on blur — plus once
 * more from this component's own unmount/onTyping-identity-change cleanup,
 * which is what correctly clears typing for the chat being LEFT when the
 * caller switches to a different one (see the cleanup effect's own comment).

 * Props:
   - onSend (function, required): called with the trimmed message text
   - onSendAttachment ((file: File, caption: string) => Promise, required):
     called when there's a pending attachment to send
   - onTyping ((isTyping: boolean) => void, required): see above
*/

function MessageInput({ onSend, onSendAttachment, onTyping }) {
    const [value, setValue] = useState("");
    const [pendingFile, setPendingFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const fileInputRef = useRef(null);
    const lastTypingSentAtRef = useRef(0);
    const stopTypingTimeoutRef = useRef(null);
    const { showToast, ToastContainer } = useToast();

    const clearStopTypingTimeout = () => {
        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
            stopTypingTimeoutRef.current = null;
        }
    };

    // Called on every keystroke. Sends the throttled "typing" signal, and
    // (re)schedules the "stopped typing" one for TYPING_STOP_DELAY_MS from
    // now — each new keystroke pushes that timer back out, so it only
    // actually fires once the user has genuinely paused.
    const notifyTyping = () => {
        const now = Date.now();
        if (now - lastTypingSentAtRef.current >= TYPING_THROTTLE_MS) {
            lastTypingSentAtRef.current = now;
            onTyping(true);
        }

        clearStopTypingTimeout();
        stopTypingTimeoutRef.current = setTimeout(() => {
            lastTypingSentAtRef.current = 0;
            onTyping(false);
        }, TYPING_STOP_DELAY_MS);
    };

    const notifyStoppedTyping = () => {
        clearStopTypingTimeout();
        lastTypingSentAtRef.current = 0;
        onTyping(false);
    };

    // Fires a final "stopped typing" whenever onTyping's identity changes
    // (Chat.jsx keys that on [chatId, currentUserId] via useCallback — see
    // its own comment — so this only actually happens when the open chat
    // changes) or when this component unmounts outright.
    useEffect(() => {
        return () => {
            clearStopTypingTimeout();
            onTyping(false);
        };
    }, [onTyping]);

    const clearPendingAttachment = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingFile(null);
        setPreviewUrl(null);
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        // Reset so picking the exact same file again still fires onChange.
        e.target.value = "";
        if (!file) return;

        const isImage = file.type.startsWith("image/");
        if (!isImage && file.size > MAX_NON_IMAGE_ATTACHMENT_BYTES) {
            showToast("File too large — max ~700KB when stored this way.", "error");
            return;
        }

        clearPendingAttachment();
        setPendingFile(file);
        if (isImage) {
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSending) return;

        if (pendingFile) {
            setIsSending(true);
            try {
                await onSendAttachment(pendingFile, value.trim());
                setValue("");
                clearPendingAttachment();
                notifyStoppedTyping();
            } catch (error) {
                showToast(error.message || "Failed to send attachment.", "error");
            } finally {
                setIsSending(false);
            }
            return;
        }

        const trimmed = value.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setValue("");
        notifyStoppedTyping();
    };

    const handleValueChange = (e) => {
        setValue(e.target.value);
        notifyTyping();
    };

    return (
        <div className="message-input-wrapper">
            {pendingFile && (
                <div className="message-pending-attachment">
                    {previewUrl ? (
                        <img src={previewUrl} alt={pendingFile.name} className="message-pending-thumb" />
                    ) : (
                        <FileIcon className="message-pending-file-icon" />
                    )}
                    <span className="message-pending-filename">{pendingFile.name}</span>
                    <button
                        type="button"
                        className="message-pending-cancel"
                        onClick={clearPendingAttachment}
                        title="Remove attachment"
                        disabled={isSending}
                    >
                        ×
                    </button>
                </div>
            )}

            <form className="message-input-row" onSubmit={handleSubmit}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    hidden
                />
                <button
                    type="button"
                    className="message-attach-button"
                    title="Attach a file — images are auto-compressed, other files up to ~700KB"
                    onClick={handleAttachClick}
                    disabled={isSending}
                >
                    <PaperclipIcon />
                </button>

                <input
                    type="text"
                    className="message-input-field"
                    placeholder={pendingFile ? "Add a caption (optional)..." : "Type your message here.."}
                    value={value}
                    onChange={handleValueChange}
                    onBlur={notifyStoppedTyping}
                    disabled={isSending}
                />

                <button type="submit" className="message-send-button" disabled={isSending}>
                    {isSending ? "Sending..." : "Send message"}
                </button>
            </form>

            <ToastContainer />
        </div>
    );
}

export default MessageInput;

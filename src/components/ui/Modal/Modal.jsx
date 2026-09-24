import { useEffect } from "react";
import "./Modal.css";

/*
 ? Modal Component

 * A generic overlay dialog shared by anything that needs a popup — image/
 * file attachment previews (see MessageBubble) today, and any future
 * confirm dialog or lightbox. Closes on: clicking the backdrop, the X
 * button, or Escape. Scroll-locks the body while open (restores whatever
 * overflow value was there before, on close/unmount) so the page behind
 * the modal can't scroll.

 * Deliberately NOT a portal (this app doesn't use ReactDOM.createPortal
 * anywhere) — it renders inline wherever it's mounted and relies on
 * position: fixed to cover the viewport regardless of DOM nesting. That
 * also means it still inherits the .app-shell CSS variables (--accent,
 * --surface, ...) normally through the cascade, which a portal to
 * document.body would NOT get for free.

 * Props:
   - isOpen (boolean, required): whether the modal is shown at all —
     rendering is skipped entirely (returns null) while false
   - onClose (function, required): called on backdrop click, the X button,
     or Escape
   - children (ReactNode, required): the modal's content
   - className (string, optional): extra class on the content box, for a
     caller that needs to size/style its own preview differently
   - labelledBy (string, optional): id of an element inside children that
     labels the dialog, wired to aria-labelledby
*/

function Modal({ isOpen, onClose, children, className = "", labelledBy }) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="modal-close-button" onClick={onClose} title="Close" aria-label="Close">
                    ×
                </button>
                {children}
            </div>
        </div>
    );
}

export default Modal;

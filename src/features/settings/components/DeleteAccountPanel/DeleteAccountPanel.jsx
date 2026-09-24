import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button/Button.jsx";
import { useToast } from "@/hooks/useToast.jsx";
import { deleteAccount } from "@/features/auth/services/authService.js";
import { ROUTES } from "@/routes/paths.js";
import "./DeleteAccountPanel.css";

const CONFIRM_WORD = "DELETE";

/*
 ? DeleteAccountPanel Component

 * The "Delete Account" tab of Settings: a permanent, destructive action
 * gated behind a type-to-confirm input (must type DELETE exactly) rather
 * than a plain confirm dialog, so it can't be triggered by an accidental
 * double-click.

 * On success, authService.deleteAccount() has already signed the user out
 * (deleteUser() does that as a side effect) — this just navigates to
 * sign-in afterwards. On auth/requires-recent-login, authService already
 * turns that into a friendly message; this just toasts it.

 * Props:
   - None
*/

function DeleteAccountPanel() {
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const canDelete = confirmText === CONFIRM_WORD;

    const handleCancel = () => setConfirmText("");

    const handleDelete = async () => {
        if (!canDelete) return;

        setIsDeleting(true);
        try {
            await deleteAccount();
            navigate(ROUTES.signIn, { replace: true });
        } catch (error) {
            showToast(error.message, "error");
            setIsDeleting(false);
        }
    };

    return (
        <div className="delete-account-panel">
            <div className="settings-card delete-account-card">
                <h3 className="settings-card-title delete-account-title">Delete Account</h3>
                <p className="delete-account-warning">
                    This permanently deletes your account and sign-in — this can't be undone.
                </p>
                {/* Known limitation (not built yet): this doesn't remove your
                    chats or messages, only your account and profile — see
                    userService.deleteUserDoc and authService.deleteAccount. */}

                <label className="delete-account-confirm">
                    <span>
                        Type <strong>{CONFIRM_WORD}</strong> to confirm
                    </span>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={CONFIRM_WORD}
                        disabled={isDeleting}
                        autoComplete="off"
                    />
                </label>

                <div className="settings-actions">
                    <Button
                        type="button"
                        className="settings-btn settings-btn-outline"
                        onClick={handleCancel}
                        disabled={isDeleting || !confirmText}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="settings-btn settings-btn-danger"
                        onClick={handleDelete}
                        disabled={!canDelete || isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete my account"}
                    </Button>
                </div>
            </div>

            <ToastContainer />
        </div>
    );
}

export default DeleteAccountPanel;

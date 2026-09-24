import { useEffect, useState } from "react";
import { auth } from "@/firebase/firebase.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useToast } from "@/hooks/useToast.jsx";
import { resendVerificationEmail } from "../../services/authService.js";
import Button from "@/components/ui/Button/Button.jsx";
import "./VerifyEmail.css";

const POLL_INTERVAL_MS = 4000;

/*
 ? VerifyEmail Component

 * Shown by ProtectedRoute in place of the protected content when a
 * signed-in user's email isn't verified yet (see the emailVerified check
 * in src/routes/guards/ProtectedRoute.jsx). Not a route of its own — a
 * gate view rendered directly by the guard.

 * Detects verification automatically, so the user normally never has to
 * click anything:
   - Polls refreshUser() every 4s while this is mounted.
   - Also refreshUser()s when the window regains focus or the tab becomes
     visible again — covers the common case of verifying in another tab/app
     and coming back here.
   - Each check skips the network round-trip if auth.currentUser is already
     verified (nothing left to detect), and everything is torn down on
     unmount, so nothing keeps polling after success or after leaving the
     page.
 * The moment emailVerified actually flips to true, ProtectedRoute
 * re-renders past this gate on its own (see refreshUser in AuthProvider for
 * why that re-render happens at all) — nothing here navigates manually.

 * "Resend email" and "I've verified — continue" remain as manual fallbacks
 * for when auto-detection is slow, blocked (e.g. backgrounded mobile tab
 * throttling timers), or the user just wants to force a check.

 * Props:
   - None
*/

function VerifyEmail() {
    const { user, refreshUser } = useAuth();
    const { showToast, ToastContainer } = useToast();
    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    // Auto-detection: poll + focus/visibility triggers.
    useEffect(() => {
        const checkVerification = () => {
            // Already verified (or signed out) — nothing to refresh, and no
            // point spending a reload() call once ProtectedRoute is about
            // to swap this component out anyway.
            if (!auth.currentUser || auth.currentUser.emailVerified) return;
            refreshUser();
        };

        const intervalId = setInterval(checkVerification, POLL_INTERVAL_MS);

        const handleFocus = () => checkVerification();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkVerification();
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [refreshUser]);

    const handleResend = async () => {
        setIsResending(true);
        try {
            await resendVerificationEmail();
            showToast("Verification email sent — check your inbox.", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setIsResending(false);
        }
    };

    const handleCheck = async () => {
        setIsChecking(true);
        try {
            await refreshUser();
            // Deliberately read auth.currentUser here, not the `user` from
            // useAuth() above — that `user` is a snapshot from this
            // component's last render and won't reflect refreshUser()'s
            // update until React re-renders, which hasn't happened yet at
            // this point in the same handler. auth.currentUser is the raw
            // Firebase singleton refreshUser() just reloaded, so it's
            // already correct. If the link was actually clicked, it's now
            // true and ProtectedRoute swaps this component out on its next
            // render — nothing left to do here. Only tell them if it's
            // still not verified.
            if (!auth.currentUser?.emailVerified) {
                showToast("Still not verified — check your email for the link.", "info");
            }
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="verify-email-page">
            <div className="verify-email-card">
                <h1 className="verify-email-title">Verify your email</h1>
                <p className="verify-email-message">
                    We sent a verification link to <strong>{user?.email}</strong>. Click the link in that
                    email, then come back here and continue.
                </p>

                <p className="verify-email-status">
                    <span className="verify-email-status-dot" aria-hidden="true"></span>
                    Checking automatically…
                </p>

                <div className="verify-email-actions">
                    <Button
                        type="button"
                        className="verify-email-btn verify-email-btn-outline"
                        onClick={handleResend}
                        disabled={isResending}
                    >
                        {isResending ? "Sending..." : "Resend email"}
                    </Button>
                    <Button
                        type="button"
                        className="verify-email-btn verify-email-btn-solid"
                        onClick={handleCheck}
                        disabled={isChecking}
                    >
                        {isChecking ? "Checking..." : "I've verified — continue"}
                    </Button>
                </div>

                <ToastContainer />
            </div>
        </div>
    );
}

export default VerifyEmail;

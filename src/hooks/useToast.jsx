import { useState } from "react";
import Toast from "../components/ui/Toast/Toast.jsx";

/*
 ? useToast Hook
  
 * A custom React hook that provides a simple and reusable way to display toast notifications.
 * Manages toast state and rendering, allowing components to trigger temporary messages (e.g., success, error).
  
 * Returns:
   - showToast (function): 
       - Parameters: 
           - message (string, required): The text to display in the toast
           - type (string, optional): The type of toast — "info", "success", "error", "warning". Defaults to "info"
       - Action: Sets the toast message and type, triggering UI update 
   - ToastContainer (component):
       - A renderable component that displays the <Toast> if active
       - Automatically unmounts when no toast is active
       - Passes `onClose` to handle cleanup after animation

 * State:
  - toast (object | null): Holds { message, type } when active, null when hidden

 * Behavior:
   - Calling `showToast()` displays the toast for ~3 seconds (handled by <Toast />)
   - `hideToast()` clears the toast state (called internally by <Toast />)
   - <ToastContainer /> conditionally renders the toast only when active
*/

export function useToast() {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "info") => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

    const ToastContainer = () =>
        toast ? <Toast message={toast.message} type={toast.type} onClose={hideToast} /> : null;

    return { showToast, ToastContainer };
}

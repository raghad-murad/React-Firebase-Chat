import { useEffect, useState } from "react";
import "./Toast.css";

/**
 * Toast Component
  
 * A lightweight, auto-dismissing notification component used to display brief messages to the user.
 * Supports different types (e.g., success, error, info) with smooth fade-in/fade-out and scale animations.
  
 * Props:
   - message (string, required): The text message to display in the toast notification
   - type (string, optional): The type of toast, affects styling. One of: "info", "success", "error", "warning". Defaults to "info"
   - onClose (function, optional): Callback function triggered when the toast is completely closed (after animation)
  
 * Returns:
   - (JSX.Element | null): 
        A toast notification element with entrance and exit animations.
        Returns null when the toast is fully hidden to prevent DOM clutter.
  
 * Behavior:
  - Automatically closes after 3 seconds
   - Starts exit animation when closing, then unmounts after animation completes
   - Uses CSS classes for animations: fade-in, fade-out, scale-in, scale-out
 */

function Toast({ message, type = "info", onClose }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 3000); 

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            onClose();
        }, 300); 
    };

    if (!isVisible) return null;

    return (
        <div className={`toast-overlay ${isClosing ? 'fade-out' : 'fade-in'}`}>
            <div className={`toast toast-${type} ${isClosing ? 'scale-out' : 'scale-in'}`}>
                <span>{message}</span>
            </div>
        </div>
    );
}

export default Toast;
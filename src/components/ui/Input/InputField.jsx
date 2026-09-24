import { useState } from 'react';

/*
 ? InputField Component

 * A highly customizable and reusable input field component that supports:
   - Labels and helper text (extra info)
   - Icons (e.g., for password visibility, email, etc.)
   - Validation states (valid/invalid) with visual feedback only after user interaction
   - Error messages
   - Auto-complete, placeholder, and various input types

 * This component is ideal for forms in authentication or settings pages.

* Props:
   - className (string): CSS class for styling the main input wrapper container
   - labelClassName (string, optional): CSS class for the label container; defaults to "input-label-wrapper"
   - label (string, optional): Label text displayed above the input field
   - extra (string, optional): Additional text or link next to the label (e.g., "Forgot password?")
   - icon (string, optional): Image source path for an icon displayed inside the input (e.g., email or lock icon)
   - iconAlt (string, optional): Alt text for the icon, used for accessibility
   - type (string, optional): Type of input field; defaults to "text" (e.g., "password", "email", "number")
   - name (string): Name and ID of the input, used for form submission and label association
   - placeholder (string, optional): Placeholder text shown inside the input when empty
   - autoCompleteValue (string, optional): Value for the autocomplete attribute (e.g., "on", "off", "current-password")
   - value (string): Controlled value of the input field (managed by parent component state)
   - change (function, optional): onChange event handler to update the input value in the parent state
   - error (string, optional): Error message displayed when the input is invalid
   - isValid (boolean, optional): Indicates whether the input value is valid; affects visual styling (e.g., green border)

 * Returns:
  - (JSX.Element):
      A fully accessible and styled input field component with optional label, icon, helper text, and error message.
      The component adapts its appearance based on validation state (valid/invalid) and user interaction.
*/

const InputField = ({ className, labelClassName = "input-label-wrapper", label, extra, icon, iconAlt, type = "text", name, placeholder, autoCompleteValue, value, change, error, isValid }) => {

    const [hasInteracted, setHasInteracted] = useState(false);

    const handleChange = (e) => {
        if (!hasInteracted && e.target.value.trim() !== '') {
            setHasInteracted(true);
        }

        if (change) {
            change(e);
        }
    };

    const handleBlur = () => {
        setHasInteracted(true);
    };

    // Set the class name according to the state
    const getInputClass = () => {
        if (!hasInteracted) return "";

        if (error) return "invalid-input";
        if (isValid && value) return "valid-input";

        return "";
    };

    return (

        <div className={className}>
            {label &&
                <div className={labelClassName}>
                    {label && <label htmlFor={name}>{label}</label>}
                    {extra && <span>{extra}</span>}
                </div>
            }
            {icon &&
                <img
                    src = {icon}
                    alt = {iconAlt}
                    loading = "lazy"
                />
            }
            <input
                id={name}
                className={getInputClass()}
                type={type}
                name={name}
                placeholder={placeholder}
                autoComplete={autoCompleteValue}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
            />
            {/* Error Message */}
            {hasInteracted && (!isValid && error) && <p className="error-message">{error}</p>}
        </div>

    );
};

export default InputField;

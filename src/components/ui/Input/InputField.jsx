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
   - inputClassName (string): CSS class for styling the main input wrapper container
   - inputLabelClassName (string, optional): CSS class for the label container; defaults to "input-label-wrapper"
   - inputLabel (string, optional): Label text displayed above the input field
   - inputExtra (string, optional): Additional text or link next to the label (e.g., "Forgot password?")
   - inputIcon (string, optional): Image source path for an icon displayed inside the input (e.g., email or lock icon)
   - iconAlt (string, optional): Alt text for the icon, used for accessibility
   - inputType (string, optional): Type of input field; defaults to "text" (e.g., "password", "email", "number")
   - inputName (string): Name and ID of the input, used for form submission and label association
   - placeholder (string, optional): Placeholder text shown inside the input when empty
   - autoCompleteValue (string, optional): Value for the autocomplete attribute (e.g., "on", "off", "current-password")
   - inputValue (string): Controlled value of the input field (managed by parent component state)
   - change (function, optional): onChange event handler to update the input value in the parent state
   - inputError (string, optional): Error message displayed when the input is invalid
   - isValid (boolean, optional): Indicates whether the input value is valid; affects visual styling (e.g., green border)
 
 * Returns:
  - (JSX.Element):
      A fully accessible and styled input field component with optional label, icon, helper text, and error message.
      The component adapts its appearance based on validation state (valid/invalid) and user interaction.
*/

const InputField = ({ inputClassName, inputLabelClassName = "input-label-wrapper", inputLabel, inputExtra, inputIcon, iconAlt, inputType = "text", inputName, placeholder, autoCompleteValue, inputValue, change, inputError, isValid }) => {
   
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
        
        if (inputError) return "invalid-input"; 
        if (isValid && inputValue) return "valid-input"; 
        
        return ""; 
    };

    return (

        <div className={inputClassName}>
            {inputLabel &&
                <div className={inputLabelClassName}>
                    {inputLabel && <label htmlFor={inputName}>{inputLabel}</label>}
                    {inputExtra && <span>{inputExtra}</span>}
                </div>
            }
            {inputIcon &&
                <img
                    src = {inputIcon}
                    alt = {iconAlt}
                    loading = "lazy"
                />
            }
            <input
                id={inputName}
                className={getInputClass()}
                type={inputType}
                name={inputName}
                placeholder={placeholder}
                autoComplete={autoCompleteValue}
                value={inputValue} 
                onChange={handleChange}
                onBlur={handleBlur}
            />
            {/* Error Message */}
            {hasInteracted && (!isValid && inputError) && <p className="error-message">{inputError}</p>}
        </div>

    );
};

export default InputField;
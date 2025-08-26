import InputField from '../../ui/Input/InputField.jsx'
import Checkbox from '../../ui/Checkbox/Checkbox.jsx';
import Button from '../../ui/Button/Button.jsx';

import { emailValidation } from '../../../utils/validation.js';

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../../../firebase/firebase.js';
import { useToast } from "../../../hooks/useToast.jsx";
import { useNavigate } from 'react-router-dom';

/*
 ? SignInForm Component
  
 * A fully functional and accessible sign-in form with real-time email validation,
 * password input, "Remember me" checkbox, and Firebase authentication integration.
 * Displays user feedback via toast notifications and handles navigation on success.
 
 * Props:
   - None (This component does not accept any props)
  
 * Returns:
   - (JSX.Element): A styled form with:
       - Email input with real-time validation
       - Password input with "Forgot password?" hint
       - Remember-me checkbox
       - Submit button
       - ToastContainer for displaying success/error messages
  
 * State:
   - email (string): Controlled value for email input
   - emailError (string): Error message from email validation
   - emailValid (boolean): Validation state of email
   - password (string): Controlled value for password input
   - acceptedTerms (boolean): Tracks if "Remember me" is checked
  
 * Handlers:
   - handleEmailChange: Validates email on every input change
   - handleTermsChange: Updates checkbox state
   - handleSubmit: Submits credentials to Firebase Auth

 * Validation:
   - Real-time email validation using regex (via emailValidation utility)
   - Prevents submission if fields are invalid or empty
  
 * Error Handling:
   - Shows specific message for "invalid credentials"
   - Falls back to generic error message if needed
 */

function SignInForm() {

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [emailValid, setEmailValid] = useState(true);

    const [password, setPassword] = useState("");

    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const { showToast, ToastContainer } = useToast();

    const navigateTo = useNavigate();

    const handleEmailChange = (e) => {
        const emailValue = e.target.value;
        setEmail(emailValue);
        const { isValid, error } = emailValidation(emailValue);
        setEmailValid(isValid);
        setEmailError(error);
    };

    const handleTermsChange = (e) => {
        setAcceptedTerms(e.target.checked);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!emailValid || !email || !password) {
            showToast("Please fix the errors before signing up!", "error");
            return;
        }

        try {

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            showToast("Logged in successfully!", "success");

            setEmail("");
            setPassword("");

            setTimeout(() => {
                navigateTo("/chats");
            }, 3500);

        } catch (error) {
            if (error.code === "auth/invalid-credential") {
                showToast("There is a problem with your email or password. Please check and try again.", "error");
            } else {
                showToast(error.message, "error");
            }
        }
    };

    return (
        <form className="signin-form" onSubmit={handleSubmit} noValidate>

            <InputField
                inputClassName="form-input"
                inputLabel="Email Address"
                inputType="email"
                inputName="userEmail"
                placeholder="Enter your email"
                autoCompleteValue="email"
                inputValue={email}
                change={handleEmailChange}
                inputError={emailError}
                isValid={emailValid}
            />

            <InputField
                inputClassName="form-input"
                inputLabelClassName="password-input"
                inputLabel="Password"
                inputExtra="forgot password?"
                inputType="password"
                inputName="userPassword"
                placeholder="Enter your password"
                autoCompleteValue="current-password"
                inputValue={password}
                change={(e) => setPassword(e.target.value)}
            />

            <Checkbox
                inputClassName="remember-user-input"
                inputName="checkRemember"
                checked={acceptedTerms}
                onChange={handleTermsChange}
                inputLabel="Remember for 30 days"
            />

            <ToastContainer />

            <Button
                inputClassName="submit-button"
                inputType="submit"
            >
                login
            </Button>

        </form>
    );
}

export default SignInForm
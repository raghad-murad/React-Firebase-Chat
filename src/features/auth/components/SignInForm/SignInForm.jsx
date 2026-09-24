import InputField from '@/components/ui/Input/InputField.jsx'
import Checkbox from '@/components/ui/Checkbox/Checkbox.jsx';
import Button from '@/components/ui/Button/Button.jsx';

import { emailValidation } from '@/utils/validation.js';

import { useState } from "react";
import { signIn } from '../../services/authService.js';
import { useToast } from "@/hooks/useToast.jsx";
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes/paths.js';

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
   - handleSubmit: Submits credentials via authService

 * Validation:
   - Real-time email validation using regex (via emailValidation utility)
   - Prevents submission if fields are invalid or empty

 * Error Handling:
   - Friendly error messages are resolved centrally in authService
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

            await signIn(email, password);
            showToast("Logged in successfully!", "success");

            setEmail("");
            setPassword("");

            setTimeout(() => {
                navigateTo(ROUTES.chat);
            }, 1500);

        } catch (error) {
            showToast(error.message, "error");
        }
    };

    return (
        <form className="signin-form" onSubmit={handleSubmit} noValidate>

            <InputField
                className="form-input"
                label="Email Address"
                type="email"
                name="userEmail"
                placeholder="Enter your email"
                autoCompleteValue="email"
                value={email}
                change={handleEmailChange}
                error={emailError}
                isValid={emailValid}
            />

            <InputField
                className="form-input"
                labelClassName="password-input"
                label="Password"
                extra="forgot password?"
                type="password"
                name="userPassword"
                placeholder="Enter your password"
                autoCompleteValue="current-password"
                value={password}
                change={(e) => setPassword(e.target.value)}
            />

            <Checkbox
                className="remember-user-input"
                name="checkRemember"
                checked={acceptedTerms}
                onChange={handleTermsChange}
                label="Remember for 30 days"
            />

            <ToastContainer />

            <Button
                className="submit-button"
                type="submit"
            >
                login
            </Button>

        </form>
    );
}

export default SignInForm

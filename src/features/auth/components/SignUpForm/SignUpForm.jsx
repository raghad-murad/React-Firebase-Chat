import InputField from '@/components/ui/Input/InputField.jsx'
import Checkbox from '@/components/ui/Checkbox/Checkbox.jsx';
import Button from '@/components/ui/Button/Button.jsx'

import { nameValidation, emailValidation, passwordValidation } from '@/utils/validation.js';

import { useState } from "react";
import { signUp } from "../../services/authService.js";
import { useToast } from "@/hooks/useToast.jsx";
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes/paths.js';

/*
 ? SignUpForm Component

 * A complete and accessible user registration form with real-time validation,
 * Firebase authentication integration, and user-friendly feedback via toast notifications.
 * Handles full sign-up flow including input validation, error handling, and post-signup redirect.

 * Props:
   - None (This component does not accept any props)

 * Returns:
   - (JSX.Element): A styled form with:
       - Name, email, and password inputs with real-time validation
       - Terms & policy checkbox with formatted label (including clickable <span>)
       - Submit button
       - ToastContainer for displaying success/error messages

 * State:
   - name (string): Controlled value for full name input
   - nameError (string): Error message from name validation
   - nameValid (boolean): Validation state of name
   - email (string): Controlled value for email input
   - emailError (string): Error message from email validation
   - emailValid (boolean): Validation state of email
   - password (string): Controlled value for password input
   - passwordError (string): Error message from password validation
   - passwordValid (boolean): Validation state of password
   - acceptedTerms (boolean): Tracks whether user accepted terms

 * Handlers:
   - handleNameChange: Validates name on every input change
   - handleEmailChange: Validates email using utility function
   - handlePasswordChange: Validates password strength in real-time
   - handleTermsChange: Updates checkbox state
   - handleSubmit: Handles form submission via authService

 * Validation:
   - Real-time validation for all fields using regex and custom rules
   - Prevents submission if any field is invalid or empty
   - Ensures user accepts terms before proceeding

 * Error Handling:
   - Friendly error messages are resolved centrally in authService
*/

function SignUpForm() {

    const [name, setName] = useState("");
    const [nameError, setNameError] = useState("");
    const [nameValid, setNameValid] = useState(true);

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [emailValid, setEmailValid] = useState(true);

    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordValid, setPasswordValid] = useState(true);

    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const { showToast, ToastContainer } = useToast();

    const navigateTo = useNavigate();

    const handleNameChange = (e) => {
        const nameValue = e.target.value;
        setName(nameValue);
        const { isValid, error } = nameValidation(nameValue);
        setNameValid(isValid);
        setNameError(error);
    };

    const handleEmailChange = (e) => {
        const emailValue = e.target.value;
        setEmail(emailValue);
        const { isValid, error } = emailValidation(emailValue);
        setEmailValid(isValid);
        setEmailError(error);
    };

    const handlePasswordChange = (e) => {
        const passwordValue = e.target.value;
        setPassword(passwordValue);
        const { isValid, error } = passwordValidation(passwordValue);
        setPasswordValid(isValid);
        setPasswordError(error);
    };

    const handleTermsChange = (e) => {
        setAcceptedTerms(e.target.checked);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!nameValid || !emailValid || !passwordValid || !name || !email || !password) {
            showToast("Please fix the errors before signing up!", "error");
            return;
        }

        if (!acceptedTerms) {
            showToast("You must accept the terms & policy to sign up", "error");
            return;
        }

        try {

            await signUp(name, email, password);
            showToast("Account created! Check your email to verify your account.", "success");

            setName("");
            setEmail("");
            setPassword("");
            setNameError("");
            setEmailError("");
            setPasswordError("");
            setNameValid(true);
            setEmailValid(true);
            setPasswordValid(true);

            setTimeout(() => {
                // A brand-new account lands on Settings for profile setup —
                // the emailVerified gate in ProtectedRoute will show
                // VerifyEmail first until they confirm their address, then
                // this is where they land. Existing users returning via
                // SignInForm go straight to ROUTES.chat instead.
                navigateTo(ROUTES.settings);
            }, 1500);

        } catch (error) {
            showToast(error.message, "error");
        }
    };

    return (
        <form className="signup-form" onSubmit={handleSubmit} noValidate>

            <InputField
                className="form-input"
                label="Name"
                type="text"
                name="userName"
                placeholder="Enter your name"
                autoCompleteValue="name"
                value={name}
                change={handleNameChange}
                error={nameError}
                isValid={nameValid}
            />

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
                type="password"
                name="userPassword"
                placeholder="Enter your password"
                autoCompleteValue="new-password"
                value={password}
                change={handlePasswordChange}
                error={passwordError}
                isValid={passwordValid}
            />

            <Checkbox
                className="terms-input"
                name="checkAcceptTerms"
                label={
                    <>
                        I agree to the <span>terms & policy</span>
                    </>
                }
                checked={acceptedTerms}
                onChange={handleTermsChange}
            />

            <ToastContainer />

            <Button
                className="submit-button"
                type="submit"
            >
                Signup
            </Button>

        </form>
    );
}

export default SignUpForm

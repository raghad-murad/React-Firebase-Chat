import InputField from '../../ui/Input/InputField.jsx'
import Checkbox from '../../ui/Checkbox/Checkbox.jsx';
import Button from '../../ui/Button/Button.jsx'

import { nameValidation, emailValidation, passwordValidation } from '../../../utils/validation.js';

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebase/firebase.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useNavigate } from 'react-router-dom';

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
   - handleSubmit: Handles form submission and Firebase account creation
   
 * Validation:
   - Real-time validation for all fields using regex and custom rules
   - Prevents submission if any field is invalid or empty
   - Ensures user accepts terms before proceeding
   
 * Error Handling:
   - Shows specific message for "auth/email-already-in-use"
   - Displays generic error fallback if needed
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

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            showToast("Account created successfully!", "success");

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
                navigateTo("/chats");
            }, 3500);

        } catch (error) {
            if (error.code === "auth/email-already-in-use") {
                showToast("This email is already registered. Please log in or use another email.", "error");
            } else {
                showToast(error.message, "error");
            }
        }
    };

    return (
        <form className="signup-form" onSubmit={handleSubmit} noValidate>

            <InputField
                inputClassName="form-input"
                inputLabel="Name"
                inputType="text"
                inputName="userName"
                placeholder="Enter your name"
                autoCompleteValue="name"
                inputValue={name}
                change={handleNameChange}
                inputError={nameError}
                isValid={nameValid}
            />

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
                inputType="password"
                inputName="userPassword"
                placeholder="Enter your password"
                autoCompleteValue="new-password"
                inputValue={password}
                change={handlePasswordChange}
                inputError={passwordError}
                isValid={passwordValid}
            />

            <Checkbox
                inputClassName="terms-input"
                inputName="checkAcceptTerms"
                inputLabel={
                    <>
                        I agree to the <span>terms & policy</span>
                    </>
                }
                checked={acceptedTerms}
                onChange={handleTermsChange}
            />

            <ToastContainer />

            <Button
                inputClassName="submit-button"
                inputType="submit"
            >
                Signup
            </Button>

        </form>
    );
}

export default SignUpForm
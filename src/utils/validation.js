// Form validation functions

// Regex pattern name (only letters & spaces)
const namePattern = /^[A-Za-z\s]+$/;

// Validation function for name field
export function nameValidation(value) {

    // variable to save the current error
    let error = "";

    if (!value || value.trim() === "") {
        error = "Contact Name is required!";
    } else if (value.trim().length < 3) {
        error = "Invalid Contact Name - must be at least 3 characters!";
    } else if (!namePattern.test(value)) {
        error = "Invalid Contact Name - contains invalid characters!";
    }

    return {
        isValid: error === "",
        error
    };
}

// Regex patterns
// username part
const userNamePattern = /^[A-Za-z0-9-._]+$/;  
// domain part 
const domainPattern = /^[A-Za-z0-9-]+$/;   
// top-level domain (e.g. com, net)    
const tldPattern = /^[A-Za-z]{2,63}$/;         

// Validation function for email
export function emailValidation(value) {
    let error = "";

    if (!value || value.trim() === "") {
        error = "Email is required!";
    } else if (value.trim().length < 10) {
        error = "Invalid Email - must be at least 10 characters!";
    } else if (/\s/.test(value)) {
        error = "Invalid Email - cannot contain spaces!";
    } else {
        const emailParts = value.split("@");

        if (emailParts.length !== 2) {
            error = "Invalid Email - must contain exactly one '@' symbol!";
        } else {
            const [username, domain] = emailParts;

            // Username checks
            if (!userNamePattern.test(username)) {
                error = "Invalid Email - invalid characters in username!";
            } else if (username.startsWith("_") || username.endsWith("_")) {
                error = "Invalid Email - username cannot start or end with underscore!";
            } else if (username.includes("..")) {
                error = "Invalid Email - username cannot contain consecutive dots!";
            } else if (domain.includes("..")) {
                error = "Invalid Email - domain cannot contain consecutive dots!";
            } else {
                const domainParts = domain.split(".");

                if (domainParts.length < 2) {
                    error = "Invalid Email - must be in format username@domain.tld!";
                } else {
                    for (let i = 0; i < domainParts.length; i++) {
                        const part = domainParts[i];
                        if (part === "") {
                            error = "Invalid Email - domain cannot contain empty parts!";
                            break;
                        }
                        if (!domainPattern.test(part)) {
                            error = "Invalid Email - domain contains invalid characters!";
                            break;
                        }
                    }

                    // Last part = TLD
                    const tld = domainParts[domainParts.length - 1];
                    if (!tldPattern.test(tld)) {
                        error = "Invalid Email - invalid top-level domain!";
                    }
                }
            }
        }
    }

    return {
        isValid: error === "",
        error
    };
}

// Regex patterns
const upperCasePattern = /[A-Z]/;
const lowerCasePattern = /[a-z]/;
const numberPattern = /[0-9]/;
const specialCharPattern = /[!@#$%^&*(),.?":{}|<>]/;

// Validation function for password
export function passwordValidation(value) {
    let error = "";

    if (!value || value.trim() === "") {
        error = "Password is required!";
    } else if (value.length < 8) {
        error = "Invalid Password - must be at least 8 characters!";
    } else if (!upperCasePattern.test(value)) {
        error = "Invalid Password - must contain at least one uppercase letter!";
    } else if (!lowerCasePattern.test(value)) {
        error = "Invalid Password - must contain at least one lowercase letter!";
    } else if (!numberPattern.test(value)) {
        error = "Invalid Password - must contain at least one number!";
    } else if (!specialCharPattern.test(value)) {
        error = "Invalid Password - must contain at least one special character!";
    }

    return {
        isValid: error === "",
        error
    };
}

// Lowercase letters, digits, underscore, dot, and hyphen only — 3 to 20 characters.
const usernamePattern = /^[a-z0-9._-]{3,20}$/;

// Validation function for the "username" handle (separate from the display
// name — see userService.js's doc shape comment). Required: a brand-new
// account no longer gets a default at sign-up (see authService.signUp), so
// an empty value is invalid, same as a value that doesn't match
// usernamePattern. Auto-lowercases/trims before checking, since a username
// is always stored lowercased — callers can pass the raw typed value
// straight through.
export function usernameValidation(value) {
    const normalized = (value ?? "").trim().toLowerCase();

    if (normalized === "") {
        return { isValid: false, error: "Username is required." };
    }

    if (!usernamePattern.test(normalized)) {
        return {
            isValid: false,
            error: "Username can only use lowercase letters, numbers, _, ., and - (3-20 characters).",
        };
    }

    return { isValid: true, error: "" };
}

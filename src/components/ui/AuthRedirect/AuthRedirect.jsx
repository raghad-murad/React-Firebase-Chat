import { Link } from "react-router-dom";

/*
 ? AuthRedirect Component

 * A reusable component used in authentication pages (e.g., SignIn, SignUp)
 * to display a message with a navigational link. For example:
 * "Don't have an account? Sign up" or "Already have an account? Log in".

 * Props:
   - className (string): CSS class for styling the container
   - message (string): The main text message to display
   - linkText (string): The text for the clickable link
   - linkTo (string): The route path the link navigates to
*/

function AuthRedirect({ className, message, linkText, linkTo }) {

    return (
        <div className={className}>
            <p>{message}</p>
            <Link to={linkTo}>{linkText}</Link>
        </div>
    );

}

export default AuthRedirect;

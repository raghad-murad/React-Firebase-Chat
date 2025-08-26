import AuthRedirect from '../../components/ui/AuthRedirect/AuthRedirect'
import SignInForm from '../../components/widget/SignInForm/SignInForm.jsx'
import SocialAuthButtons from '../../components/ui/SocialAuthButtons/SocialAuthButtons'
import Divider from '../../components/ui/Divider/Divider'
import AuthLayout from '../../layout/Auth/AuthLayout'
import AuthTitle from '../../components/ui/Title/Title'

/*
 ? SignIn Page Component (Currently named SignUp.js)
  
 * A complete sign-in page that combines a traditional email/password form with social authentication
 * and navigation links. Built using reusable UI components and structured with a responsive layout.
  
 * Props:
   - None (This component does not accept any props)
   
 * Returns:
   - (JSX.Element): A full authentication page composed of:
       - AuthTitle: Displays main heading and subtitle
       - SignInForm: Email and password login form with validation
       - Divider: Visual "OR" separator
       - SocialAuthButtons: Google and Apple sign-in options
       - AuthRedirect: Link for users without an account ("Don't have an account? Sign up")
       - Wrapped in AuthLayout for responsive design and visual branding
  
 * Component Composition:
   - AuthLayout: Main container with responsive side image
   - AuthTitle: Header with welcome message
   - SignInForm: Controlled form with Firebase authentication
   - Divider: Styled horizontal line with "OR"
   - SocialAuthButtons: Quick login via Google/Apple
   - AuthRedirect: Bottom link to switch to sign-up
*/

function SignIn() {

    return (
        <AuthLayout>

            {/* Auth Content Title - in this case, it's the sign up title */}
            <AuthTitle
                titleClassName = "auth-title"
                title = "Welcome back!"
                extra = "Enter your Credentials to access your account"
            />

            {/* Sign In Form */}
            <SignInForm />

            {/* Divider between the form and the social sign up buttons (sign up with google or apple instead of the form) */}
            <Divider dividerLabel = "OR"/>

            {/* The social sign up buttons (sign up with google or apple instead of the form) */}
            <SocialAuthButtons />

            {/* If the user didn't have an account, link to sign up page */}
            <AuthRedirect
                messageClassName="have-no-account"
                message="Don’t have an account?"
                linkText="Sign up"
                linkTo="/SignUp"
            />

        </AuthLayout>

    )
}

export default SignIn
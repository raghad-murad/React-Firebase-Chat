import AuthRedirect from '../../components/ui/AuthRedirect/AuthRedirect'
import SignUpForm from '../../components/widget/SignUpForm/SignUpForm'
import SocialAuthButtons from '../../components/ui/SocialAuthButtons/SocialAuthButtons'
import Divider from '../../components/ui/Divider/Divider'
import AuthLayout from '../../layout/Auth/AuthLayout'
import AuthTitle from '../../components/ui/Title/Title'

/*
 ? SignUp Component
   
 * A complete and user-friendly registration page that allows new users to create an account
 * using email/password or social providers (Google, Apple). Features a clean, responsive layout
 * with clear navigation for returning users.
   
 * Props:
   - None (This component does not accept any props)
   
 * Returns:
   - (JSX.Element): A full sign-up page composed of:
       - AuthTitle: Main heading with motivational text
       - SignUpForm: Form for name, email, password, and terms acceptance
       - Divider: Visual separator with "OR" label
       - SocialAuthButtons: Alternative sign-up via Google or Apple
       - AuthRedirect: Link for existing users to sign in
       - All wrapped in AuthLayout for responsive design and branding
  
 * Component Composition:
   - AuthLayout: Responsive container with side decoration image (hidden on mobile)
   - AuthTitle: Displays "Get Started Now" as main heading
   - SignUpForm: Controlled form with real-time validation and Firebase integration
   - Divider: Styled horizontal rule with "OR" to separate local and social auth
   - SocialAuthButtons: Buttons for Google and Apple sign-up
   - AuthRedirect: Shows "Have an account? Sign in" with link to /SignIn
*/

function SignUp() {

    return (
        <AuthLayout>

            {/* Auth Content Title - in this case, it's the sign up title */}
            <AuthTitle
                titleClassName = "auth-title"
                title = "Get Started Now"
            />

            {/* Sign Up Form */}
            <SignUpForm />

            {/* Divider between the form and the social sign up buttons (sign up with google or apple instead of the form) */}
            <Divider dividerLabel = "OR"/>

            {/* The social sign up buttons (sign up with google or apple instead of the form) */}
            <SocialAuthButtons />

            {/* If the user have already an account, link to login/sign in page */}
            <AuthRedirect
                messageClassName="have-account"
                message="Have an account?"
                linkText="Sign in"
                linkTo="/SignIn"
            />


        </AuthLayout>

    )
}

export default SignUp
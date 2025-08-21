
import AuthRedirect from '../components/auth/AuthRedirect'
import SignUpForm from '../components/auth/SignUpForm'
import SocialAuthButtons from '../components/auth/SocialAuthButtons'
import Divider from '../components/UI/Divider'
import AuthLayout from '../layout/AuthLayout'
import '../styles/auth-styles.css'

function SignUp() {

    return (
        <AuthLayout>

            {/* Auth Content Title - in this case, it's the sign up title */}
            <div className='auth-title'>
                <h1>Get Started Now</h1>
            </div>

            {/* Sign Up Form */}
            <SignUpForm />

            {/* Divider between the form and the social sign up buttons (sign up with google or apple instead of the form) */}
            <Divider />

            {/* The social sign up buttons (sign up with google or apple instead of the form) */}
            <SocialAuthButtons />

            {/* If the user have already an account, link to login/sign in page */}
            <AuthRedirect />

        </AuthLayout>

    )
}

export default SignUp
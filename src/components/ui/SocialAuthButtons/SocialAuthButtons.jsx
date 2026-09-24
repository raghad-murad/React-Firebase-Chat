import googleLogo from '@/assets/images/google-logo.svg'
import appleLogo from '@/assets/images/apple-logo.svg'

/*
 ? SocialAuthButtons Component
   
 * A component that renders social authentication buttons (Google and Apple).
 * Provides a quick and secure way for users to sign in using their existing accounts.
   
 * Props:
   - None (This component does not accept any props)
  
 * Returns:
   - (JSX.Element): 
        A container with two styled buttons for signing in with Google and Apple.
        Each button includes the respective logo and label for accessibility and clarity.
  
 * Dependencies:
  - googleLogo: Imported SVG asset from '@/assets/images/google-logo.svg'
  - appleLogo: Imported SVG asset from '@/assets/images/apple-logo.svg'
*/

function SocialAuthButtons() {
    return (
        <div className='other-option-to-sign'>
            <button className='sign-with-google' title='Sign in with Google'>
                <div>
                    <img
                        src={googleLogo}
                        alt='Google Logo'
                    />
                    <p>Sign in with Google</p>
                </div>
            </button>
            <button className='sign-with-apple' title='Sign in with Apple'>
                <div>
                    <img
                        src={appleLogo}
                        alt='Apple Logo'
                    />
                    <p>Sign in with Apple</p>
                </div>
            </button>
        </div>
    );
}

export default SocialAuthButtons;
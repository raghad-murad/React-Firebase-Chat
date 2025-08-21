import googleLogo from '@/assets/images/google-logo.svg'
import appleLogo from '@/assets/images/apple-logo.svg'

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
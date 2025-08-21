import sideImage from '../assets/images/side-image.png'

function AuthLayout({ children }) {
    return (

        <div className="auth-layout flex">

            {/* Auth Content Container */}
            <div className='auth-content w-1/2'>
                {children}
            </div>

            {/* Side decoration image (only display in the large screens, in the small screens it's hidden) */}
            <div className="auth-image w-1/2 p-8">
                <img
                    src={sideImage}
                    alt='Side Decoration Image'
                />
            </div>

        </div>

    );
}

export default AuthLayout;
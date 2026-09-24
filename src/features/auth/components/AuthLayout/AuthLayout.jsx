import './AuthLayout.css'
import './AuthLayoutResponsive.css'

/*
 ? AuthLayout Component
  
 * A responsive layout component designed for authentication pages (e.g., Sign In, Sign Up).
 * Features a two-column design with form content on the left and a decorative background image on the right,
 * which is hidden on small screens for better mobile experience.
  
 * Props:
   - children (ReactNode, required): The main content to display in the auth container (e.g., SignInForm, SignUpForm)
  
 * Returns:
   - (JSX.Element): A responsive layout with:
       - Left side: Auth content container (form, title, inputs, etc.)
       - Right side: Decorative full-height image (visible only on large screens)
  
   Structure:
   - .auth-layout: Main flex container (row on large screens, column or full-width on small)
   - .auth-container: Wrapper for the form and text content
   - .auth-content: Inner padding and alignment for children
   - .auth-image: Background image container (uses CSS `background-image` or will be styled via CSS)
  
 * Responsive Behavior:
   - On large screens: Displays side-by-side layout (content | image)
   - On small screens: Hides the image and centers the content for better usability
 
 * Styling:
 * - Primary styles in './AuthLayout.css'
 * - Responsive rules in './AuthLayoutResponsive.css'
 * - The image is applied via CSS (e.g., `background-image`) for better control and performance
*/

function AuthLayout({ children }) {
    return (

        <div className="auth-layout">

            {/* Auth Content Container */}
            <div className='auth-container'>
                <div className='auth-content'>
                    {children}
                </div>
            </div>

            {/* Side decoration image (only display in the large screens, in the small screens it's hidden) */}
            <div className="auth-image">
                {/* Image will add as a cover of the div */}
            </div>

        </div>

    );
}

export default AuthLayout;
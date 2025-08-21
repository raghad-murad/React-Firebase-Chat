import { Link } from "react-router-dom";

function AuthRedirect({ type }) {

    if (type === "signup") {
        return (<div className='have-account'>
            <p>Have an account?</p>
            <Link to="/SignIn">Sign In</Link>
        </div>);
    }

    return (
        <div className='have-no-account'>
            <p>Don’t have an account?</p>
            <Link to="/SignUp">Sign Up</Link>
        </div>
    )

}

export default AuthRedirect;
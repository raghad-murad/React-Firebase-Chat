import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import LockoutImage from '../../assets/images/lock-icon.svg'
import './Lockout.css'

function Lockout({ duration = 3000 }) {
    const [redirect, setRedirect] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setRedirect(true);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    if (redirect) {
        return <Navigate to="/SignIn" replace />;
    }

    return (
        <div className="lock-out-page">
            <div className="lock-out-container">
                <div className="lockout-message">
                    <h2>Access Denied</h2>
                    <p>You must be logged in to access this page.</p>
                </div>
                <div className="lock-out-image">
                    <img
                        src={LockoutImage}
                        alt="lockout"
                        loading="lazy"
                    />
                    <div className="lock-out-shadow"></div>
                </div>
                <p>You will be redirected to the Login Page in {duration / 1000} seconds!</p>
            </div>
        </div>
    );
}

export default Lockout;

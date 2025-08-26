import './NotFound.css'
import { useNavigate } from "react-router-dom";

/*
 ? NotFound Component
  
 * A visually engaging 404 error page with a custom ghost illustration and navigation fallback.
 * Designed to gracefully handle invalid routes and improve user experience when a page is not found.
   
 * Props:
   - None (This component does not accept any props)
  
 * Returns:
   - (JSX.Element): A fully styled "Page Not Found" screen featuring:
       - Animated/CSS-drawn ghost character (using divs and classes)
       - Friendly error message: "Whoops! We couldn't find the page you were looking for"
       - "Back to Previous Page" button that navigates the user back in history
  
 * Functionality:
   - goBack(): Uses `useNavigate(-1)` to return to the previous page in browser history
   - Button click triggers history back action (equivalent to browser "back" button)
*/

function NotFound() {

    const navigate = useNavigate();

    const goBack = () => {
        navigate(-1); 
    };

    return (
        <div className="error-page">
            <div className="container">
                <div className='ghost'>
                    <div className='eye-left'></div>
                    <div className='eye-right'></div>
                    <div className='mouth'></div>
                    <div className='one'></div>
                    <div className='two'></div>
                    <div className='three'></div>
                    <div className='four'></div>
                </div>
                <div className='shadow'></div>
                <h1>Whoops!</h1>
                <p>We couldn't find the page you were locking for</p>
                <button className="home-link" onClick={goBack}>BACK TO PREVIOUS PAGE</button>
            </div>
        </div>
    );
}

export default NotFound;
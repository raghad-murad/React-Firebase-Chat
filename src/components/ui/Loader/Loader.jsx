import './Loader.css'

/*
 ? Loader Component
  
 * A customizable loading spinner with optional label.
 * Ideal for indicating loading states in forms, page transitions, or async operations.
  
 * Props:
   - loaderLabel (string, optional): Text to display below the spinner (e.g., "Loading...", "Please wait")
  
 * Returns:
   - (JSX.Element): 
        A styled loading animation with four rotating circles and a label.
        Uses CSS animations for smooth visual feedback.
*/

function Loader({ loaderLabel }) {
    return (
        <div className="loader-wrapper">
            <div className="loading-spinner">
                <div className="circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                </div>
                <div className="circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                </div>
                <div className="circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                </div>
                <div className="circle">
                    <div className="dot"></div>
                    <div className="outline"></div>
                </div>
            </div>
            <span className="loading-text">{loaderLabel}</span>
        </div>
    );
}

export default Loader;
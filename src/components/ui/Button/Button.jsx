/*
 ? Button Component
  
 * A reusable and customizable button component.
 * It accepts a custom class name, button type, and any child elements (like text or icons).
  
 * Props:
   - inputClassName (string): CSS class for styling the button
   - inputType (string, optional): The type of the button (e.g., "button", "submit", "reset")-> Defaults to "button" if not provided
   - children (ReactNode): The content inside the button (text, icons, etc.)
*/

function Button({ inputClassName, inputType ="button",  children }) {
    return (
        <button className={inputClassName} type={inputType}>
            {children}
        </button>
    );
}

export default Button;

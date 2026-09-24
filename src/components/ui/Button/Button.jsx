/*
 ? Button Component

 * A reusable and customizable button component.
 * It accepts a custom class name, button type, and any child elements (like text or icons).

 * Props:
   - className (string): CSS class for styling the button
   - type (string, optional): The type of the button (e.g., "button", "submit", "reset")-> Defaults to "button" if not provided
   - children (ReactNode): The content inside the button (text, icons, etc.)
   - ...rest: any other native <button> prop (onClick, disabled, title, aria-*, ...) is passed through
*/

function Button({ className, type = "button", children, ...rest }) {
    return (
        <button className={className} type={type} {...rest}>
            {children}
        </button>
    );
}

export default Button;

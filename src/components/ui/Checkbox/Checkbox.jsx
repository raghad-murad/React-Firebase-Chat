/*
 ? Checkbox Component

 * A reusable checkbox input component with an associated label.
 * It supports controlled behavior via `checked` and `onChange` props,
 * making it suitable for use in forms with state management (e.g., useState).

 * Props:
   - className (string): CSS class for styling the wrapper div
   - name (string): The name and ID of the checkbox (used for form handling and label association)
   - label (string): The text displayed next to the checkbox
   - checked (boolean): The current checked state of the checkbox
   - onChange (function): Event handler triggered when the checkbox state changes
*/

function Checkbox({ className, name, label, checked, onChange }) {
    return (
        <div className={className}>
            <input
                type = "checkbox"
                id = {name}
                name = {name}
                checked={checked}
                onChange={onChange}
                />
            <label htmlFor={name}>{label}</label>
        </div>
    );
}

export default Checkbox;

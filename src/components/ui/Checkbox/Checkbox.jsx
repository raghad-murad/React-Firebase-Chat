/*
 ? Checkbox Component
  
 * A reusable checkbox input component with an associated label.
 * It supports controlled behavior via `checked` and `onChange` props,
 * making it suitable for use in forms with state management (e.g., useState).
  
 * Props:
   - inputClassName (string): CSS class for styling the wrapper div
   - inputName (string): The name and ID of the checkbox (used for form handling and label association)
   - inputLabel (string): The text displayed next to the checkbox
   - checked (boolean): The current checked state of the checkbox
   - onChange (function): Event handler triggered when the checkbox state changes
*/

function Checkbox({ inputClassName, inputName, inputLabel, checked, onChange }) {
    return (
        <div className={inputClassName}>
            <input
                type = "checkbox"
                id = {inputName}
                name = {inputName} 
                checked={checked}
                onChange={onChange}
                />
            <label htmlFor={inputName}>{inputLabel}</label>
        </div>
    );
}

export default Checkbox;

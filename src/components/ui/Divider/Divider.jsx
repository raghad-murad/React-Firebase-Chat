/*
 ? Divider Component

 * A flexible divider component that displays a horizontal line (hr),
 * optionally with a label in the middle (e.g., "OR", "or continue with").

 * The component renders:
   - Two horizontal lines on either side of the label when `label` is provided.
   - A single full-width line if no label is passed.
*/

function Divider({ label }) {
    return (
        <div className="divider-container">
            <hr />
            {label &&
                <>
                    <span>{label}</span>
                    <hr />
                </>
            }
        </div>
    );
}

export default Divider;

/*
 ? Divider Component
  
 * A flexible divider component that displays a horizontal line (hr),
 * optionally with a label in the middle (e.g., "OR", "or continue with").
  
 * The component renders:
   - Two horizontal lines on either side of the label when `dividerLabel` is provided.
   - A single full-width line if no label is passed.
*/

function Divider({ dividerLabel }) {
    return (
        <div className="divider-container">
            <hr />
            {dividerLabel &&
                <>
                    <span>{dividerLabel}</span>
                    <hr />
                </>
            }
        </div>
    );
}

export default Divider;
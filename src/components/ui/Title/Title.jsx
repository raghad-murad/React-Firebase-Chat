/*
 ? Title Component

 * A simple and reusable component to render a heading (h1) with an optional extra text line (e.g., subtitle or description).
 * Commonly used in authentication forms, landing sections, or page headers.

 * Props:
   - className (string): CSS class applied to the wrapper div for custom styling
   - title (string): Main title text displayed in the <h1> tag
   - extra (string, optional): Additional text displayed below the title in a <p> tag

 * Returns:
   - (JSX.Element):
        A div container with a heading (<h1>) and an optional paragraph (<p>) for supplementary text.
        The structure is semantic and accessible, suitable for SEO and screen readers.
 */

function Title({ className, title, extra }) {

    return (
        // Auth Content Title - in this case, it's the sign up title
        <div className = {className} >
            <h1>{title}</h1>
            {extra && <p>{extra}</p>}
        </div>
    );
}

export default Title;

import { GlobeIcon } from "@/components/ui/icons/index.jsx";
import "./LinkPreviewCard.css";

/*
 ? LinkPreviewCard Component

 * The rich "shared link" message shape: a large preview image (or a
 * placeholder when none is available yet) with a title and subtitle below
 * it, the way a real OG-image link preview looks. Fills its message bubble
 * edge to edge — see .message-bubble-link in MessageBubble.css.

 * Props:
   - url (string, required)
   - title (string, required)
   - subtitle (string, optional)
   - imageUrl (string, optional): falls back to a generic placeholder
*/

function LinkPreviewCard({ url, title, subtitle, imageUrl }) {
    return (
        <a className="link-preview-card" href={url} target="_blank" rel="noreferrer">
            <span className="link-preview-image">
                {imageUrl ? (
                    <img src={imageUrl} alt="" loading="lazy" />
                ) : (
                    <GlobeIcon className="link-preview-image-icon" />
                )}
            </span>
            <span className="link-preview-text">
                <span className="link-preview-title">{title}</span>
                {subtitle && <span className="link-preview-subtitle">{subtitle}</span>}
            </span>
        </a>
    );
}

export default LinkPreviewCard;

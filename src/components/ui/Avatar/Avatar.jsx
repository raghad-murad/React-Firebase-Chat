import defaultAvatar from '@/assets/images/default-user.svg'
import './Avatar.css'

/*
 ? Avatar Component

 * A circular user avatar with an optional "online" ring, shared across chat,
 * settings, and any future feature that needs to show a profile picture.

 * When there's no image, it falls back to a colored initials badge (the
 * color is a deterministic hash of the name, so the same person always
 * gets the same color) instead of a generic silhouette — matching real
 * messaging apps, where most contacts don't have a photo set. The generic
 * silhouette is a last-resort fallback for when there's no name either.

 * Props:
   - src (string, optional): image URL
   - alt (string, optional): the person's name — used for the accessible
     label, and to derive the initials/color when there's no image
   - size ("sm" | "md" | "lg" | "xl", optional): defaults to "md"
   - online (boolean, optional): draws a green ring around the avatar when true
   - className (string, optional): extra class for one-off placement tweaks
*/

// Muted, avatar-friendly palette — mixes a light and a few dark tones so
// initials stay readable (dark text on the light one, white on the rest).
const INITIALS_PALETTE = [
    { bg: "#d7f0df", fg: "#2f6b3f" },
    { bg: "#2d3958", fg: "#ffffff" },
    { bg: "#6b46c1", fg: "#ffffff" },
    { bg: "#1f2328", fg: "#ffffff" },
    { bg: "#c2410c", fg: "#ffffff" },
    { bg: "#0f7d88", fg: "#ffffff" },
];

function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return INITIALS_PALETTE[Math.abs(hash) % INITIALS_PALETTE.length];
}

function initialsForName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

function Avatar({ src, alt = "", size = "md", online = false, className = "" }) {
    const showInitials = !src && alt.trim();
    const { bg, fg } = showInitials ? colorForName(alt) : {};

    return (
        <span className={`avatar avatar-${size} ${online ? "avatar-online" : ""} ${className}`.trim()}>
            {showInitials ? (
                <span
                    className="avatar-initials"
                    style={{ backgroundColor: bg, color: fg }}
                    role="img"
                    aria-label={alt}
                >
                    {initialsForName(alt)}
                </span>
            ) : (
                <img src={src || defaultAvatar} alt={alt} loading="lazy" />
            )}
        </span>
    );
}

export default Avatar;

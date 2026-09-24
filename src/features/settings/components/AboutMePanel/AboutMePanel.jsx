import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "@/components/ui/Avatar/Avatar.jsx";
import Button from "@/components/ui/Button/Button.jsx";
import InputField from "@/components/ui/Input/InputField.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { useToast } from "@/hooks/useToast.jsx";
import { updateUserProfile } from "@/features/chat/services/userService.js";
import { processAvatarImage } from "../../utils/processAvatarImage.js";
import { usernameValidation } from "@/utils/validation.js";
import { ROUTES } from "@/routes/paths.js";
import "./AboutMePanel.css";

/*
 ? AboutMePanel Component

 * The "About Me" tab of Settings: a profile header (avatar, live name
 * preview, status message, location) plus a Personal Information card and
 * a Location card. A single whole-panel edit mode toggles every field
 * between plain view text and InputFields — simpler and more reliable
 * than editing fields independently.

 * Setup mode: if the profile isn't completed yet (profile.profileCompleted
 * !== true, including "no profile doc at all"), the panel opens already in
 * edit mode, shows a "complete your profile" banner, has no Cancel (there's
 * nothing to cancel back to), labels the save button "Save & continue", and
 * navigates to chat on success. Landing here in the first place is a
 * one-time thing decided by SignUpForm's success handler (navigate to
 * ROUTES.settings right after account creation) — not an ongoing route
 * gate, so an existing/legacy account without profileCompleted: true is
 * never bounced back here against their will; setup mode just reflects
 * whichever page they're actually on.

 * Photo: "Change Photo" opens a hidden file input; the picked image is
 * cropped/resized/compressed client-side into a small JPEG data URL (see
 * processAvatarImage) and shown immediately via local `photoPreview` state
 * — no Firebase Storage involved, the data URL is what actually gets saved
 * into users/{uid}.photoURL. Picking a photo or clicking "Remove" both
 * enter edit mode automatically (if not already in it), since there'd be
 * no Save button to persist the change otherwise. The Avatar here reads
 * `photoPreview`, which is seeded from profile.photoURL (Firestore), never
 * from the Auth user object — see updateUserProfile's comment for why.

 * Props:
   - None (reads everything from useAuth())
*/

function FieldView({ label, value, full = false }) {
    return (
        <div className={`settings-field settings-field-view${full ? " settings-field-full" : ""}`}>
            <span className="settings-field-label">{label}</span>
            <span className="settings-field-value">{value || "—"}</span>
        </div>
    );
}

function AboutMePanel() {
    const { user, profile, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();

    // Frozen at mount, not recomputed on every render: once a setup-mode
    // save succeeds, the realtime `profile` subscription pushes
    // profileCompleted: true within this same component's lifetime (it's
    // still mounted for the ~1.5s before the setup-mode navigate below), and
    // a live isSetupMode would flip mid-flight — relabeling the Save button
    // and popping a Cancel button back in right before navigating away.
    const [isSetupMode] = useState(() => !profile || profile.profileCompleted !== true);

    const [isEditing, setIsEditing] = useState(isSetupMode);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

    const [firstName, setFirstName] = useState(profile?.firstName ?? "");
    const [lastName, setLastName] = useState(profile?.lastName ?? "");
    const [username, setUsername] = useState(profile?.username ?? "");
    const [phone, setPhone] = useState(profile?.phone ?? "");
    const [bio, setBio] = useState(profile?.bio ?? "");
    const [statusMessage, setStatusMessage] = useState(profile?.statusMessage ?? "");
    const [country, setCountry] = useState(profile?.country ?? "");
    const [city, setCity] = useState(profile?.city ?? "");
    // Seeded from the Firestore profile, not the Auth user — see the file
    // header comment above for why.
    const [photoPreview, setPhotoPreview] = useState(profile?.photoURL ?? null);

    const fileInputRef = useRef(null);

    const previewName = `${firstName} ${lastName}`.trim() || profile?.name || user?.displayName || "Your profile";
    const previewLocation = [city.trim(), country.trim()].filter(Boolean).join(", ");

    // Recomputed on every render (cheap, pure) rather than on-change only —
    // usernameValidation itself lowercases/trims, so this stays correct
    // however `username` got set (typed, or reset from the profile).
    const usernameCheck = usernameValidation(username);

    const handleUsernameChange = (e) => {
        // Auto-lowercase as the user types — usernames are always stored
        // lowercased (see userService.js's doc shape comment).
        setUsername(e.target.value.toLowerCase());
    };

    const resetFieldsFromProfile = () => {
        setFirstName(profile?.firstName ?? "");
        setLastName(profile?.lastName ?? "");
        setUsername(profile?.username ?? "");
        setPhone(profile?.phone ?? "");
        setBio(profile?.bio ?? "");
        setStatusMessage(profile?.statusMessage ?? "");
        setCountry(profile?.country ?? "");
        setCity(profile?.city ?? "");
        setPhotoPreview(profile?.photoURL ?? null);
    };

    const handleEdit = () => setIsEditing(true);

    const handleCancel = () => {
        resetFieldsFromProfile();
        setIsEditing(false);
    };

    const handleChangePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        // Reset so picking the exact same file again still fires onChange.
        e.target.value = "";
        if (!file) return;

        setIsProcessingPhoto(true);
        try {
            const dataUrl = await processAvatarImage(file);
            setPhotoPreview(dataUrl);
            setIsEditing(true); // otherwise there's no Save button to persist this
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setIsProcessingPhoto(false);
        }
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setIsEditing(true); // same reasoning as above
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!firstName.trim() && !lastName.trim()) {
            showToast("Please enter your first or last name.", "error");
            return;
        }

        if (!usernameCheck.isValid) {
            showToast(usernameCheck.error, "error");
            return;
        }

        setIsSaving(true);
        try {
            await updateUserProfile(user.uid, {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                username: username.trim().toLowerCase(),
                phone: phone.trim(),
                bio: bio.trim(),
                statusMessage: statusMessage.trim(),
                country: country.trim(),
                city: city.trim(),
                // `?? null`, not just `photoPreview`, on purpose: after
                // "Remove" this is already strictly null, but coercing here
                // too guarantees it can never go through as `undefined` —
                // updateUserProfile's setDoc({ merge: true }) needs an
                // explicit null to actually clear the field in Firestore;
                // an undefined value would either throw or (depending on
                // Firestore SDK config) get silently dropped from the
                // write, leaving the old photo in place.
                photoURL: photoPreview ?? null,
            });
            await refreshUser();
            showToast(isSetupMode ? "Profile saved!" : "Profile updated!", "success");

            if (isSetupMode) {
                setTimeout(() => navigate(ROUTES.chat), 1500);
            } else {
                setIsEditing(false);
            }
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="about-me-panel">
            {isSetupMode && (
                <div className="about-me-setup-banner">
                    <h2>Complete your profile to get started</h2>
                    <p>Add a few details so your contacts know who they're chatting with.</p>
                </div>
            )}

            <form onSubmit={handleSave}>
                <div className="settings-card profile-header-card">
                    <Avatar src={photoPreview} alt={previewName} size="xl" />

                    <div className="profile-header-info">
                        <h2 className="profile-header-name">{previewName}</h2>

                        {isEditing ? (
                            <InputField
                                className="profile-header-status-field"
                                name="statusMessage"
                                value={statusMessage}
                                change={(e) => setStatusMessage(e.target.value)}
                                placeholder="Online / Busy / ..."
                            />
                        ) : (
                            statusMessage && <p className="profile-header-status">{statusMessage}</p>
                        )}

                        {previewLocation && <p className="profile-header-location">{previewLocation}</p>}
                    </div>

                    <div className="profile-header-actions">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            hidden
                        />
                        <Button
                            type="button"
                            className="settings-btn settings-btn-outline"
                            onClick={handleChangePhotoClick}
                            disabled={isProcessingPhoto}
                        >
                            {isProcessingPhoto ? "Processing..." : "Change Photo"}
                        </Button>
                        <Button
                            type="button"
                            className="settings-btn settings-btn-plain"
                            onClick={handleRemovePhoto}
                            disabled={isProcessingPhoto || !photoPreview}
                        >
                            Remove
                        </Button>
                        {!isSetupMode && !isEditing && (
                            <Button
                                type="button"
                                className="settings-btn settings-btn-outline profile-header-edit-btn"
                                onClick={handleEdit}
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                </div>

                <div className="settings-card">
                    <h3 className="settings-card-title">Personal Information</h3>
                    <div className="settings-grid">
                        {isEditing ? (
                            <>
                                <InputField
                                    className="settings-field"
                                    label="First Name"
                                    name="firstName"
                                    value={firstName}
                                    change={(e) => setFirstName(e.target.value)}
                                    placeholder="First name"
                                />
                                <InputField
                                    className="settings-field"
                                    label="Last Name"
                                    name="lastName"
                                    value={lastName}
                                    change={(e) => setLastName(e.target.value)}
                                    placeholder="Last name"
                                />
                                <InputField
                                    className="settings-field"
                                    label="Username"
                                    name="username"
                                    value={username}
                                    change={handleUsernameChange}
                                    placeholder="e.g. jane.doe"
                                    error={usernameCheck.error}
                                    isValid={usernameCheck.isValid}
                                />
                                <div className="settings-field settings-field-view">
                                    <span className="settings-field-label">Email</span>
                                    <span className="settings-field-value">{user?.email}</span>
                                </div>
                                <InputField
                                    className="settings-field"
                                    label="Phone"
                                    name="phone"
                                    value={phone}
                                    change={(e) => setPhone(e.target.value)}
                                    placeholder="Phone number"
                                />
                                <label className="settings-field settings-field-full">
                                    <span className="settings-field-label">Bio</span>
                                    <textarea
                                        className="settings-textarea"
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="A short bio"
                                        rows={3}
                                    />
                                </label>
                            </>
                        ) : (
                            <>
                                <FieldView label="First Name" value={firstName} />
                                <FieldView label="Last Name" value={lastName} />
                                <FieldView label="Username" value={username ? `@${username}` : ""} />
                                <FieldView label="Email" value={user?.email} />
                                <FieldView label="Phone" value={phone} />
                                <FieldView label="Bio" value={bio} full />
                            </>
                        )}
                    </div>
                </div>

                <div className="settings-card">
                    <h3 className="settings-card-title">Location</h3>
                    <div className="settings-grid">
                        {isEditing ? (
                            <>
                                <InputField
                                    className="settings-field"
                                    label="Country"
                                    name="country"
                                    value={country}
                                    change={(e) => setCountry(e.target.value)}
                                    placeholder="Country"
                                />
                                <InputField
                                    className="settings-field"
                                    label="City"
                                    name="city"
                                    value={city}
                                    change={(e) => setCity(e.target.value)}
                                    placeholder="City"
                                />
                            </>
                        ) : (
                            <>
                                <FieldView label="Country" value={country} />
                                <FieldView label="City" value={city} />
                            </>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="settings-actions">
                        {!isSetupMode && (
                            <Button
                                type="button"
                                className="settings-btn settings-btn-outline"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" className="settings-btn settings-btn-solid" disabled={isSaving}>
                            {isSaving ? "Saving..." : isSetupMode ? "Save & continue" : "Save changes"}
                        </Button>
                    </div>
                )}
            </form>

            <ToastContainer />
        </div>
    );
}

export default AboutMePanel;

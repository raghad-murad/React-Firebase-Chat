/*
 ? Avatar image processing

 * Turns a picked File into a small, self-contained JPEG data URL suitable
 * for storing directly in a Firestore field (no Firebase Storage needed).
 * Center-crops to a square, downscales to at most 256x256 (never upscales
 * a smaller source image), and compresses until the resulting data URL
 * string is under ~200KB or quality bottoms out.

 * IMPORTANT: the returned data URL is meant for Firestore's users/{uid}.photoURL
 * only. Never pass it to Firebase Auth's updateProfile({ photoURL }) — Auth
 * enforces a much shorter length limit on that field and will reject it.
*/

const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024; // ~5MB, before any processing
const MAX_OUTPUT_SIZE = 256; // px, square
const MAX_DATA_URL_LENGTH = 200_000; // ~200KB of the final data URL string
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.1;

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Couldn't read that image file."));
        };
        img.src = objectUrl;
    });
}

/**
 * @param {File} file
 * @returns {Promise<string>} a JPEG data URL, cropped/resized/compressed as described above
 * @throws {Error} with a user-facing message if the file isn't an image or is too large
 */
export async function processAvatarImage(file) {
    if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
        throw new Error("That image is too large — please choose one under 5MB.");
    }

    const img = await loadImageFromFile(file);

    // Center-crop to a square using the shorter side, then scale (down
    // only) to MAX_OUTPUT_SIZE.
    const cropSize = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - cropSize) / 2;
    const sy = (img.naturalHeight - cropSize) / 2;
    const outputSize = Math.min(cropSize, MAX_OUTPUT_SIZE);

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

    let quality = INITIAL_QUALITY;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
        dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    return dataUrl;
}

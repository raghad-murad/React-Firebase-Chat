/*
 ? Attachment image processing

 * Turns a picked image File into a self-contained JPEG data URL suitable
 * for storing directly in a Firestore message field (no Firebase Storage
 * involved — see messageService.sendAttachmentMessage, which enforces the
 * hard size cap this is meant to get under). Downscales to at most
 * MAX_DIMENSION on the longest side (preserving aspect ratio — unlike
 * settings/utils/processAvatarImage.js, this does NOT crop to a square;
 * chat photos should look like what was actually sent), then steps JPEG
 * quality down until the resulting data URL string fits
 * MAX_DATA_URL_LENGTH or quality bottoms out.
*/

const MAX_DIMENSION = 1280; // px, longest side, never upscales a smaller source
const MAX_DATA_URL_LENGTH = 700 * 1024; // ~700KB of the final data URL string
const INITIAL_QUALITY = 0.85;
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
 * @returns {Promise<string>} a JPEG data URL, downscaled/compressed as described above
 * @throws {Error} with a user-facing message if the file isn't readable as an image
 */
export async function processAttachmentImage(file) {
    const img = await loadImageFromFile(file);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const outputWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const outputHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

    let quality = INITIAL_QUALITY;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
        dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    return dataUrl;
}

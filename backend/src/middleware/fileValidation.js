/**
 * File validation middleware & utility.
 * Enforces magic-byte signature validation (JPEG, PNG, WebP)
 * and polyglot detection (<script, <?php, <html, etc.).
 */

const DANGEROUS_PATTERNS = [
  "<script",
  "<?php",
  "<html",
  "javascript:",
  "onload=",
  "onerror=",
  "<svg",
];

/**
 * Validates an image buffer by inspecting its magic byte signature
 * and screening for polyglot script payloads.
 *
 * @param {Buffer} buffer - Raw file buffer
 * @returns {{ valid: boolean, mime?: string, ext?: string, error?: string }}
 */
export function validateImageBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return { valid: false, error: "Invalid or empty image buffer" };
  }

  // 1. Check Magic Bytes
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (!isJpeg && !isPng && !isWebp) {
    return {
      valid: false,
      error: "File signature does not match allowed image formats (JPEG, PNG, WebP)",
    };
  }

  // 2. Reject Polyglot Payloads containing active script tags
  const headerSlice = buffer
    .subarray(0, Math.min(buffer.length, 4096))
    .toString("latin1")
    .toLowerCase();

  for (const pattern of DANGEROUS_PATTERNS) {
    if (headerSlice.includes(pattern)) {
      return {
        valid: false,
        error: "Malicious polyglot payload detected",
      };
    }
  }

  const mime = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp";
  const ext = isJpeg ? "jpg" : isPng ? "png" : "webp";

  return { valid: true, mime, ext };
}

/**
 * Express middleware to validate req.file after multer.
 */
export function validateUploadedImage(req, res, next) {
  if (!req.file) {
    return next();
  }

  const result = validateImageBuffer(req.file.buffer);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  req.file.mimetype = result.mime;
  req.file.validatedExt = result.ext;
  next();
}

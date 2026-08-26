/**
 * Extracts GPS latitude and longitude from image EXIF metadata if present.
 * Uses `exifr` parser in browser.
 *
 * @param {File|Blob} file - The uploaded image file
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
export async function extractGPS(file) {
  if (!file) return null;

  try {
    const exifrMod = await import("exifr");
    const parseGps = exifrMod.gps || exifrMod.default?.gps || (typeof exifrMod.default === "function" ? exifrMod.default : null);
    if (!parseGps) return null;

    const gps = await parseGps(file);

    if (
      gps &&
      typeof gps.latitude === "number" &&
      typeof gps.longitude === "number" &&
      !isNaN(gps.latitude) &&
      !isNaN(gps.longitude)
    ) {
      return {
        latitude:  Number(gps.latitude.toFixed(6)),
        longitude: Number(gps.longitude.toFixed(6)),
      };
    }
    return null;
  } catch (_) {
    // Non-fatal: if EXIF parsing fails or format is unsupported, return null
    return null;
  }
}

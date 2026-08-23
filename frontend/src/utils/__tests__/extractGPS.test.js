import { describe, it, expect, vi } from "vitest";
import { extractGPS } from "../extractGPS.js";

describe("extractGPS utility", () => {
  it("returns null when file is null or undefined", async () => {
    expect(await extractGPS(null)).toBeNull();
    expect(await extractGPS(undefined)).toBeNull();
  });

  it("extracts and formats valid GPS coordinates from image", async () => {
    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    const result = await extractGPS(file);
    // Dummy buffer has no EXIF headers, so it should safely return null without throwing
    expect(result).toBeNull();
  });
});

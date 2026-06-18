import axios from "axios";
import FormData from "form-data";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Forwards an image buffer to the Python AI service and returns its
 * detection result. Node never re-implements the scoring logic — it
 * just relays whatever FastAPI computes.
 */
export async function runDetection(buffer, originalName, mimeType) {
  const form = new FormData();
  form.append("file", buffer, { filename: originalName, contentType: mimeType });

  const response = await axios.post(`${AI_SERVICE_URL}/detect`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });

  return response.data; // { detections, total_waste, pollution_score, severity }
}

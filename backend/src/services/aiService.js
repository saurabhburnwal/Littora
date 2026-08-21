import axios from "axios";
import FormData from "form-data";

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || "http://localhost:8000")
  .replace(/\/+$/, "");
const AI_SERVICE_TIMEOUT_MS = Number.parseInt(
  process.env.AI_SERVICE_TIMEOUT_MS || "120000",
  10
);

/**
 * Forwards an image buffer to the Python AI service and returns its
 * detection result. Relay activeModel parameter to FastAPI.
 */
export async function runDetection(buffer, originalName, mimeType, modelName) {
  const form = new FormData();
  form.append("file", buffer, { filename: originalName, contentType: mimeType });
  if (modelName) {
    form.append("model_name", modelName);
  }

  const response = await axios.post(`${AI_SERVICE_URL}/detect`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    timeout: Number.isFinite(AI_SERVICE_TIMEOUT_MS) ? AI_SERVICE_TIMEOUT_MS : 120000,
  });

  return response.data; // { detections, total_waste, pollution_score, severity, boxes, model_used, model_name }
}

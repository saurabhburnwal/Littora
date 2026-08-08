import axios from "axios";
import FormData from "form-data";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Forwards an image buffer to the Python AI service and returns its
 * detection result. Relay activeModel parameter to FastAPI.
 */
export async function runDetection(buffer, originalName, mimeType, modelName = "yolov8m") {
  const form = new FormData();
  form.append("file", buffer, { filename: originalName, contentType: mimeType });
  form.append("model_name", modelName);

  const response = await axios.post(`${AI_SERVICE_URL}/detect`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });

  return response.data; // { detections, total_waste, pollution_score, severity, boxes, model_used, model_name }
}

/**
 * Fetches available models list from Python AI Service
 */
export async function getAiServiceModels() {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/models`);
    return response.data?.models || [];
  } catch (err) {
    console.warn("Could not fetch models from AI Service:", err.message);
    return [];
  }
}

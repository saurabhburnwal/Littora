import "dotenv/config";
import axios from "axios";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

// Severity weights matching ai-service/severity.py
const WEIGHTS = {
  bottle: 2.0,
  can: 2.0,
  bag: 5.0,
  wrapper: 3.0,
};
const UNKNOWN_ITEM_WEIGHT = 1.0;

const SEVERITY_THRESHOLDS = [
  { max: 10.0, label: "Low" },
  { max: 30.0, label: "Moderate" },
  { max: 60.0, label: "High" },
  { max: Infinity, label: "Severe" },
];

function computeScore(detections) {
  if (!detections || Object.keys(detections).length === 0) {
    return { total_waste: 0, pollution_score: 0, severity: "Low" };
  }
  const total_waste = Object.values(detections).reduce((sum, c) => sum + Math.max(0, c), 0);
  const raw_score = Object.entries(detections).reduce((sum, [type, count]) => {
    const w = WEIGHTS[type.toLowerCase().trim()] ?? UNKNOWN_ITEM_WEIGHT;
    return sum + w * Math.max(0, count);
  }, 0);
  const pollution_score = Math.round(raw_score);
  const matched = SEVERITY_THRESHOLDS.find((t) => pollution_score <= t.max);
  const severity = matched ? matched.label : "Severe";
  return { total_waste, pollution_score, severity };
}

/**
 * Computes Intersection over Union (IoU) between two normalized boxes [xmin, ymin, xmax, ymax]
 */
function computeIoU(boxA, boxB) {
  const [x1A, y1A, x2A, y2A] = boxA;
  const [x1B, y1B, x2B, y2B] = boxB;

  const interX1 = Math.max(x1A, x1B);
  const interY1 = Math.max(y1A, y1B);
  const interX2 = Math.min(x2A, x2B);
  const interY2 = Math.min(y2A, y2B);

  const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
  const areaA = (x2A - x1A) * (y2A - y1A);
  const areaB = (x2B - x1B) * (y2B - y1B);
  const unionArea = areaA + areaB - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * Merges bounding boxes from YOLOv11m and YOLOv26s using IoU matching
 */
function mergeBoxes(boxes11, boxes26) {
  const merged = [];
  const used26 = new Set();

  for (const b11 of boxes11) {
    let bestMatchIdx = -1;
    let maxIoU = 0;

    for (let j = 0; j < boxes26.length; j++) {
      if (used26.has(j)) continue;
      const b26 = boxes26[j];
      if (b11.class_name?.toLowerCase() === b26.class_name?.toLowerCase()) {
        const iou = computeIoU(b11.box_normalized, b26.box_normalized);
        if (iou > maxIoU) {
          maxIoU = iou;
          bestMatchIdx = j;
        }
      }
    }

    if (bestMatchIdx >= 0 && maxIoU > 0.45) {
      // Overlapping match detected — merge and select higher confidence
      used26.add(bestMatchIdx);
      const b26 = boxes26[bestMatchIdx];
      const higherConfBox = b11.confidence >= b26.confidence ? b11 : b26;
      merged.push({
        class_name: higherConfBox.class_name,
        confidence: Math.max(b11.confidence, b26.confidence),
        box: higherConfBox.box,
        box_normalized: higherConfBox.box_normalized,
        models: ["yolov11m", "yolov26s"],
      });
    } else {
      // Unique detection from yolov11m
      merged.push({
        ...b11,
        models: ["yolov11m"],
      });
    }
  }

  // Include any remaining unique detections from yolov26s
  for (let j = 0; j < boxes26.length; j++) {
    if (!used26.has(j)) {
      merged.push({
        ...boxes26[j],
        models: ["yolov26s"],
      });
    }
  }

  return merged;
}

async function runEnsembleCombination() {
  console.log("=== MULTI-MODEL ENSEMBLE FUSION (YOLOv11m + YOLOv26s) ===");
  console.log("Fetching analyses from Supabase...");

  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, image_url, severity, total_waste, created_at, location_id")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching analyses:", error);
    process.exit(1);
  }

  console.log(`Processing ${analyses.length} images for ensemble fusion...\n`);

  for (let i = 0; i < analyses.length; i++) {
    const row = analyses[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`[${i + 1}/${analyses.length}] Analysis ID: ${row.id}`);
    console.log(`Image URL: ${row.image_url}`);

    try {
      // 1. Download image
      const imgRes = await axios.get(row.image_url, { responseType: "arraybuffer", timeout: 30000 });
      const imageBuffer = Buffer.from(imgRes.data);
      const urlParts = row.image_url.split("/");
      const filename = urlParts[urlParts.length - 1] || "image.jpg";
      const mimeType = filename.endsWith(".png") ? "image/png" : filename.endsWith(".webp") ? "image/webp" : "image/jpeg";

      // 2. Inference on YOLOv11m
      const fd11 = new FormData();
      fd11.append("file", imageBuffer, { filename, contentType: mimeType });
      fd11.append("model_name", "yolov11m");
      const res11 = (await axios.post(`${aiServiceUrl}/predict`, fd11, {
        headers: fd11.getHeaders(),
        timeout: 60000,
      })).data;

      // 3. Inference on YOLOv26s
      const fd26 = new FormData();
      fd26.append("file", imageBuffer, { filename, contentType: mimeType });
      fd26.append("model_name", "yolov26s");
      const res26 = (await axios.post(`${aiServiceUrl}/predict`, fd26, {
        headers: fd26.getHeaders(),
        timeout: 60000,
      })).data;

      const boxes11 = res11.boxes || [];
      const boxes26 = res26.boxes || [];

      console.log(`YOLOv11m detected: ${boxes11.length} boxes (waste: ${res11.total_waste})`);
      console.log(`YOLOv26s detected: ${boxes26.length} boxes (waste: ${res26.total_waste})`);

      // 4. Merge boxes with IoU fusion
      const combinedBoxes = mergeBoxes(boxes11, boxes26);

      // 5. Tally detections map from unified boxes
      const combinedDetections = {};
      for (const b of combinedBoxes) {
        const cls = b.class_name?.toLowerCase() || "other";
        combinedDetections[cls] = (combinedDetections[cls] || 0) + 1;
      }

      // 6. Recalculate score & severity
      const { total_waste, pollution_score, severity } = computeScore(combinedDetections);

      console.log(`Combined Fusion: ${combinedBoxes.length} boxes | total_waste: ${total_waste} | score: ${pollution_score} | severity: ${severity}`);
      console.log(`Detections:`, combinedDetections);

      // 7. Update analyses row in Supabase
      const { error: updateError } = await supabase
        .from("analyses")
        .update({
          boxes: combinedBoxes,
          total_waste,
          pollution_score,
          severity,
        })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Update failed for ${row.id}:`, updateError);
        continue;
      }

      // 8. Synchronize detections table child rows
      await supabase.from("detections").delete().eq("analysis_id", row.id);
      const detectionRows = Object.entries(combinedDetections).map(([waste_type, count]) => ({
        analysis_id: row.id,
        waste_type,
        count,
      }));

      if (detectionRows.length > 0) {
        const { error: detInsertError } = await supabase.from("detections").insert(detectionRows);
        if (detInsertError) console.error(`Error inserting detections for ${row.id}:`, detInsertError);
      }

      console.log(`✓ Analysis ${row.id} updated in Supabase.`);
    } catch (err) {
      console.error(`Error processing row ${row.id}:`, err.message);
    }
  }

  console.log("\n================================================================");
  console.log("Multi-Model Ensemble Fusion completed for all analyses!");
}

runEnsembleCombination();

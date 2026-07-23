import { Router } from "express";
import multer from "multer";

import { runDetection } from "../services/aiService.js";
import { uploadImage, saveAnalysis } from "../services/supabaseClient.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/analyze — multipart/form-data, field name "image"
// Optional extra fields: latitude, longitude, location_label (all nullable)
router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No image file provided (field name: image)" });
  }

  try {
    const { buffer, originalname, mimetype } = req.file;

    // Parse optional location fields — don't fail if absent
    const latitude      = req.body.latitude      ? parseFloat(req.body.latitude)  : null;
    const longitude     = req.body.longitude     ? parseFloat(req.body.longitude) : null;
    const locationLabel = req.body.location_label || null;

    // 1. Run inference (stateless call to the AI service)
    const result = await runDetection(buffer, originalname, mimetype);

    // 2. Persist the image to Supabase Storage
    const imageUrl = await uploadImage(buffer, originalname, mimetype);

    // 3. Write analysis + detections rows to Postgres
    const analysis = await saveAnalysis({
      imageUrl,
      totalWaste:     result.total_waste,
      pollutionScore: result.pollution_score,
      severity:       result.severity,
      detections:     result.detections,
      latitude,
      longitude,
      locationLabel,
    });

    // 4. Return the combined response React expects
    //    (existing fields unchanged; new location fields added)
    res.json({
      id:              analysis.id,
      image_url:       imageUrl,
      created_at:      analysis.created_at,
      detections:      result.detections,
      total_waste:     result.total_waste,
      pollution_score: result.pollution_score,
      severity:        result.severity,
      latitude:        analysis.latitude,
      longitude:       analysis.longitude,
      location_label:  analysis.location_label,
    });
  } catch (err) {
    console.error("Analyze failed:", err.message);
    res.status(500).json({ error: "Analysis failed", details: err.message });
  }
});

export default router;

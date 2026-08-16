import { Router } from "express";
import multer from "multer";

import { runDetection } from "../services/aiService.js";
import {
  supabase,
  uploadImage,
  saveAnalysis,
  getActiveSystemModel,
} from "../services/supabaseClient.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/analyze — multipart/form-data, field name "image"
// Optional extra fields: latitude, longitude, location_label (all nullable)
// Optional header: Authorization: Bearer <jwt>  → tags upload with user_id
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

    // Extract user_id from JWT if present (optional — upload works anonymously too)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const { data } = await supabase.auth.getUser(token);
        userId = data?.user?.id ?? null;
      } catch {
        // Non-fatal: upload still proceeds without user attribution
      }
    }

    // 1. Fetch current active AI model configured by Admin
    const activeModel = await getActiveSystemModel();

    // 2. Run inference using active model
    const result = await runDetection(buffer, originalname, mimetype, activeModel);

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
      userId,
    });

    // 4. Return the combined response React expects
    //    (existing fields unchanged; new location + user fields added)
    res.json({
      id:              analysis.id,
      image_url:       imageUrl,
      created_at:      analysis.created_at,
      detections:      result.detections,
      total_waste:     result.total_waste,
      pollution_score: result.pollution_score,
      severity:        result.severity,
      boxes:           result.boxes || [],
      latitude:        analysis.latitude,
      longitude:       analysis.longitude,
      location_label:  analysis.location_label,
      user_id:         analysis.user_id,
    });
  } catch (err) {
    console.error("Analyze failed:", err.message);
    res.status(500).json({ error: "Analysis failed", details: err.message });
  }
});

export default router;

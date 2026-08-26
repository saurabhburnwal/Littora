import { Router } from "express";
import multer from "multer";

import { runDetection } from "../services/aiService.js";
import {
  uploadImage,
  saveAnalysis,
  getActiveSystemModel,
} from "../services/supabaseClient.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    cb(null, allowed.includes(file.mimetype.toLowerCase()));
  },
});

const handleUpload = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError || err?.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File size exceeds 10MB limit" });
        }
        return res.status(400).json({ error: err.message || "Invalid multipart form data" });
      }
      return next(err);
    }
    next();
  });
};

// POST /api/analyze — multipart/form-data, field name "image"
// Optional extra fields: latitude, longitude, location_label (all nullable)
// Optional header: Authorization: Bearer <jwt>  → tags upload with user_id
router.post("/", optionalAuth, handleUpload, async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No image file provided (field name: image). Allowed formats: JPEG, PNG, WebP (max 10MB)" });
  }

  try {
    const { buffer, originalname, mimetype } = req.file;

    // Parse optional location fields with bounds checking
    const rawLat = req.body.latitude ? parseFloat(req.body.latitude) : null;
    const rawLng = req.body.longitude ? parseFloat(req.body.longitude) : null;
    const latitude = (rawLat !== null && !isNaN(rawLat) && rawLat >= -90 && rawLat <= 90) ? rawLat : null;
    const longitude = (rawLng !== null && !isNaN(rawLng) && rawLng >= -180 && rawLng <= 180) ? rawLng : null;
    const locationLabel = req.body.location_label?.trim() || null;
    const userId = req.user?.id ?? null;

    // 1. Fetch current active AI model configured by Admin
    const activeModel = await getActiveSystemModel();

    // 2. Run inference using active model
    const result = await runDetection(buffer, originalname, mimetype, activeModel);

    // 3. Persist the image to Supabase Storage
    const imageUrl = await uploadImage(buffer, originalname, mimetype);

    // 4. Write analysis + detections rows to Postgres
    const analysis = await saveAnalysis({
      imageUrl,
      totalWaste:     result.total_waste,
      pollutionScore: result.pollution_score,
      severity:       result.severity,
      detections:     result.detections,
      boxes:          result.boxes || [],
      latitude,
      longitude,
      locationLabel,
      userId,
      modelUsed: result.model_used || activeModel,
    });

    // 5. Return the combined response React expects
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

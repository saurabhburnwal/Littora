import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  AVAILABLE_MODELS,
  getActiveSystemModel,
  setActiveSystemModel,
} from "../services/supabaseClient.js";

const router = Router();

/**
 * GET /api/model
 * Returns active model ID, active model details, and available models list.
 * Accessible to all users (Admin, Member, Guest).
 */
router.get("/", async (req, res) => {
  try {
    const activeModelId = await getActiveSystemModel();
    const activeModelDetails =
      AVAILABLE_MODELS.find((m) => m.id === activeModelId) || AVAILABLE_MODELS[0];

    res.json({
      activeModel: activeModelId,
      activeModelDetails,
      availableModels: AVAILABLE_MODELS,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch model info", details: err.message });
  }
});

/**
 * POST /api/model
 * Sets system-wide active model.
 * Admin only (protected by requireAuth and requireAdmin).
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { modelId } = req.body;
  if (!modelId) {
    return res.status(400).json({ error: "modelId is required" });
  }

  try {
    const updatedId = await setActiveSystemModel(modelId);
    const updatedDetails =
      AVAILABLE_MODELS.find((m) => m.id === updatedId) || AVAILABLE_MODELS[0];

    res.json({
      message: "Active AI model updated system-wide successfully",
      activeModel: updatedId,
      activeModelDetails: updatedDetails,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

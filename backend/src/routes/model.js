import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  getAvailableAiModels,
  getActiveSystemModel,
  setActiveSystemModel,
} from "../services/supabaseClient.js";

const router = Router();

/**
 * GET /api/model
 * Returns active model ID, active model details, and available models list directly from Postgres database.
 * Accessible to all users (Admin, Member, Guest).
 */
router.get("/", async (_req, res) => {
  try {
    const availableModels = await getAvailableAiModels();
    const activeModelId = await getActiveSystemModel();
    const activeModelDetails =
      availableModels.find((m) => m.id === activeModelId) || availableModels[0];

    res.json({
      activeModel: activeModelId,
      activeModelDetails,
      availableModels,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch model info", details: err.message });
  }
});

/**
 * POST /api/model
 * Sets system-wide active model in Postgres.
 * Admin only (protected by requireAuth and requireAdmin).
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { modelId } = req.body;
  if (!modelId) {
    return res.status(400).json({ error: "modelId is required" });
  }

  try {
    const updatedId = await setActiveSystemModel(modelId);
    const availableModels = await getAvailableAiModels();
    const updatedDetails =
      availableModels.find((m) => m.id === updatedId) || availableModels[0];

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

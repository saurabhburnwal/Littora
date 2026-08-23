import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { listAllAnalysesAdmin, deleteAnalysis } from "../services/supabaseClient.js";

const router = Router();

/**
 * GET /api/admin/analyses
 * Requires: Authorization: Bearer <admin-jwt>
 * Returns ALL analyses (all users) for the admin dashboard.
 */
router.get("/analyses", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const analyses = await listAllAnalysesAdmin();
    res.json(analyses);
  } catch (err) {
    console.error("Admin analyses failed:", err.message);
    res.status(500).json({ error: "Could not fetch analyses", details: err.message });
  }
});

/**
 * DELETE /api/admin/analyses/:id
 * Requires: Authorization: Bearer <admin-jwt>
 * Deletes an analysis: DB rows (detections + analysis) + storage object.
 */
router.delete("/analyses/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Analysis ID is required" });
  }

  try {
    await deleteAnalysis(id);
    res.json({ message: "Analysis deleted successfully", id });
  } catch (err) {
    console.error("Delete analysis failed:", err.message);
    res.status(500).json({ error: "Could not delete analysis", details: err.message });
  }
});

export default router;

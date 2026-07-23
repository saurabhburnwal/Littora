import { Router } from "express";
import { getStats } from "../services/supabaseClient.js";

const router = Router();

// GET /api/stats — aggregated dashboard data
// Returns: totalAnalyses, totalWasteAllTime, avgScore, severityCounts,
//          aggregateDetections, locations (with coords), history (full list)
router.get("/", async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error("Stats failed:", err.message);
    res.status(500).json({ error: "Could not fetch stats", details: err.message });
  }
});

export default router;

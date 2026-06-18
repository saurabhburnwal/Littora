import { Router } from "express";
import { listAnalyses } from "../services/supabaseClient.js";

const router = Router();

// GET /api/analyses?limit=50&offset=0 — powers the Week 7 history/analytics view
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const analyses = await listAnalyses({ limit, offset });
    res.json(analyses);
  } catch (err) {
    console.error("Fetching analyses failed:", err.message);
    res.status(500).json({ error: "Could not fetch analyses", details: err.message });
  }
});

export default router;

import { Router } from "express";
import { requireAuth, getAdminEmail } from "../middleware/auth.js";
import { listAnalyses } from "../services/supabaseClient.js";

const router = Router();

// GET /api/analyses?limit=50&offset=0 — powers the Week 7 history/analytics view
router.get("/", requireAuth, async (req, res) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10);
    const rawOffset = parseInt(req.query.offset, 10);

    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const offset = !isNaN(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const adminEmail = getAdminEmail();
    const isAdmin = Boolean(req.user?.email && req.user.email.toLowerCase() === adminEmail);
    const userId = isAdmin ? (req.query.userId || null) : req.user?.id;

    const analyses = await listAnalyses({
      limit,
      offset,
      ...(userId ? { userId } : {}),
    });
    res.json(analyses);
  } catch (err) {
    console.error("Fetching analyses failed:", err.message);
    res.status(500).json({ error: "Could not fetch analyses" });
  }
});

export default router;

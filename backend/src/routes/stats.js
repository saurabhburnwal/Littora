import { Router } from "express";
import { getStats, supabase } from "../services/supabaseClient.js";

const router = Router();

// GET /api/stats — aggregated dashboard data
// Returns: totalAnalyses, totalWasteAllTime, avgScore, severityCounts,
//          aggregateDetections, locations (with coords), history (full list)
router.get("/", async (req, res) => {
  try {
    let userId = null;
    let isGuest = true;
    let isAdminUser = false;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        isGuest = false;
        const adminEmail = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@littora.app").toLowerCase();
        if (adminEmail && data.user.email?.toLowerCase() === adminEmail) {
          isAdminUser = true;
          userId = null; // Admin sees ALL user stats and all details
        } else {
          userId = data.user.id; // Regular user sees ONLY THEIR OWN stats and details
        }
      }
    }

    const stats = await getStats(userId);

    if (isGuest) {
      // Guests see 0 stats, no locations, and no history records
      return res.json({
        totalAnalyses: 0,
        totalWasteAllTime: 0,
        avgScore: 0,
        severityCounts: { Low: 0, Moderate: 0, High: 0, Severe: 0 },
        aggregateDetections: { bottle: 0, can: 0, bag: 0, wrapper: 0 },
        locations: [],
        history: [],
        isGuest: true,
        isAdmin: false,
      });
    }

    res.json({
      ...stats,
      isGuest: false,
      isAdmin: isAdminUser,
    });
  } catch (err) {
    console.error("Stats failed:", err.message);
    res.status(500).json({ error: "Could not fetch stats", details: err.message });
  }
});

export default router;

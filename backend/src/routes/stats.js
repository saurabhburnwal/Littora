import { Router } from "express";
import { getStats } from "../services/supabaseClient.js";
import { optionalAuth, getAdminEmail } from "../middleware/auth.js";

const router = Router();

// GET /api/stats — aggregated dashboard data
router.get("/", optionalAuth, async (req, res) => {
  try {
    const isGuest = !req.user;
    const adminEmail = getAdminEmail();
    const isAdminUser = Boolean(req.user?.email && req.user.email.toLowerCase() === adminEmail);
    const userId = (!isGuest && !isAdminUser) ? req.user.id : null;

    // 1. Fetch global platform stats (public locations, global totals, public history preview)
    const globalStats = await getStats(null);

    if (isGuest) {
      // Guests see global locations map and community totals
      return res.json({
        totalAnalyses:       globalStats.totalAnalyses,
        totalWasteAllTime:   globalStats.totalWasteAllTime,
        avgScore:            globalStats.avgScore,
        severityCounts:      globalStats.severityCounts,
        aggregateDetections: globalStats.aggregateDetections,
        locations:           globalStats.locations,
        history:             globalStats.history,
        wasteTypesCatalog:   globalStats.wasteTypesCatalog,
        locationsCatalog:    globalStats.locationsCatalog,
        isGuest:             true,
        isAdmin:             false,
      });
    }

    if (isAdminUser) {
      // Admin sees ALL user stats and all details
      return res.json({
        ...globalStats,
        isGuest: false,
        isAdmin: true,
      });
    }

    // Regular user sees their personal totals + global locations map & catalogs
    const userStats = await getStats(userId);
    return res.json({
      ...userStats,
      locations:         globalStats.locations,
      locationsCatalog:  globalStats.locationsCatalog,
      wasteTypesCatalog: globalStats.wasteTypesCatalog,
      isGuest:           false,
      isAdmin:           false,
    });
  } catch (err) {
    console.error("Stats failed:", err.message);
    res.status(500).json({ error: "Could not fetch stats", details: err.message });
  }
});

export default router;

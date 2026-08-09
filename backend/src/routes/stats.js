import { Router } from "express";
import { getStats, getWasteTypesCatalog, supabase } from "../services/supabaseClient.js";

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
      locations:         globalStats.locations, // Provide global map locations for rich map rendering
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

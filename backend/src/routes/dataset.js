import { Router } from "express";
import { requireAuth, getAdminEmail } from "../middleware/auth.js";
import { listAnalyses } from "../services/supabaseClient.js";

const router = Router();

/**
 * Helper to generate GeoJSON FeatureCollection from analysis records.
 */
function buildGeoJson(analyses) {
  const features = analyses
    .filter((a) => a.latitude != null && a.longitude != null)
    .map((a) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(a.longitude), Number(a.latitude)], // GeoJSON convention: [lon, lat]
      },
      properties: {
        id:              a.id,
        location:        a.location_label || "Unknown Beach",
        severity:        a.severity,
        pollution_score: a.pollution_score,
        total_waste:     a.total_waste,
        detections:      a.detections_map || {},
        boxes_count:     Array.isArray(a.boxes) ? a.boxes.length : 0,
        image_url:       a.image_url,
        scanned_at:      a.created_at,
      },
    }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Helper to generate CSV string from analysis records.
 */
function buildCsv(analyses) {
  const headers = [
    "id",
    "location",
    "latitude",
    "longitude",
    "severity",
    "pollution_score",
    "total_waste",
    "bottle",
    "can",
    "bag",
    "wrapper",
    "scanned_at",
  ];

  const rows = analyses.map((a) => {
    const det = a.detections_map || {};
    const escapedLocation = `"${(a.location_label || "").replace(/"/g, '""')}"`;
    return [
      a.id,
      escapedLocation,
      a.latitude ?? "",
      a.longitude ?? "",
      a.severity || "Low",
      a.pollution_score ?? 0,
      a.total_waste ?? 0,
      det.bottle ?? 0,
      det.can ?? 0,
      det.bag ?? 0,
      det.wrapper ?? 0,
      a.created_at || "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// Handler for GeoJSON export — scoped to user unless caller is admin
async function handleGeoJsonExport(req, res) {
  try {
    const adminEmail = getAdminEmail();
    const isAdmin = Boolean(req.user?.email && req.user.email.toLowerCase() === adminEmail);
    const userId = isAdmin ? null : req.user?.id;

    const analyses = await listAnalyses({
      limit: 1000,
      offset: 0,
      ...(userId ? { userId } : {}),
    });
    const geojson = buildGeoJson(analyses);

    res.setHeader("Content-Type", "application/geo+json");
    res.setHeader("Content-Disposition", "attachment; filename=littora_dataset.geojson");
    return res.json(geojson);
  } catch (err) {
    console.error("GeoJSON export failed:", err.message);
    return res.status(500).json({ error: "Failed to export GeoJSON dataset" });
  }
}

// Handler for CSV export — scoped to user unless caller is admin
async function handleCsvExport(req, res) {
  try {
    const adminEmail = getAdminEmail();
    const isAdmin = Boolean(req.user?.email && req.user.email.toLowerCase() === adminEmail);
    const userId = isAdmin ? null : req.user?.id;

    const analyses = await listAnalyses({
      limit: 1000,
      offset: 0,
      ...(userId ? { userId } : {}),
    });
    const csv = buildCsv(analyses);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=littora_dataset.csv");
    return res.send(csv);
  } catch (err) {
    console.error("CSV export failed:", err.message);
    return res.status(500).json({ error: "Failed to export CSV dataset" });
  }
}

// Routes with requireAuth protection
router.get("/dataset.geojson", requireAuth, handleGeoJsonExport);
router.get("/dataset/geojson", requireAuth, handleGeoJsonExport);
router.get("/dataset.csv",     requireAuth, handleCsvExport);
router.get("/dataset/csv",     requireAuth, handleCsvExport);

export default router;

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in backend environment");
}

if (!supabaseSecretKey) {
  throw new Error(
    "Missing Supabase secret key in backend environment. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_KEY."
  );
}

// Secret key — server-side only, never sent to the browser.
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  realtime: { transport: ws },
});

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "beach-waste-images";
const SUPPORTED_WASTE_TYPES = new Set(["bottle", "can", "bag", "wrapper"]);

/**
 * Sanitizes an image filename by stripping directory traversal sequences,
 * path separators, and non-safe characters.
 */
export function sanitizeFilename(originalName) {
  if (!originalName || typeof originalName !== "string") {
    return "image.jpg";
  }
  // Strip directory paths (forward and backward slashes)
  const baseName = originalName.split(/[/\\]/).pop() || "";
  // Strip null bytes and control chars
  const noControl = baseName.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
  // Replace path traversal patterns (e.g., '..'), and unsafe characters (keep alphanumeric, ., -, _)
  const sanitized = noControl
    .replace(/\.\.+/g, ".")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^[_.-]+/, "");

  return sanitized || "image.jpg";
}

/**
 * Uploads an image buffer to Supabase Storage and returns its public URL.
 */
export async function uploadImage(buffer, originalName, mimeType) {
  const safeName = sanitizeFilename(originalName);
  const fileName = `${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: mimeType });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Inserts an analysis row + one detections row per waste type.
 *
 * 5NF: Location facts (latitude, longitude, location_label) live exclusively in
 * public.locations. If coordinates are provided, we upsert into locations first
 * to get a location_id, then insert analyses with only location_id — no raw
 * coordinate columns on analyses.
 *
 * Returns the enriched row from public.vw_analysis_details (includes location JOIN).
 */
export async function saveAnalysis({
  imageUrl,
  totalWaste,
  pollutionScore,
  severity,
  detections,
  boxes,
  latitude,
  longitude,
  locationLabel,
  userId,
  modelUsed,
}) {
  const unsupportedWasteTypes = Object.keys(detections || {}).filter(
    (wasteType) => !SUPPORTED_WASTE_TYPES.has(String(wasteType).toLowerCase())
  );
  if (unsupportedWasteTypes.length > 0) {
    throw new Error(`Unsupported waste type(s): ${unsupportedWasteTypes.join(", ")}`);
  }

  const activeModelId = modelUsed || (await getActiveSystemModel());

  // 1. Resolve location_id — upsert into locations if coordinates are provided
  let locationId = null;
  if (latitude != null && longitude != null) {
    const label = locationLabel?.trim() ||
      `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;

    const { data: locData, error: locError } = await supabase
      .from("locations")
      .upsert(
        { location_label: label, latitude, longitude },
        { onConflict: "latitude,longitude" }
      )
      .select("id")
      .single();

    if (locError) throw locError;
    locationId = locData.id;
  }

  // 2. Insert analysis row — only location_id, no raw coordinate columns (5NF)
  const insertPayload = {
    image_url:       imageUrl,
    total_waste:     totalWaste,
    pollution_score: pollutionScore,
    severity,
    user_id:         userId      ?? null,
    model_used:      activeModelId || null,
    location_id:     locationId,
  };
  if (boxes && Array.isArray(boxes)) {
    insertPayload.boxes = boxes;
  }

  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .insert(insertPayload)
    .select()
    .single();

  if (analysisError) throw analysisError;

  // 3. Insert child detections rows with compensation rollback
  const detectionRows = Object.entries(detections || {}).map(([wasteType, count]) => ({
    analysis_id: analysis.id,
    waste_type:  String(wasteType).toLowerCase(),
    count,
  }));

  if (detectionRows.length > 0) {
    try {
      const { error: detectionsError } = await supabase
        .from("detections")
        .insert(detectionRows);

      if (detectionsError) {
        throw detectionsError;
      }
    } catch (err) {
      // Rollback created parent record so no orphaned analyses remain
      try {
        await supabase.from("analyses").delete().eq("id", analysis.id);
      } catch (cleanupErr) {
        console.error(`Failed to rollback orphaned analysis ${analysis.id}:`, cleanupErr.message);
      }
      throw err;
    }
  }

  // 4. Return enriched row from vw_analysis_details (includes location JOIN)
  const { data: enriched } = await supabase
    .from("vw_analysis_details")
    .select("*")
    .eq("id", analysis.id)
    .single();

  return enriched || analysis;
}

/**
 * Returns past analyses for a specific user (user-scoped gallery).
 * Includes detection sub-rows for each analysis.
 */
/**
 * Helper to ensure consistent structure for analysis rows retrieved from public.vw_analysis_details.
 * If row has detections_map (JSONB object), populates detections array for backward compatibility.
 */
function formatAnalysisRow(row) {
  if (!row) return row;
  if (row.detections_map && !row.detections) {
    const detections = Object.entries(row.detections_map).map(([waste_type, count]) => ({
      waste_type,
      count: Number(count),
    }));
    return { ...row, detections };
  }
  return row;
}

/**
 * Returns past analyses for a specific user (user-scoped gallery).
 * Includes detection details via consolidated database view public.vw_analysis_details.
 */
export async function listAnalysesByUser(userId, { limit = 100, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("vw_analysis_details")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ? data.map(formatAnalysisRow) : [];
}

/**
 * Returns ALL analyses (all users) for the admin dashboard.
 * Most recent first. Queries public.vw_analysis_details and enriches each row with the uploader's email
 * by batch-fetching user records from Supabase Auth admin API.
 */
export async function listAllAnalysesAdmin() {
  const { data, error } = await supabase
    .from("vw_analysis_details")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const adminEmail = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@littora.app").toLowerCase();
  const emailMap = {};
  const nameMap = {};

  try {
    if (typeof supabase.auth.admin?.listUsers === "function") {
      const { data: userData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (!listError && userData?.users) {
        for (const u of userData.users) {
          const userEmail = u.email ?? null;
          const rawName = u.user_metadata?.full_name?.trim();
          const isAppAdmin = userEmail?.toLowerCase() === adminEmail;
          emailMap[u.id] = userEmail;
          nameMap[u.id] = rawName || (isAppAdmin ? "Admin" : userEmail);
        }
      }
    } else if (typeof supabase.auth.admin?.getUserById === "function") {
      const uniqueUserIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          try {
            const { data: { user }, error: ue } = await supabase.auth.admin.getUserById(uid);
            if (!ue && user) {
              const userEmail = user.email ?? null;
              const rawName = user.user_metadata?.full_name?.trim();
              const isAppAdmin = userEmail?.toLowerCase() === adminEmail;
              emailMap[uid] = userEmail;
              nameMap[uid] = rawName || (isAppAdmin ? "Admin" : userEmail);
            }
          } catch (_) {}
        })
      );
    }
  } catch (_) {
    // non-fatal — leave email/name as null
  }

  return data.map((row) => {
    const formatted = formatAnalysisRow(row);
    return {
      ...formatted,
      user_email: row.user_id ? (emailMap[row.user_id] ?? null) : null,
      user_name:  row.user_id ? (nameMap[row.user_id] ?? null) : null,
    };
  });
}

/**
 * Deletes an analysis owned by a specific user.
 * Throws "Not found or not yours" if the row doesn't exist or belongs to another user.
 */
export async function deleteAnalysisForUser(id, userId) {
  // Verify ownership first
  const { data: analysis, error: fetchError } = await supabase
    .from("analyses")
    .select("id, image_url, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !analysis) throw new Error("Not found or not yours");
  if (analysis.user_id !== userId) throw new Error("Not found or not yours");

  // Reuse the shared delete logic
  await deleteAnalysis(id);
}

/**
 * Deletes a single analysis:
 * 1. Fetches the analysis to get the image_url.
 * 2. Deletes child detections rows.
 * 3. Deletes the analysis row.
 * 4. Removes the image from Supabase Storage.
 */
export async function deleteAnalysis(id) {
  // 1. Fetch the row so we know the image file name
  const { data: analysis, error: fetchError } = await supabase
    .from("analyses")
    .select("id, image_url")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;
  if (!analysis) throw new Error(`Analysis ${id} not found`);

  // 2. Delete detections (FK child rows)
  const { error: detectionsError } = await supabase
    .from("detections")
    .delete()
    .eq("analysis_id", id);

  if (detectionsError) throw detectionsError;

  // 3. Delete the analysis row
  const { error: analysisError } = await supabase
    .from("analyses")
    .delete()
    .eq("id", id);

  if (analysisError) throw analysisError;

  // 4. Remove from Storage (best-effort — don't fail delete if missing)
  if (analysis.image_url) {
    try {
      // Extract the file name from the public URL
      const urlParts = analysis.image_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from(BUCKET).remove([fileName]);
    } catch (storageErr) {
      console.warn("Storage cleanup warning (non-fatal):", storageErr.message);
    }
  }
}

/**
 * Returns past analyses, most recent first, for the history view.
 * Queries consolidated view public.vw_analysis_details.
 */
export async function listAnalyses({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("vw_analysis_details")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ? data.map(formatAnalysisRow) : [];
}

function formatSev(s) {
  if (!s) return "Low";
  const str = String(s).toLowerCase();
  if (str === "severe") return "Severe";
  if (str === "high") return "High";
  if (str === "moderate") return "Moderate";
  return "Low";
}

function parseLocationLabel(label = "") {
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  const beach = parts[0] || "Coastal Site";
  const city = parts.length >= 2 ? parts[1] : "";
  const country = parts.length > 2 ? parts[2] : parts.length === 2 ? parts[1] : "Coastal Region";
  return { beach, city, country };
}

const SEV_RANK = { low: 0, moderate: 1, high: 2, severe: 3 };

/**
 * Returns aggregated statistics for the dashboard:
 * - totals (analyses count, all-time waste, avg score)
 * - severity distribution
 * - per-waste-type totals across ALL analyses
 * - geolocated entries for the pollution map
 * - full history list for trend charts and the history table
 *
 * Queries consolidated view public.vw_analysis_details.
 */
export async function getStats(userId = null) {
  // Query public.vw_analysis_details — the single source of truth after 5NF conversion.
  // Location data (latitude, longitude, location_label) is joined from public.locations;
  // raw coordinate columns no longer exist on public.analyses.
  let viewQuery = supabase
    .from("vw_analysis_details")
    .select("*")
    .order("created_at", { ascending: true }); // chronological — reversed below for table

  if (userId) {
    viewQuery = viewQuery.eq("user_id", userId);
  }

  const { data, error: viewError } = await viewQuery;

  if (viewError || !data) {
    console.error("getStats query error:", viewError?.message);
    throw viewError;
  }

  const totalAnalyses = data.length;
  const totalWasteAllTime = data.reduce((s, r) => s + (r.total_waste || 0), 0);
  const avgScore = totalAnalyses
    ? Math.round(
        data.reduce((s, r) => s + (r.pollution_score || 0), 0) / totalAnalyses
      )
    : 0;

  const severityCounts = { Low: 0, Moderate: 0, High: 0, Severe: 0 };
  const aggregateDetections = {};

  for (const row of data) {
    const normSev = formatSev(row.severity);
    severityCounts[normSev]++;

    if (row.detections_map && typeof row.detections_map === "object") {
      for (const [wasteType, count] of Object.entries(row.detections_map)) {
        const type = (wasteType || "other").toLowerCase();
        aggregateDetections[type] = (aggregateDetections[type] || 0) + Number(count || 1);
      }
    } else if (Array.isArray(row.detections)) {
      for (const d of row.detections) {
        const type = (d.waste_type || "other").toLowerCase();
        const count = Number(d.count || 1);
        aggregateDetections[type] = (aggregateDetections[type] || 0) + count;
      }
    }
  }

  // Group all analyses by their location_id (or lat,lng) so multiple detections per beach are combined
  const locationGroupMap = new Map();

  for (const r of data) {
    if (r.latitude == null || r.longitude == null) continue;
    const key = r.location_id || `${Number(r.latitude).toFixed(4)},${Number(r.longitude).toFixed(4)}`;
    const { beach, city, country } = parseLocationLabel(r.location_label);
    const rowSev = formatSev(r.severity);
    const rowScore = Number(r.pollution_score || 0);
    const rowWaste = Number(r.total_waste || 0);

    if (!locationGroupMap.has(key)) {
      locationGroupMap.set(key, {
        id:              r.location_id || r.id,
        location_id:     r.location_id,
        latitude:        r.latitude,
        longitude:       r.longitude,
        location_label:  r.location_label,
        locationLabel:   r.location_label,
        beach,
        city,
        country,
        pollution_scores: [],
        total_waste:     0,
        // worst_severity: all-time highest severity → drives map pin colour
        worst_severity:  rowSev,
        // peak_scan: the single scan with the highest pollution_score.
        // This is what the map pin colour represents, so popup & lightbox
        // must show this scan's image, boxes, score and severity.
        peak_scan: {
          created_at:      r.created_at,
          image_url:       r.image_url,
          boxes:           r.boxes || [],
          severity:        rowSev,
          pollution_score: rowScore,
          total_waste:     rowWaste,
          detections:      {},
        },
        detections:      {},
        scan_count:      0,
        scans:           [],
      });
    }

    const group = locationGroupMap.get(key);
    group.total_waste += rowWaste;
    group.pollution_scores.push(rowScore);
    group.scan_count += 1;

    // Accumulate aggregate detections (kept for any future analytics usage)
    if (r.detections_map && typeof r.detections_map === "object") {
      Object.entries(r.detections_map).forEach(([type, count]) => {
        const k = type.toLowerCase();
        group.detections[k] = (group.detections[k] || 0) + Number(count || 1);
      });
    } else if (Array.isArray(r.detections)) {
      r.detections.forEach((d) => {
        if (d && d.waste_type) {
          const k = d.waste_type.toLowerCase();
          group.detections[k] = (group.detections[k] || 0) + Number(d.count || 1);
        }
      });
    }

    // Update worst_severity for map pin colour
    const currentWorstRank = SEV_RANK[group.worst_severity.toLowerCase()] ?? 0;
    const newRank = SEV_RANK[rowSev.toLowerCase()] ?? 0;
    if (newRank > currentWorstRank) {
      group.worst_severity = rowSev;
    }

    // Update peak_scan if this row has a higher pollution score.
    // Tie-break: prefer the more recent scan so we don't show a stale image
    // when two scans have identical scores.
    const isPeakByScore  = rowScore > group.peak_scan.pollution_score;
    const isTiebreakNewer = rowScore === group.peak_scan.pollution_score &&
      new Date(r.created_at) > new Date(group.peak_scan.created_at);

    if (isPeakByScore || isTiebreakNewer) {
      // Build this scan's own detections map (not aggregated)
      const scanDetections = {};
      if (r.detections_map && typeof r.detections_map === "object") {
        Object.entries(r.detections_map).forEach(([type, count]) => {
          scanDetections[type.toLowerCase()] = Number(count || 1);
        });
      } else if (Array.isArray(r.detections)) {
        r.detections.forEach((d) => {
          if (d && d.waste_type) {
            scanDetections[d.waste_type.toLowerCase()] = Number(d.count || 1);
          }
        });
      }
      group.peak_scan = {
        created_at:      r.created_at,
        image_url:       r.image_url,
        boxes:           r.boxes || [],
        severity:        rowSev,
        pollution_score: rowScore,
        total_waste:     rowWaste,
        detections:      scanDetections,
      };
    }

    group.scans.push({
      id: r.id,
      created_at: r.created_at,
      severity: rowSev,
      pollution_score: rowScore,
      total_waste: rowWaste,
      image_url: r.image_url,
      boxes: r.boxes || [],
    });
  }

  const locations = Array.from(locationGroupMap.values()).map((g) => {
    const avgScore = g.pollution_scores.length
      ? Math.round(g.pollution_scores.reduce((sum, s) => sum + s, 0) / g.pollution_scores.length)
      : 0;
    const ps = g.peak_scan;  // the single scan that earned the map pin colour
    return {
      id:              g.id,
      location_id:     g.location_id,
      latitude:        g.latitude,
      longitude:       g.longitude,
      location_label:  g.location_label,
      locationLabel:   g.location_label,
      beach:           g.beach,
      city:            g.city,
      country:         g.country,
      // avg score across all scans shown in the popup stats bar
      pollution_score: avgScore,
      pollutionScore:  avgScore,
      // worst severity drives the map pin colour
      severity:        g.worst_severity,
      // cumulative totals
      total_waste:     g.total_waste,
      totalWaste:      g.total_waste,
      // aggregate detections
      detections:      g.detections,
      scan_count:      g.scan_count,
      scans:           g.scans,
      // peak_scan: the scan with the highest pollution_score.
      // The popup thumbnail, badge, items, score AND the lightbox all
      // use this so everything is internally consistent.
      peak_scan: {
        created_at:      ps.created_at,
        image_url:       ps.image_url,
        boxes:           ps.boxes,
        severity:        ps.severity,
        pollution_score: ps.pollution_score,
        total_waste:     ps.total_waste,
        detections:      ps.detections,
      },
      // top-level image/boxes/created_at come from peak_scan for the Popup thumbnail
      image_url:       ps.image_url,
      boxes:           ps.boxes,
      created_at:      ps.created_at,
    };
  });

  // Reverse to newest-first for the history table
  const history = data.map(formatAnalysisRow).reverse();

  // Fetch waste types catalog and locations catalog directly from Postgres concurrently
  const [wasteTypesCatalog, locationsCatalog] = await Promise.all([
    getWasteTypesCatalog(),
    getLocationsCatalog(),
  ]);

  // If user has no scan locations yet, populate map locations from locationsCatalog so map and cleanup page render beach hotspots
  const displayLocations = locations.length > 0 ? locations : locationsCatalog.map((loc) => {
    const { beach, city, country } = parseLocationLabel(loc.location_label);
    return {
      id:              loc.id,
      location_id:     loc.id,
      latitude:        loc.latitude,
      longitude:       loc.longitude,
      location_label:  loc.location_label,
      locationLabel:   loc.location_label,
      beach,
      city,
      country,
      pollution_score: 15,
      pollutionScore:  15,
      severity:        "Low",
      created_at:      loc.created_at,
      total_waste:     0,
      totalWaste:      0,
      detections:      {},
      scan_count:      0,
      scans:           [],
    };
  });

  return {
    totalAnalyses,
    totalWasteAllTime,
    avgScore,
    severityCounts,
    aggregateDetections,
    locations: displayLocations,
    history,
    wasteTypesCatalog,
    locationsCatalog,
  };
}

/**
 * Fetches waste type definitions & recyclability metadata directly from public.waste_types in Postgres.
 */
export async function getWasteTypesCatalog() {
  try {
    const { data, error } = await supabase
      .from("waste_types")
      .select("id, name, category, is_recyclable, color_hex")
      .eq("is_active", true)
      .order("category", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch (_) {
    return [];
  }
}

/**
 * Fetches locations catalog directly from public.locations in Postgres.
 */
export async function getLocationsCatalog() {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("id, location_label, latitude, longitude, created_at")
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch (_) {
    return [];
  }
}

/**
 * Fetches available AI models directly from public.ai_models in Postgres.
 */
export async function getAvailableAiModels() {
  try {
    const { data, error } = await supabase
      .from("ai_models")
      .select("id, name, tag, architecture, params, description, badge, is_active")
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch (_) {
    return [];
  }
}

/**
 * Returns the currently active AI model ID configured by the Admin directly from Postgres.
 */
export async function getActiveSystemModel() {
  try {
    const { data: activeModel, error: modelError } = await supabase
      .from("ai_models")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!modelError && activeModel?.id) {
      return activeModel.id;
    }
  } catch (_) {}

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "active_ai_model")
      .single();

    if (!error && data?.value) {
      return data.value;
    }
  } catch (_) {}

  return "yolov11m";
}

/**
 * Sets the system-wide active AI model ID in Postgres (Admin only).
 */
export async function setActiveSystemModel(modelId) {
  const models = await getAvailableAiModels();
  const isValid = models.some((m) => m.id === modelId);
  if (!isValid) {
    throw new Error(`Invalid model ID: ${modelId}`);
  }

  // 1. Synchronize active state directly in ai_models using valid WHERE filters
  const { error: deactivateError } = await supabase
    .from("ai_models")
    .update({ is_active: false })
    .neq("id", modelId);

  if (deactivateError) throw deactivateError;

  const { error: activateError } = await supabase
    .from("ai_models")
    .update({ is_active: true })
    .eq("id", modelId);

  if (activateError) throw activateError;

  // 2. Best-effort update to system_settings configuration table
  try {
    await supabase
      .from("system_settings")
      .upsert({ key: "active_ai_model", value: modelId, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } catch (_) {
    // Non-fatal: ai_models.is_active is synchronized and acts as source of truth
  }

  return modelId;
}

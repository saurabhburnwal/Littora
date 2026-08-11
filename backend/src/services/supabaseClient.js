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

/**
 * Uploads an image buffer to Supabase Storage and returns its public URL.
 */
export async function uploadImage(buffer, originalName, mimeType) {
  const fileName = `${Date.now()}-${originalName}`;

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
  latitude,
  longitude,
  locationLabel,
  userId,
  modelUsed,
}) {
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
  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .insert({
      image_url:       imageUrl,
      total_waste:     totalWaste,
      pollution_score: pollutionScore,
      severity,
      user_id:         userId      ?? null,
      model_used:      activeModelId || null,
      location_id:     locationId,
    })
    .select()
    .single();

  if (analysisError) throw analysisError;

  // 3. Insert child detections rows
  const detectionRows = Object.entries(detections).map(([wasteType, count]) => ({
    analysis_id: analysis.id,
    waste_type:  wasteType,
    count,
  }));

  if (detectionRows.length > 0) {
    const { error: detectionsError } = await supabase
      .from("detections")
      .insert(detectionRows);
    if (detectionsError) throw detectionsError;
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

  // Collect unique user IDs and fetch their emails/names from Auth in parallel
  const uniqueUserIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
  const adminEmail = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@littora.app").toLowerCase();
  const emailMap = {};
  const nameMap = {};

  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      try {
        const { data: { user }, error: ue } = await supabase.auth.admin.getUserById(uid);
        if (!ue && user) {
          const userEmail = user.email ?? null;
          const rawName = user.user_metadata?.full_name?.trim();
          const isAppAdmin = userEmail?.toLowerCase() === adminEmail;

          emailMap[uid] = userEmail;
          nameMap[uid]  = rawName || (isAppAdmin ? "Admin" : userEmail);
        }
      } catch (_) {
        // non-fatal — leave email/name as null
      }
    })
  );

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

  const formatSev = (s) => {
    if (!s) return "Low";
    const str = String(s).toLowerCase();
    if (str === "severe") return "Severe";
    if (str === "high") return "High";
    if (str === "moderate") return "Moderate";
    return "Low";
  };

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

  const locations = data
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => {
      const detMap = {};
      if (r.detections_map && typeof r.detections_map === "object") {
        Object.entries(r.detections_map).forEach(([type, count]) => {
          detMap[type.toLowerCase()] = Number(count || 1);
        });
      } else if (Array.isArray(r.detections)) {
        r.detections.forEach((d) => {
          if (d && d.waste_type) {
            const type = d.waste_type.toLowerCase();
            detMap[type] = (detMap[type] || 0) + Number(d.count || 1);
          }
        });
      }

      const labelParts = (r.location_label || "").split(",");
      const beachName  = labelParts[0]?.trim() || "Coastal Site";
      const cityName   = labelParts[1]?.trim() || "";

      return {
        id:              r.id,
        latitude:        r.latitude,
        longitude:       r.longitude,
        location_label:  r.location_label,
        locationLabel:   r.location_label,
        beach:           beachName,
        city:            cityName,
        country:         "India",
        pollution_score: Number(r.pollution_score || 0),
        pollutionScore:  Number(r.pollution_score || 0),
        severity:        formatSev(r.severity),
        created_at:      r.created_at,
        total_waste:     Number(r.total_waste || 0),
        totalWaste:      Number(r.total_waste || 0),
        image_url:       r.image_url,
        detections:      detMap,
      };
    });

  // Reverse to newest-first for the history table
  const history = data.map(formatAnalysisRow).reverse();

  // Fetch waste types catalog and locations catalog directly from Postgres
  const wasteTypesCatalog = await getWasteTypesCatalog();
  const locationsCatalog  = await getLocationsCatalog();

  // If user has no scan locations yet, populate map locations from locationsCatalog so map and cleanup page render beach hotspots
  const displayLocations = locations.length > 0 ? locations : locationsCatalog.map((loc) => {
    const labelParts = (loc.location_label || "").split(",");
    return {
      id:              loc.id,
      latitude:        loc.latitude,
      longitude:       loc.longitude,
      location_label:  loc.location_label,
      locationLabel:   loc.location_label,
      beach:           labelParts[0]?.trim() || "Coastal Site",
      city:            labelParts[1]?.trim() || "",
      country:         "India",
      pollution_score: 15,
      pollutionScore:  15,
      severity:        "Low",
      created_at:      loc.created_at,
      total_waste:     0,
      totalWaste:      0,
      detections:      {},
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
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "active_ai_model")
      .single();

    if (!error && data?.value) {
      return data.value;
    }
  } catch (_) {}

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

  return null;
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

  const { error: settingsError } = await supabase
    .from("system_settings")
    .upsert({ key: "active_ai_model", value: modelId, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (settingsError) throw settingsError;

  // Sync active status in public.ai_models table
  await supabase.from("ai_models").update({ is_active: false }).neq("id", "");
  await supabase.from("ai_models").update({ is_active: true }).eq("id", modelId);

  return modelId;
}


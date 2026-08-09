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
 * Accepts optional latitude, longitude, locationLabel, and userId fields.
 * Returns the inserted analysis row (with all generated/defaulted columns).
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
}) {
  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .insert({
      image_url:       imageUrl,
      total_waste:     totalWaste,
      pollution_score: pollutionScore,
      severity,
      latitude:        latitude       ?? null,
      longitude:       longitude      ?? null,
      location_label:  locationLabel  ?? null,
      user_id:         userId         ?? null,
    })
    .select()
    .single();

  if (analysisError) throw analysisError;

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

  return analysis;
}

/**
 * Returns past analyses for a specific user (user-scoped gallery).
 * Includes detection sub-rows for each analysis.
 */
export async function listAnalysesByUser(userId, { limit = 100, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      `id, image_url, created_at, total_waste, pollution_score, severity,
       latitude, longitude, location_label, user_id,
       detections ( waste_type, count )`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

/**
 * Returns ALL analyses (all users) for the admin dashboard.
 * Most recent first. Enriches each row with the uploader's email
 * by batch-fetching user records from Supabase Auth admin API.
 */
export async function listAllAnalysesAdmin() {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      `id, image_url, created_at, total_waste, pollution_score, severity,
       latitude, longitude, location_label, user_id,
       detections ( waste_type, count )`
    )
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

  return data.map((row) => ({
    ...row,
    user_email: row.user_id ? (emailMap[row.user_id] ?? null) : null,
    user_name:  row.user_id ? (nameMap[row.user_id] ?? null) : null,
  }));
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
 * Now includes location fields (backward compatible — all nullable).
 */
export async function listAnalyses({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "id, image_url, created_at, total_waste, pollution_score, severity, latitude, longitude, location_label"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

/**
 * Returns aggregated statistics for the dashboard:
 * - totals (analyses count, all-time waste, avg score)
 * - severity distribution
 * - per-waste-type totals across ALL analyses
 * - geolocated entries for the pollution map
 * - full history list for trend charts and the history table
 *
 * Aggregation is done in JS after a single DB query — no extra dependencies needed.
 */
export async function getStats(userId = null) {
  let query = supabase
    .from("analyses")
    .select(
      `id, image_url, created_at, total_waste, pollution_score, severity,
       latitude, longitude, location_label, user_id,
       detections ( waste_type, count )`
    )
    .order("created_at", { ascending: true }); // chronological — reversed below for table

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) throw error;

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
    for (const d of row.detections || []) {
      const type = (d.waste_type || "other").toLowerCase();
      const count = Number(d.count || 1);
      aggregateDetections[type] = (aggregateDetections[type] || 0) + count;
    }
  }

  const locations = data
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => {
      const detMap = {};
      (r.detections || []).forEach((d) => {
        if (d && d.waste_type) {
          const type = d.waste_type.toLowerCase();
          detMap[type] = (detMap[type] || 0) + Number(d.count || 1);
        }
      });

      return {
        id:              r.id,
        latitude:        r.latitude,
        longitude:       r.longitude,
        location_label:  r.location_label,
        pollution_score: r.pollution_score,
        severity:        formatSev(r.severity),
        created_at:      r.created_at,
        total_waste:     r.total_waste,
        image_url:       r.image_url,
        detections:      detMap,
      };
    });

  // Reverse to newest-first for the history table
  const history = [...data].reverse();

  // Fetch waste types catalog directly from Postgres
  const wasteTypesCatalog = await getWasteTypesCatalog();

  return {
    totalAnalyses,
    totalWasteAllTime,
    avgScore,
    severityCounts,
    aggregateDetections,
    locations,
    history,
    wasteTypesCatalog,
  };
}

/**
 * Fetches waste type definitions & recyclability metadata directly from public.waste_types in Postgres.
 */
export async function getWasteTypesCatalog() {
  const { data, error } = await supabase
    .from("waste_types")
    .select("id, name, category, is_recyclable, color_hex")
    .order("category", { ascending: true });

  if (error || !data) return [];
  return data;
}

/**
 * Fetches available AI models from public.ai_models in Postgres.
 */
export async function getAvailableAiModels() {
  const { data, error } = await supabase
    .from("ai_models")
    .select("id, name, tag, architecture, params, description, badge, is_active")
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return AVAILABLE_MODELS;
  }
  return data;
}

export const AVAILABLE_MODELS = [
  {
    id: "yolov8m",
    name: "YOLOv8 Medium",
    tag: "Standard Baseline",
    architecture: "YOLOv8m",
    params: "25.9M",
    description: "Balanced speed & precision for general coastal debris detection.",
    badge: "Default"
  },
  {
    id: "yolov11m",
    name: "YOLOv11 Medium",
    tag: "Enhanced Accuracy",
    architecture: "YOLOv11m",
    params: "20.1M",
    description: "Enhanced feature extraction & attention mechanisms for complex or occluded waste.",
    badge: "High Precision"
  },
  {
    id: "yolov26s",
    name: "YOLOv26 Small",
    tag: "Ultra-Fast Edge",
    architecture: "YOLOv26s",
    params: "9.6M",
    description: "Lightweight, low-latency inference optimized for real-time mobile & drone feeds.",
    badge: "Fastest"
  }
];

let cachedActiveModel = "yolov11m";

/**
 * Returns the currently active AI model ID configured by the Admin from Postgres.
 */
export async function getActiveSystemModel() {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "active_ai_model")
      .single();

    if (!error && data?.value) {
      cachedActiveModel = data.value;
    }
  } catch (_) {
    // Fall back to in-memory model cache
  }
  return cachedActiveModel;
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

  cachedActiveModel = modelId;

  const { error: settingsError } = await supabase
    .from("system_settings")
    .upsert({ key: "active_ai_model", value: modelId, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (settingsError) throw settingsError;

  // Sync active status in public.ai_models table
  await supabase.from("ai_models").update({ is_active: false }).neq("id", "");
  await supabase.from("ai_models").update({ is_active: true }).eq("id", modelId);

  return modelId;
}


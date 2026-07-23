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
 * Accepts optional latitude, longitude, locationLabel fields.
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
export async function getStats() {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      `id, image_url, created_at, total_waste, pollution_score, severity,
       latitude, longitude, location_label,
       detections ( waste_type, count )`
    )
    .order("created_at", { ascending: true }); // chronological — reversed below for table

  if (error) throw error;

  const totalAnalyses = data.length;
  const totalWasteAllTime = data.reduce((s, r) => s + (r.total_waste || 0), 0);
  const avgScore = totalAnalyses
    ? Math.round(
        data.reduce((s, r) => s + (r.pollution_score || 0), 0) / totalAnalyses
      )
    : 0;

  const severityCounts = { Low: 0, Moderate: 0, High: 0, Severe: 0 };
  const aggregateDetections = { bottle: 0, can: 0, bag: 0, wrapper: 0 };

  for (const row of data) {
    if (row.severity && row.severity in severityCounts) {
      severityCounts[row.severity]++;
    }
    for (const d of row.detections || []) {
      if (d.waste_type in aggregateDetections) {
        aggregateDetections[d.waste_type] += d.count;
      }
    }
  }

  const locations = data
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id:              r.id,
      latitude:        r.latitude,
      longitude:       r.longitude,
      location_label:  r.location_label,
      pollution_score: r.pollution_score,
      severity:        r.severity,
      created_at:      r.created_at,
      total_waste:     r.total_waste,
    }));

  // Reverse to newest-first for the history table
  const history = [...data].reverse();

  return {
    totalAnalyses,
    totalWasteAllTime,
    avgScore,
    severityCounts,
    aggregateDetections,
    locations,
    history,
  };
}

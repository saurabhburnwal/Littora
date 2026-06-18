import { createClient } from "@supabase/supabase-js";

// Service-role key — server-side only, never sent to the browser.
// This is the whole point of routing uploads through Node rather than
// having React talk to Supabase directly.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
 * Returns the inserted analysis row (with its generated id).
 */
export async function saveAnalysis({ imageUrl, totalWaste, pollutionScore, severity, detections }) {
  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .insert({
      image_url: imageUrl,
      total_waste: totalWaste,
      pollution_score: pollutionScore,
      severity,
    })
    .select()
    .single();

  if (analysisError) throw analysisError;

  const detectionRows = Object.entries(detections).map(([wasteType, count]) => ({
    analysis_id: analysis.id,
    waste_type: wasteType,
    count,
  }));

  if (detectionRows.length > 0) {
    const { error: detectionsError } = await supabase.from("detections").insert(detectionRows);
    if (detectionsError) throw detectionsError;
  }

  return analysis;
}

/**
 * Returns past analyses, most recent first, for the history view.
 */
export async function listAnalyses({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("analyses")
    .select("id, image_url, created_at, total_waste, pollution_score, severity")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

import "dotenv/config";
import axios from "axios";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function backfillBoundingBoxes() {
  console.log("Fetching analyses from Supabase...");
  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, image_url, severity, total_waste, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching analyses:", error);
    process.exit(1);
  }

  console.log(`Found ${analyses.length} analyses to process.`);

  for (let i = 0; i < analyses.length; i++) {
    const row = analyses[i];
    console.log(`\n[${i + 1}/${analyses.length}] Processing Analysis ID: ${row.id}`);
    console.log(`Image URL: ${row.image_url}`);

    if (!row.image_url) {
      console.log("Skipping row without image_url.");
      continue;
    }

    try {
      // 1. Download image from Supabase Storage
      console.log("Downloading image buffer...");
      const imgRes = await axios.get(row.image_url, { responseType: "arraybuffer", timeout: 30000 });
      const imageBuffer = Buffer.from(imgRes.data);
      console.log(`Downloaded image (${imageBuffer.length} bytes).`);

      // Determine mime type / filename
      const urlParts = row.image_url.split("/");
      const filename = urlParts[urlParts.length - 1] || "image.jpg";
      const mimeType = filename.endsWith(".png") ? "image/png" : filename.endsWith(".webp") ? "image/webp" : "image/jpeg";

      // 2. Send to AI service for inference
      const formData = new FormData();
      formData.append("file", imageBuffer, {
        filename,
        contentType: mimeType,
      });

      console.log("Sending to AI service at:", `${aiServiceUrl}/predict`);
      const aiRes = await axios.post(`${aiServiceUrl}/predict`, formData, {
        headers: formData.getHeaders(),
        timeout: 60000,
      });

      const boxes = aiRes.data.boxes || [];
      console.log(`Inference successful: ${boxes.length} bounding boxes detected.`);

      // 3. Update public.analyses in Supabase
      const { error: updateError } = await supabase
        .from("analyses")
        .update({
          boxes,
        })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Failed to update analysis ${row.id}:`, updateError);
      } else {
        console.log(`Analysis ${row.id} updated successfully with ${boxes.length} boxes.`);
      }
    } catch (err) {
      console.error(`Error processing analysis ${row.id}:`, err.message);
    }
  }

  console.log("\nAll analyses backfill completed successfully!");
}

backfillBoundingBoxes();

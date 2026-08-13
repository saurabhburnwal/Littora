import "dotenv/config";
import { supabase } from "../services/supabaseClient.js";

const TARGET_MAPPINGS = [
  // Marina Beach, Chennai
  { id: "a1b2c3d4-0001-0000-0000-000000000001", beach: "Marina Beach, Chennai", lat: 13.0499, lng: 80.2824 },
  { id: "ad01b9c1-8677-493a-9c4f-97fcec1c033f", beach: "Marina Beach, Chennai", lat: 13.0499, lng: 80.2824 },
  { id: "acfe2563-1c96-483e-85f0-c4e55ddb268f", beach: "Marina Beach, Chennai", lat: 13.0499, lng: 80.2824 },

  // Puri Beach, Odisha
  { id: "a1b2c3d4-0002-0000-0000-000000000002", beach: "Puri Beach, Odisha", lat: 19.7983, lng: 85.8249 },
  { id: "84d4f56d-9116-4052-b811-a568e971d608", beach: "Puri Beach, Odisha", lat: 19.7983, lng: 85.8249 },
  { id: "de9892b3-8d00-42cf-af8a-ec805c45e3d2", beach: "Puri Beach, Odisha", lat: 19.7983, lng: 85.8249 },

  // Malpe Beach, Udupi
  { id: "a1b2c3d4-0003-0000-0000-000000000003", beach: "Malpe Beach, Udupi", lat: 13.3489, lng: 74.7037 },
  { id: "5743a224-26c6-43bd-a2aa-e9c918525d7a", beach: "Malpe Beach, Udupi", lat: 13.3489, lng: 74.7037 },
];

async function run() {
  for (const m of TARGET_MAPPINGS) {
    // 1. Check if location exists
    let { data: locData, error: locErr } = await supabase
      .from("locations")
      .select("id")
      .eq("location_label", m.beach)
      .maybeSingle();

    if (locErr) {
      console.error("Error finding location", m.beach, locErr);
      continue;
    }

    let locationId;
    if (!locData) {
      const { data: newLoc, error: insErr } = await supabase
        .from("locations")
        .insert([{
          location_label: m.beach,
          latitude: m.lat,
          longitude: m.lng
        }])
        .select()
        .single();
      if (insErr) {
         console.error("Error inserting location", m.beach, insErr);
         continue;
      }
      locationId = newLoc.id;
    } else {
      locationId = locData.id;
    }

    // 2. Update analysis
    const { error: updErr } = await supabase
      .from("analyses")
      .update({ location_id: locationId })
      .eq("id", m.id);

    if (updErr) {
      console.error("Error updating analysis", m.id, updErr);
    } else {
      console.log(`Updated analysis ${m.id} to location ${m.beach}`);
    }
  }
  
  // also fix 7040f5e3 to Marina and 72e6ff26 to Malpe (the ones not in mapping but in DB)
  const EXTRA = [
    { id: "7040f5e3-ab64-4d33-8dfb-e54f4e179dbf", beach: "Marina Beach, Chennai" },
    { id: "72e6ff26-5fdd-4d0e-bfa4-0c6806f2ee60", beach: "Malpe Beach, Udupi" }
  ];
  for (const e of EXTRA) {
     let { data: loc } = await supabase.from("locations").select("id").eq("location_label", e.beach).maybeSingle();
     if (loc) {
        await supabase.from("analyses").update({ location_id: loc.id }).eq("id", e.id);
        console.log(`Updated extra analysis ${e.id} to location ${e.beach}`);
     }
  }
  
  console.log("Done.");
}
run();

/**
 * One-time backfill: reassign analyses from admin/anon → real user accounts.
 *
 * Admin analyses (5)     → Krypton  (kryptonraiderx@gmail.com)
 * Anonymous analyses (2) → Saurabh  (saurabhburnwal00@gmail.com)
 *
 * Run from backend/:
 *   node scripts/reassign_analyses.mjs
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY  // service key — bypasses RLS (admin only)
);

const KRYPTON_ID = "5949bce1-43d3-4461-ad52-7e6aced41c76"; // kryptonraiderx@gmail.com
const SAURABH_ID = "3d701564-5bd0-4bf9-aa16-1745ef69c68a"; // saurabhburnwal00@gmail.com
const ADMIN_ID   = "6b91fc21-ac64-4fa2-be92-e1a21669ef6e"; // admin@littora.app

async function run() {
  console.log("=== Littora Analyses Backfill ===\n");

  // ── 1. Reassign admin-owned analyses → Krypton ──────────────────────────
  const { data: adminRows, error: adminErr } = await sb
    .from("analyses")
    .update({ user_id: KRYPTON_ID })
    .eq("user_id", ADMIN_ID)
    .select("id, created_at");

  if (adminErr) {
    console.error("ERROR reassigning admin analyses:", adminErr.message);
    process.exit(1);
  }
  console.log(`✓ Admin → Krypton: ${adminRows.length} analyses reassigned`);
  adminRows.forEach((r) => console.log(`  • ${r.id}  (${r.created_at})`));

  // ── 2. Reassign anonymous analyses → Saurabh ────────────────────────────
  const { data: anonRows, error: anonErr } = await sb
    .from("analyses")
    .update({ user_id: SAURABH_ID })
    .is("user_id", null)
    .select("id, created_at");

  if (anonErr) {
    console.error("ERROR reassigning anon analyses:", anonErr.message);
    process.exit(1);
  }
  console.log(`\n✓ Anonymous → Saurabh: ${anonRows.length} analyses reassigned`);
  anonRows.forEach((r) => console.log(`  • ${r.id}  (${r.created_at})`));

  // ── 3. Verification — confirm no admin or anon analyses remain ───────────
  const { data: remaining, error: verifyErr } = await sb
    .from("analyses")
    .select("user_id, id")
    .or(`user_id.eq.${ADMIN_ID},user_id.is.null`);

  if (verifyErr) {
    console.warn("\n⚠ Verification query failed:", verifyErr.message);
  } else if (!remaining || remaining.length === 0) {
    console.log("\n✓ Verification passed — no admin or anon analyses remain.");
  } else {
    console.warn("\n⚠ Verification FAILED — some analyses were not reassigned:");
    remaining.forEach((r) => console.warn(`  • ${r.id}  user_id=${r.user_id}`));
  }

  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
    console.warn(
      "[Littora] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. " +
      "Auth will not work until you add them to frontend/.env"
    );
  }
}

// Anon key only — safe to expose in the browser.
// This client is used exclusively for authentication session management.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

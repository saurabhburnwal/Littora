import { supabase } from "../services/supabaseClient.js";

/**
 * Middleware: verifies a Bearer JWT token from the Authorization header.
 * Attaches the decoded user object to req.user on success.
 * Returns 401 if the token is missing, invalid, or expired.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const token = header.slice(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user; // { id, email, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication service unavailable" });
  }
}

/**
 * Middleware: allows only the designated admin email (ADMIN_EMAIL env var).
 * Must be used AFTER requireAuth.
 * Returns 403 for non-admin users.
 */
export function requireAdmin(req, res, next) {
  const adminEmail = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@littora.app").toLowerCase();
  if (!req.user?.email || req.user.email.toLowerCase() !== adminEmail) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

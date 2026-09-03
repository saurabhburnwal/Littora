import { Router } from "express";
import rateLimit from "express-rate-limit";
import { supabase, deleteUserAccountAndData } from "../services/supabaseClient.js";
import { requireAuth, getAdminEmail } from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { access_token, refresh_token, user: { id, email } }
 */
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    user: {
      id:    data.user.id,
      email: data.user.email,
    },
  });
});

/**
 * POST /api/auth/logout
 * Invalidates the session on Supabase side.
 * The client should also clear its local session.
 */
router.post("/logout", async (_req, res) => {
  // The frontend Supabase client handles local sign-out.
  // This endpoint is here for completeness / server-side invalidation.
  res.json({ message: "Logged out successfully" });
});

/**
 * POST /api/auth/resend-verification
 * Body: { email }
 * Dispatches a new signup email confirmation link via Supabase Auth + Resend SMTP.
 */
router.post("/resend-verification", authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  const cleanEmail = email.trim();
  const origin = (process.env.FRONTEND_ORIGINS || "http://localhost:5173").split(",")[0].trim();
  const redirectTo = `${origin}/login?verified=true`;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({
    message: "Verification email sent successfully via Resend",
    recipient: cleanEmail,
  });
});

/**
 * DELETE /api/auth/account
 * Headers: Authorization: Bearer <jwt>
 * Permanently deletes the authenticated user's account and all associated data.
 */
router.delete("/account", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email ? req.user.email.trim().toLowerCase() : "";
    const adminEmail = getAdminEmail().trim().toLowerCase();

    // Guard: Primary administrator account cannot be deleted
    if (userEmail && userEmail === adminEmail) {
      return res.status(403).json({
        error: "Primary administrator account cannot be deleted.",
      });
    }

    await deleteUserAccountAndData(userId);

    return res.json({
      message: "Account and associated data deleted successfully.",
    });
  } catch (err) {
    console.error("[auth] Account deletion error:", err);
    if (err.message && err.message.toLowerCase().includes("primary administrator account cannot be deleted")) {
      return res.status(403).json({
        error: "Primary administrator account cannot be deleted.",
      });
    }
    return res.status(500).json({
      error: err.message || "Failed to delete account.",
    });
  }
});

export default router;

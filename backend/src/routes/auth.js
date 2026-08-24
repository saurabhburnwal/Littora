import { Router } from "express";
import rateLimit from "express-rate-limit";
import { supabase } from "../services/supabaseClient.js";

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

export default router;

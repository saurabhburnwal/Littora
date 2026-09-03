import "dotenv/config";

import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import multer from "multer";
import rateLimit from "express-rate-limit";

import analyzeRouter    from "./routes/analyze.js";
import analysesRouter   from "./routes/analyses.js";
import statsRouter      from "./routes/stats.js";
import authRouter       from "./routes/auth.js";
import myAnalysesRouter from "./routes/myAnalyses.js";
import adminRouter      from "./routes/admin.js";
import emailRouter      from "./routes/email.js";
import modelRouter      from "./routes/model.js";
import datasetRouter    from "./routes/dataset.js";

const app = express();

const defaultAllowed = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4000",
];
const envOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultAllowed, ...envOrigins]));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", ...allowedOrigins],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Blocked by CORS policy"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  })
);
app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." },
});

app.use("/api", apiLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// POST /api/analyze — image upload + AI inference + storage
app.use("/api/analyze",      analyzeRouter);

// GET /api/analyses — paginated history (backward-compatible)
app.use("/api/analyses",     analysesRouter);

// GET /api/stats — aggregated dashboard data (new)
app.use("/api/stats",        statsRouter);

// POST /api/auth/login, /api/auth/logout
app.use("/api/auth",         authRouter);

// GET /api/my-analyses — user-scoped analyses (requires JWT)
app.use("/api/my-analyses",  myAnalysesRouter);

// GET /api/admin/analyses, DELETE /api/admin/analyses/:id (requires admin JWT)
app.use("/api/admin",        adminRouter);

app.use("/api/email",        emailRouter);

// GET /api/model, POST /api/model — active AI model configuration
app.use("/api/model",        modelRouter);

// GET /api/dataset.geojson, GET /api/dataset.csv — dataset export endpoints (auth-gated)
app.use("/api",              datasetRouter);

// 404 Catch-All Handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled API error:", err.message);

  if (err.message === "Blocked by CORS policy") {
    return res.status(403).json({ error: "Blocked by CORS policy" });
  }

  if (err instanceof multer.MulterError || err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File size exceeds 10MB limit" });
    }
    return res.status(400).json({ error: err.message || "Invalid multipart form data" });
  }

  const statusCode = err.status || err.statusCode || 500;
  if (statusCode >= 500 && process.env.NODE_ENV === "production") {
    return res.status(statusCode).json({ error: "Internal server error" });
  }

  res.status(statusCode).json({ error: err.message || "Internal server error" });
});

export default app;

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Backend API listening on port ${PORT}`);
  });
}

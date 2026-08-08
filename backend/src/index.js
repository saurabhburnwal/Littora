import "dotenv/config";

import express from "express";
import cors from "cors";
import compression from "compression";

import analyzeRouter    from "./routes/analyze.js";
import analysesRouter   from "./routes/analyses.js";
import statsRouter      from "./routes/stats.js";
import authRouter       from "./routes/auth.js";
import myAnalysesRouter from "./routes/myAnalyses.js";
import adminRouter      from "./routes/admin.js";
import emailRouter      from "./routes/email.js";
import modelRouter      from "./routes/model.js";

const app = express();
app.use(compression());
app.use(cors({ maxAge: 86400 }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

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

export default app;

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Backend API listening on port ${PORT}`);
  });
}

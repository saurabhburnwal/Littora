import "dotenv/config";

import express from "express";
import cors from "cors";

import analyzeRouter  from "./routes/analyze.js";
import analysesRouter from "./routes/analyses.js";
import statsRouter    from "./routes/stats.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// POST /api/analyze — image upload + AI inference + storage
app.use("/api/analyze",  analyzeRouter);

// GET /api/analyses — paginated history (backward-compatible)
app.use("/api/analyses", analysesRouter);

// GET /api/stats — aggregated dashboard data (new)
app.use("/api/stats",    statsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
});

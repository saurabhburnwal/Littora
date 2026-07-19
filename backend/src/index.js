import "dotenv/config";

import express from "express";
import cors from "cors";

import analyzeRouter from "./routes/analyze.js";
import analysesRouter from "./routes/analyses.js";


const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Owns: image upload to Supabase Storage, calling the AI service,
// persisting results, shaping the response React reads.
app.use("/api/analyze", analyzeRouter);

// Powers the history/analytics view (Week 7).
app.use("/api/analyses", analysesRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
});

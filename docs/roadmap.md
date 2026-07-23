# Beach Waste Detection & Pollution Monitoring Platform — Updated Roadmap

## 1. Final Architecture

```
React Frontend
      │  (upload image, view dashboard)
      ▼
Node.js / Express API
      │  • handles auth (optional)
      │  • uploads image to Supabase Storage
      │  • forwards image to AI service for inference
      │  • persists analysis + detections to Postgres
      │  • shapes/returns combined response to React
      ▼
Python AI Service (FastAPI + YOLOv8m)
      │  • runs detection
      │  • computes total_waste, pollution_score, severity
      │  • returns structured JSON only — no DB or storage access
      ▼
Supabase (PostgreSQL + Storage)
      ▼
Dashboard & Analytics (Recharts)
```

**Why Node sits in the middle now has a concrete answer**: it isn't just a pass-through. It owns image persistence, database writes, and response shaping, so it's not redundant with the AI service.

## 2. Dataset Strategy

The project targets **beach/coastal litter** specifically, not generic curbside trash, so the source images need to reflect that setting.

| Source | Role | Notes |
|---|---|---|
| **TACO** (Trash Annotations in Context) | Base dataset | Most widely cited litter-detection dataset; many images shot in outdoor/coastal scenes; existing YOLOv8-ready conversions available, so no need to redo annotation work from scratch |
| **Roboflow "beach" aggregation** (`new-workspace-iyutw/beach-dpf2n`) | Supplementary | Pre-combines TACO with separate Trash Detection and Plastic Waste Detection sets — saves manual merging |
| **Lebanese University "test beach" set** | Supplementary, real coastal imagery | Small (89 images) but directly beach-context, with classes overlapping bottle/can/bag/wrapper |

**Workflow**: pull all three into one Roboflow Universe project → use Roboflow's class-remap tool to collapse the many fine-grained labels (e.g. "Clear plastic bottle," "Drink can," "Garbage bag," "Crisp packet") down into the four target classes (**bottle, can, bag, wrapper**) → check class balance and backfill underrepresented classes if needed → export as a single dataset in YOLOv8 format (train/val/test split handled by Roboflow).

Two beach-specific academic datasets exist (BePLi Dataset v1 — 3,709 Japan coastal images, COCO segmentation format; Beach-Litter-UAV — drone imagery for tiny objects) but both need format conversion or don't match a handheld-camera use case, so they're optional citations for the literature review rather than core training data.

## 3. Decisions Incorporated

- **Node's responsibilities are explicit**: Supabase Storage upload, Supabase Postgres writes, response assembly, and (optionally) auth/session handling. The AI service stays stateless — it only does inference and returns JSON.
- **Model choice**: use `yolov8m.pt` (medium) for higher accuracy and recall. The medium variant provides a strong balance between detection performance and inference speed, and is better at detecting small or partially occluded beach waste items compared to the nano variant.
- **Severity/score logic lives in one place**: FastAPI computes `total_waste`, `pollution_score`, and `severity` alongside the raw detection counts, so Node never duplicates that math — it just stores and forwards what FastAPI returns.
- **Upload path**: the browser uploads to Node (not directly to Supabase). Node forwards the image buffer to FastAPI for inference, then uploads the same image to Supabase Storage and writes the analysis row. This keeps Supabase credentials server-side only and avoids CORS/signed-URL complexity on the client.

## 4. API Contracts

**`POST /api/analyze`** (Node, multipart/form-data — what React calls)
1. Receives image from React
2. Forwards image to FastAPI `POST /detect`
3. Uploads image to Supabase Storage → gets `image_url`
4. Inserts a row into `analyses`, and one row per waste type into `detections`
5. Returns to React:
```json
{
  "id": "uuid",
  "image_url": "https://.../bottle1.jpg",
  "created_at": "2026-06-18T10:00:00Z",
  "detections": { "bottle": 4, "can": 2, "bag": 1 },
  "total_waste": 7,
  "pollution_score": 42,
  "severity": "Moderate"
}
```

**`POST /detect`** (FastAPI, internal — only Node calls this, never the browser directly)
- Input: raw image
- Output:
```json
{
  "detections": { "bottle": 4, "can": 2, "bag": 1 },
  "total_waste": 7,
  "pollution_score": 42,
  "severity": "Moderate"
}
```

**`GET /api/analyses`** (Node — powers the Week 7 history view)
- Returns paginated list of past analyses: `id, image_url, created_at, total_waste, pollution_score, severity`

## 5. Team Roles & Tech

| Member | Responsibilities | Tech |
|---|---|---|
| **1 — Data & Research Lead** | Literature review, sourcing & merging TACO + Roboflow beach aggregation + Lebanese University set, class remapping (bottle/can/bag/wrapper), annotation cleanup, documentation, test datasets | Roboflow, OpenCV, LabelImg, TACO, research papers |
| **2 — AI/ML Engineer** | Train `yolov8m`, optimize for inference, build `/detect` endpoint, compute severity/score logic, evaluation | Python, PyTorch, YOLOv8 (medium), FastAPI |
| **3 — Full Stack Engineer** | React frontend, Node/Express API (storage upload, persistence, auth), Supabase integration, deployment | React, Node.js, Express, Supabase, Recharts |

## 6. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend (orchestration, storage, persistence) | Node.js + Express |
| AI Service (stateless inference only) | Python + FastAPI |
| Detection Model | YOLOv8m |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Visualization | Recharts |
| Version Control | GitHub |

## 7. Database Schema

**analyses**
`id, image_url, created_at, total_waste, pollution_score, severity`

**detections**
`id, analysis_id (FK), waste_type, count`

**users** *(optional)*
`id, name, email`

## 8. Week-by-Week Roadmap

| Week | Deliverable |
|---|---|
| 1–2 | Literature review; source & merge TACO + Roboflow beach aggregation + Lebanese University set; class-remap to bottle/can/bag/wrapper; export YOLOv8-format dataset; repo scaffolding for all three services; Supabase project + schema created |
| 3 | Dataset balance check & backfill if needed; `yolov8n` training pipeline running; Node/Express skeleton with `/api/analyze` stub; FastAPI skeleton with `/detect` stub |
| 4 | **End-to-end flow working**: React upload → Node → FastAPI inference → detection JSON shown in React (no persistence yet) |
| 5 | Add Supabase Storage upload + Postgres persistence in Node; severity/score logic finalized in FastAPI; error handling (bad image, no detections, timeouts) |
| 6 | Dashboard: per-image results (Bottle × 5, Can × 3, Bag × 7) with pie chart (recyclable vs non-recyclable) and bar chart (by waste type) |
| 7 | Pollution analytics: `GET /api/analyses` history view, score-over-time line/table (e.g. 01 Aug → 12, 05 Aug → 18, 10 Aug → 29) |
| 8 | Deployment, end-to-end testing across devices/images, documentation, demo prep |

## 9. Deployment Plan

| Component | Platform |
|---|---|
| Frontend (React) | Vercel |
| Backend (Node.js) | Render |
| AI Service (FastAPI + YOLOv8n) | Railway (or Render if model size permits) |
| Database & Storage | Supabase |

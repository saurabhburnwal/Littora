# Beach Waste Detection & Pollution Monitoring Platform

Detects waste items (bottle, can, bag, wrapper) in beach/coastal images using YOLOv8, scores pollution severity, and tracks results over time on a dashboard.

## Architecture

```
React Frontend
      │  (upload image, view dashboard)
      ▼
Node.js / Express API
      │  • uploads image to Supabase Storage
      │  • forwards image to AI service for inference
      │  • persists analysis + detections to Postgres
      │  • shapes/returns combined response to React
      ▼
Python AI Service (FastAPI + YOLOv8n)
      │  • runs detection
      │  • computes total_waste, pollution_score, severity
      │  • returns structured JSON only — no DB or storage access
      ▼
Supabase (PostgreSQL + Storage)
      ▼
Dashboard & Analytics (Recharts)
```

## Repo Layout

```
/frontend       → React app (Member 3)
/backend        → Node/Express API (Member 3)
/ai-service     → FastAPI + YOLOv8n (Member 2)
/dataset        → dataset sourcing/merge notes (Member 1)
/docs           → roadmap & architecture reference
```

## Team Roles

| Member | Responsibilities | Tech |
|---|---|---|
| 1 — Data & Research Lead | Literature review, sourcing & merging TACO + Roboflow beach aggregation + Lebanese University set, class remapping, annotation cleanup | Roboflow, OpenCV, LabelImg, TACO |
| 2 — AI/ML Engineer | Train `yolov8n`, optimize for CPU inference, build `/detect` endpoint, severity/score logic, evaluation | Python, PyTorch, YOLOv8, FastAPI |
| 3 — Full Stack Engineer | React frontend, Node/Express API, Supabase integration, deployment | React, Node.js, Express, Supabase, Recharts |

## API Contracts

**`POST /api/analyze`** (Node, multipart/form-data — called by React)
1. Receives image from React
2. Forwards image to FastAPI `POST /detect`
3. Uploads image to Supabase Storage → gets `image_url`
4. Inserts a row into `analyses`, and one row per waste type into `detections`
5. Returns:
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

**`POST /detect`** (FastAPI, internal — only Node calls this)
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

**`GET /api/analyses`** (Node — powers the history view)
- Returns paginated list: `id, image_url, created_at, total_waste, pollution_score, severity`

## Database Schema

**analyses**: `id, image_url, created_at, total_waste, pollution_score, severity`
**detections**: `id, analysis_id (FK), waste_type, count`
**users** *(optional)*: `id, name, email`

## Getting Started

### AI Service (Python + FastAPI)
```bash
cd ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Backend (Node + Express)
```bash
cd backend
npm install
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SECRET_KEY), AI_SERVICE_URL
npm run dev
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

## Local MCP Servers (Workspace)

This repo now includes workspace MCP configuration at:

```text
.vscode/mcp.json
```

Configured servers:

- `github` → `https://api.githubcopilot.com/mcp/`
- `supabase` → `https://mcp.supabase.com/mcp`

Notes:

- GitHub MCP was checked before adding workspace config; repository-level MCP config was not present, so workspace MCP entries were added.
- If your editor already has global MCP server entries, keep one source of truth (global or workspace) to avoid duplicates.

## Deployment

| Component | Platform |
|---|---|
| Frontend (React) | Vercel |
| Backend (Node.js) | Render |
| AI Service (FastAPI + YOLOv8n) | Railway (or Render if model size permits) |
| Database & Storage | Supabase |

Full roadmap with week-by-week plan: see `/docs/roadmap.md`.

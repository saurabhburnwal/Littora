# Copilot Instructions for Littora

## Build, test, and lint commands

Run commands from each service directory, not repo root.

| Service | Install | Dev | Build | Test (full / single) | Lint |
|---|---|---|---|---|---|
| `frontend` | `npm install` | `npm run dev` | `npm run build` | Not configured | Not configured |
| `backend` | `npm install` | `npm run dev` | Not configured (`npm run start` runs prod server) | Not configured | Not configured |
| `ai-service` | `pip install -r requirements.txt` | `uvicorn main:app --reload --port 8000` | Not configured | Not configured | Not configured |

## High-level architecture

This repo is a 3-service flow:

1. React frontend uploads an image and reads history.
2. Node/Express backend orchestrates everything: accepts upload, calls AI service, uploads image to Supabase Storage, writes DB rows to Supabase Postgres, then returns a combined response.
3. FastAPI AI service runs YOLO inference and computes `total_waste`, `pollution_score`, and `severity`. It is intentionally stateless and should not talk to Supabase directly.

Core request path:

- `frontend/src/App.jsx` posts `multipart/form-data` to `POST /api/analyze`.
- `backend/src/routes/analyze.js` handles field name `image`, calls `runDetection`, then `uploadImage` and `saveAnalysis`.
- `backend/src/services/aiService.js` forwards file to FastAPI `POST /detect`.
- `ai-service/main.py` returns structured JSON only (detections + computed metrics).
- `backend/src/routes/analyses.js` + `listAnalyses()` power history (`GET /api/analyses`).

## Key repository-specific conventions

- **Backend is the orchestration boundary**: keep browser clients and AI service away from Supabase credentials/storage logic. Supabase access stays in `backend/src/services/supabaseClient.js`.
- **Scoring logic has a single owner**: pollution score/severity math lives in `ai-service/severity.py`; backend stores/forwards AI output without recomputing.
- **API response shape is snake_case**: frontend expects fields like `total_waste`, `pollution_score`, `created_at`, and uses `severity.toLowerCase()` for CSS class names.
- **Detection classes are normalized to four targets** (`bottle`, `can`, `bag`, `wrapper`) in AI service (`CLASS_NORMALIZATION` + `WEIGHTS`), and dashboard assumptions follow these classes.
- **Upload field names differ by boundary**: frontend → backend uses form field `image`; backend → AI uses form field `file`.
- **Persistence model is split tables**: one row in `analyses`, then one row per waste type in `detections` (linked by `analysis_id`).

## Existing docs to preserve alignment with

- `README.md` for architecture, API contracts, setup, and deployment targets.
- `docs/roadmap.md` for system responsibilities and data flow decisions.
- `dataset/README.md` for class taxonomy and dataset remapping constraints.

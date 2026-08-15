# Littora System Documentation

This directory contains technical specifications, architecture blueprints, database schemas, and implementation roadmaps for the **Littora Beach Waste Detection & Monitoring Platform**.

---

## Documentation Files

- **[`roadmap.md`](file:///home/krypton/MCA/TRIMESTER%20IV/SPD/Littora/docs/roadmap.md)**: End-to-end development roadmap, multi-phase timeline, architecture breakdown, and database schemas.

---

## Core Architecture Overview

```text
Browser (React 18 SPA)
       │
       ▼ (HTTP / JSON / Bearer JWT)
Node.js / Express API Server (Port 4000)
       ├──▶ Python FastAPI + YOLOv8 (Port 8000) [Inference]
       └──▶ Supabase PostgreSQL & Storage [Persistence & Auth]
```

### Database Schema (Supabase Postgres — 5NF Normalized)
- `analyses`: Stores analysis events (`id`, `user_id`, `image_url`, `pollution_score`, `severity`, `total_waste`, `model_used`, `location_id`, `created_at`).
- `detections`: Stores individual waste detections (`id`, `analysis_id`, `waste_type`, `count`).
- `locations`: Stores coastal locations & coordinates (`id`, `location_label`, `latitude`, `longitude`, `created_at`).
- `waste_types`: Stores standard waste categories & recyclability metadata (`id`, `name`, `category`, `is_recyclable`, `color_hex`).
- `ai_models`: Stores supported YOLO architectures & status (`id`, `name`, `architecture`, `params`, `is_active`).
- `system_settings`: Key-value configuration for global active model (`key`, `value`, `updated_at`).
- **Consolidated View**: `public.vw_analysis_details` — pre-joins analyses with locations and AI models, and aggregates child detections as a pre-computed JSONB map for accelerated query performance.

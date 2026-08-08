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

### Database Tables (Supabase Postgres)
- `analyses`: Stores overall upload metadata (`id`, `user_id`, `image_url`, `pollution_score`, `severity`, `total_waste`, `created_at`).
- `detections`: Stores individual bounding boxes and waste classifications (`id`, `analysis_id`, `waste_type`, `confidence`, `bbox`).

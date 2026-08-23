# Agent Instructions & Guidelines

## 1. Mandatory Proactive Web Search
- **Always Search the Web**: Whenever the user asks for anything, inquires about technical topics, requests documentation, searches for solutions, or asks coding questions, ALWAYS proactively use the `search_web` tool to gather the latest, authoritative, and fact-checked information.
- **Verification First**: Never guess APIs, syntax, version compatibility, or technical facts. Cross-check official documentation and web resources prior to formulating responses or making code modifications.
- **Cite Sources**: Provide concrete references and citations when presenting information retrieved from web searches.

## 2. Supabase Database Schema Migrations (GitHub Integration)
- **All Schema Changes via Migrations**: Never execute raw ad-hoc DDL in production. Always create incremental SQL migration files in `supabase/migrations/<timestamp>_<name>.sql`.
- **Automated Deployment**: Pushing migration files to GitHub automatically triggers Supabase's GitHub Integration to execute and apply schema changes.
- **Views & RLS**: Ensure views (`vw_analysis_details`) use `WITH (security_invoker = true)`.

## 3. Supabase Data Operations (DML & Batch Backfills)
- Execute data backfills and updates via Node.js scripts using `@supabase/supabase-js` (`dotenv/config`) with the service key.

## 4. AI Service Testing Standards (FastAPI + PyTorch)
- Use `pytest` and `pytest-asyncio` with `httpx` in-memory `ASGITransport` fixtures in `conftest.py` and `@pytest.mark.parametrize`.

## 5. UI & Lightbox Invariants
- Photo inspection modals must never crop images (`object-fit: contain`).
- Render normalized YOLO bounding boxes with category badges via `BoundingBoxImage.jsx`.

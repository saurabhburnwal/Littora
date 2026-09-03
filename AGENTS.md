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
- **Map Pin Multi-Scan Inspection Invariant**: When geographic maps group multiple analyses under a single location coordinate/label, the pin marker colour reflects peak/worst severity, but the popup must render all individual analyses with per-scan thumbnails, severity badges, scores, timestamps, and inspection buttons. Never hide non-peak scans.

## 6. Role-Based Data Scoping & Authentic Data
- **Telemetry Scoping**: In `/api/stats`, regular users must receive personal stats and only their own scan locations (`userStats.locations`). Never override a user's location list with `globalStats.locations`.
- **Admin vs User Context**: Admins view global platform data. Header titles/subtitles must dynamically adapt to the user's active role.
- **Zero Synthetic Placeholders**: Never fabricate phantom markers or placeholder analyses with hardcoded scores or severities. If no GPS-tagged records exist, render authentic empty states.

## 7. Git Workflow, Documentation & Commit Standards
- **Explicit Approval Only**: Never commit or push to git without explicit user permission. Do not make intermediate commits autonomously.
- **Synchronize Documentation First**: Always update all relevant documentation files (`README.md`, `backend/README.md`, `frontend/README.md`, `ai-service/README.md`) with new capabilities, directory structures, and verified test counts *before* committing.
- **Human-Style Commit Messages**: Never prefix commit messages with conventional tags like `feat:`, `fix:`, or `chore:`. Write clear, narrative titles in human style, followed by structured bullet points explaining what changed.

## 8. Multi-Agent Swarm Parallelism
- **Maximize Parallelism**: In multi-agent tasks, scale subagent parallelism concurrently across distinct functional domains (frontend, backend, AI microservice, database, test verification) rather than running serial workflows or using undersized teams.

## 9. Test Suite Veracity & Anti-Tautology Standards
- **Zero Tautologies**: Eradicate identity mocks and tautological assertions (e.g., asserting mocks against themselves).
- **Negative & Boundary Testing**: Assert real HTTP status codes, error boundaries, rejected polyglots, and unauthorized attempts.
- **Mutation Resilience**: Ensure tests genuinely verify application logic so that any intentional regression or removed security guard immediately fails the test suite.

